import {POOL_KEYS, type PoolKey} from "../../rules/core/core-types";
import type {
  CharacterPackageItemLike,
  CharacterTypeSystemData,
  DescriptorGrant,
  DescriptorSystemData,
  PackageRole,
  PoolBonusChoiceGroup,
  SpeciesSystemData
} from "../../packages/package-types";
import type {
  PackageCharacterLike,
  PackageSourceLike,
  RemoveGrantedItemsMode
} from "../../services/character-package-service";
import {GrantConflictCancelledError} from "../../packages/grant-conflicts";
import {resolveGrantConflictWithDialog} from "./grant-conflict-dialog";
import {resolveLegacyGenreSuggestion} from "../../genre/genre-suggestion";
import type {GenreDocumentLike} from "../../genre/genre-types";
import type {GenreCharacterLike} from "../../services/genre-service";
import {promptAttachGenre} from "./genre-dialogs";
import {promptPackageChoice, type PackageChoiceOption} from "./package-choice-dialog";
import {prepareDescriptorChoiceGroups} from "../../packages/package-choice-catalog";

type DialogData = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

function embeddedPackages(actor: PackageCharacterLike): CharacterPackageItemLike[] {
  return [...actor.items].filter((item) => (
    item.type === "characterType" || item.type === "descriptor" || item.type === "species"
  )) as unknown as CharacterPackageItemLike[];
}

async function selectWorldPackage(type: "characterType" | "descriptor" | "species"): Promise<PackageSourceLike | null> {
  const items = [...game.items].filter((item) => item.type === type).sort((a, b) => a.name.localeCompare(b.name));
  if (!items.length) {
    ui.notifications.warn(game.i18n.localize(`CYPHERV2.Packages.NoWorld${type === "characterType" ? "Types" : type === "descriptor" ? "Descriptors" : "Species"}`));
    return null;
  }
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize(type === "characterType" ? "CYPHERV2.Packages.AddType" : type === "descriptor" ? "CYPHERV2.Packages.AddDescriptor" : "CYPHERV2.Packages.AddSpecies")},
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}
      <select name="uuid">${items.map((item) => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("")}</select>
    </label></div>`,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Add")}
  }) as DialogData | null;
  return data ? await fromUuid(String(data.uuid ?? "")) as PackageSourceLike | null : null;
}

async function removalMode(name: string): Promise<RemoveGrantedItemsMode | null> {
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Packages.Remove")},
    content: `<div class="cypherv2-dialog-fields"><p>${game.i18n.format("CYPHERV2.Packages.RemoveConfirm", {name: escapeHtml(name)})}</p>
      <label>${game.i18n.localize("CYPHERV2.Packages.GrantedItems")}
        <select name="mode"><option value="delete">${game.i18n.localize("CYPHERV2.Packages.RemoveWithGrants")}</option><option value="keep">${game.i18n.localize("CYPHERV2.Packages.KeepGrants")}</option></select>
      </label></div>`,
    ok: {label: game.i18n.localize("CYPHERV2.Packages.Remove")}
  }) as DialogData | null;
  return data && (data.mode === "delete" || data.mode === "keep") ? data.mode : null;
}

function notify(error: unknown): void {
  console.error(error);
  ui.notifications.error(error instanceof Error ? error.message : String(error));
}

function poolChoiceOptions(pools: readonly PoolKey[]): PackageChoiceOption[] {
  return pools.map((pool) => ({
    id: pool,
    label: game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`)
  }));
}

async function promptEdgePool(title: string): Promise<PoolKey | null> {
  const result = await promptPackageChoice({
    title,
    prompt: game.i18n.format("CYPHERV2.Packages.ChooseOne", {
      label: game.i18n.localize("CYPHERV2.Packages.EdgeChoice")
    }),
    ariaLabel: game.i18n.localize("CYPHERV2.Packages.EdgeChoice"),
    choose: 1,
    options: poolChoiceOptions(POOL_KEYS)
  });
  const pool = result?.[0];
  return POOL_KEYS.includes(pool as PoolKey) ? pool as PoolKey : null;
}

async function promptSuperheroicsPool(title: string): Promise<PoolKey | null> {
  const result = await promptPackageChoice({
    title,
    prompt: game.i18n.localize("CYPHERV2.Packages.SuperheroicsPoolPrompt"),
    ariaLabel: game.i18n.localize("CYPHERV2.Packages.SuperheroicsPool"),
    choose: 1,
    options: poolChoiceOptions(POOL_KEYS)
  });
  const pool = result?.[0];
  return POOL_KEYS.includes(pool as PoolKey) ? pool as PoolKey : null;
}

export async function promptAttachType(actor: PackageCharacterLike, dropped?: PackageSourceLike): Promise<void> {
  const source = dropped ?? await selectWorldPackage("characterType");
  if (!source) return;
  const existing = embeddedPackages(actor).find((item) => item.type === "characterType");
  let replaceItemId: string | undefined;
  let replaceGrantedItemsMode: RemoveGrantedItemsMode | undefined;
  if (existing) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Packages.ReplaceType")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Packages.ReplaceTypeConfirm", {name: escapeHtml(existing.name)})}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Packages.Replace")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!confirmed) return;
    replaceItemId = existing.id;
    replaceGrantedItemsMode = await removalMode(existing.name) ?? undefined;
    if (!replaceGrantedItemsMode) return;
  }
  const system = source.system as unknown as CharacterTypeSystemData;
  let edgePool: PoolKey | undefined;
  if (system.edgeGrant.mode === "choice") {
    edgePool = await promptEdgePool(source.name) ?? undefined;
    if (!edgePool) return;
  }
  let superheroicsPool: PoolKey | undefined;
  if (system.genre === "superhero" && system.superhero?.superheroics?.enabled) {
    superheroicsPool = await promptSuperheroicsPool(source.name) ?? undefined;
    if (!superheroicsPool) return;
  }
  const skillChoices = await promptGroupChoices(source.name, system.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (skillChoices === null) return;
  const abilityChoices = await promptGroupChoices(source.name, system.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (abilityChoices === null) return;
  try {
    await game.cypherv2.services.characterPackages.attachType(actor, source, {
      conflictResolver: resolveGrantConflictWithDialog,
      skillChoices,
      abilityChoices,
      ...(edgePool ? {edgePool} : {}),
      ...(superheroicsPool ? {superheroicsPool} : {}),
      ...(replaceItemId ? {replaceItemId} : {}),
      ...(replaceGrantedItemsMode ? {replaceGrantedItemsMode} : {})
    });
    ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.TypeAttached"));
    const genreActor = actor as unknown as GenreCharacterLike;
    if (!genreActor.system.genre.sourceUuid) {
      const genres = [...game.items].filter((item) => item.type === "genre") as unknown as GenreDocumentLike[];
      const suggestion = await resolveLegacyGenreSuggestion(
        system,
        genres,
        async (uuid) => await fromUuid(uuid) as GenreDocumentLike | null
      );
      if (suggestion) {
        const useSuggestion = await foundry.applications.api.DialogV2.confirm({
          window: {title: game.i18n.localize("CYPHERV2.Genre.TypeSuggestion")},
          content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.TypeSuggestionPrompt", {genre: escapeHtml(suggestion.name)})}</p></div>`,
          yes: {label: game.i18n.localize("CYPHERV2.Genre.AttachSuggestion")},
          no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
        });
        if (useSuggestion) await promptAttachGenre(genreActor, suggestion, "typeSuggestion");
      }
    }
  } catch (error) { if (!(error instanceof GrantConflictCancelledError)) notify(error); }
}

export async function promptAttachDescriptor(actor: PackageCharacterLike, dropped?: PackageSourceLike): Promise<void> {
  const source = dropped ?? await selectWorldPackage("descriptor");
  if (!source) return;
  const hasPrimary = embeddedPackages(actor).some((item) => item.type === "descriptor" && item.system.instance.role === "primary");
  const roleData = await foundry.applications.api.DialogV2.input({
    window: {title: source.name},
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.DescriptorRole")}
      <select name="role">${hasPrimary ? "" : `<option value="primary">${game.i18n.localize("CYPHERV2.Packages.Role.primary")}</option>`}<option value="additional">${game.i18n.localize("CYPHERV2.Packages.Role.additional")}</option><option value="custom">${game.i18n.localize("CYPHERV2.Packages.Role.custom")}</option></select>
    </label></div>`,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Next")}
  }) as DialogData | null;
  if (!roleData) return;
  const system = source.system as unknown as DescriptorSystemData;
  const poolChoices = await promptPoolBonusChoices(source.name, system.poolBonusChoiceGroups ?? []);
  if (poolChoices === null) return;
  const skillChoices = await promptGroupChoices(
    source.name,
    system.choiceGroups ?? [],
    game.i18n.localize("CYPHERV2.Packages.SkillChoice")
  );
  if (skillChoices === null) return;
  try {
    await game.cypherv2.services.characterPackages.attachDescriptor(actor, source, {
      role: String(roleData.role) as PackageRole,
      poolChoices,
      skillChoices,
      conflictResolver: resolveGrantConflictWithDialog
    });
    ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.DescriptorAttached"));
  } catch (error) { if (!(error instanceof GrantConflictCancelledError)) notify(error); }
}

async function promptPoolBonusChoices(
  title: string,
  groups: readonly PoolBonusChoiceGroup[]
): Promise<Record<string, PoolKey[]> | null> {
  const selections: Record<string, PoolKey[]> = {};
  for (const group of groups) {
    const allowed = [...new Set(group.pools)].filter((pool): pool is PoolKey => POOL_KEYS.includes(pool));
    if (group.choose < 1 || group.choose > allowed.length) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice"));
      return null;
    }
    const selected = await promptPackageChoice({
      title,
      prompt: group.choose === 1
        ? game.i18n.localize("CYPHERV2.Packages.ChooseOnePool")
        : game.i18n.format("CYPHERV2.Packages.ChooseManyPools", {count: group.choose}),
      ariaLabel: game.i18n.localize("CYPHERV2.Packages.AllowedPools"),
      choose: group.choose,
      options: poolChoiceOptions(allowed)
    });
    if (!selected) return null;
    selections[group.id] = selected.filter((pool): pool is PoolKey => POOL_KEYS.includes(pool as PoolKey));
  }
  return selections;
}

interface PackageGrantChoiceGroup {
  readonly id: string;
  readonly choose: number;
  readonly rank?: string;
  readonly options: readonly {
    readonly id: string;
    readonly snapshot: {readonly name: string};
    readonly customName?: string;
  }[];
}

async function promptGroupChoices(
  title: string,
  groups: readonly PackageGrantChoiceGroup[],
  label: string
): Promise<Record<string, string[]> | null> {
  const selections: Record<string, string[]> = {};
  for (const group of groups) {
    const prompt = group.rank
      ? game.i18n.format("CYPHERV2.Packages.ChooseSkills", {
        count: group.choose,
        rank: game.i18n.localize(`CYPHERV2.Skill.Ranks.${group.rank}`)
      })
      : game.i18n.format(
        group.choose === 1 ? "CYPHERV2.Packages.ChooseOne" : "CYPHERV2.Packages.ChooseMany",
        {count: group.choose, label}
      );
    const selected = await promptPackageChoice({
      title,
      prompt,
      ariaLabel: label,
      choose: group.choose,
      options: group.options.map((option) => ({
        id: option.id,
        label: option.snapshot?.name || option.customName || option.id
      }))
    });
    if (!selected) return null;
    selections[group.id] = selected;
  }
  return selections;
}

export async function promptAttachSpecies(actor: PackageCharacterLike, dropped?: PackageSourceLike): Promise<void> {
  const source = dropped ?? await selectWorldPackage("species");
  if (!source) return;
  const existing = embeddedPackages(actor).find((item) => item.type === "species");
  let replaceItemId: string | undefined;
  let replaceGrantedItemsMode: RemoveGrantedItemsMode | undefined;
  if (existing) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Species.Replace")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Species.ReplaceConfirm", {name: escapeHtml(existing.name)})}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Packages.Replace")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!confirmed) return;
    replaceItemId = existing.id;
    replaceGrantedItemsMode = await removalMode(existing.name) ?? undefined;
    if (!replaceGrantedItemsMode) return;
  }
  const system = source.system as unknown as SpeciesSystemData;
  let edgePool: PoolKey | undefined;
  if (system.edgeGrant.mode === "choice") {
    edgePool = await promptEdgePool(source.name) ?? undefined;
    if (!edgePool) return;
  }
  const skillChoices = await promptGroupChoices(source.name, system.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (skillChoices === null) return;
  const abilityChoices = await promptGroupChoices(source.name, system.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (abilityChoices === null) return;
  const descriptorChoiceGroups = await prepareDescriptorChoiceGroups(system.descriptorChoiceGroups ?? []);
  const descriptorChoices = await promptGroupChoices(
    source.name,
    descriptorChoiceGroups,
    game.i18n.localize("CYPHERV2.Species.DescriptorChoice")
  );
  if (descriptorChoices === null) return;
  const selectedDescriptors: DescriptorGrant[] = descriptorChoiceGroups.flatMap((group) => (
    group.options
      .filter((option) => descriptorChoices[group.id]?.includes(option.id))
      .map((option) => ({...option, id: `${group.id}:${option.id}`}))
  ));
  const descriptorSkillChoices: Record<string, Record<string, string[]>> = {};
  const descriptorPoolChoices: Record<string, Record<string, PoolKey[]>> = {};
  for (const grant of [...(system.descriptorGrants ?? []), ...selectedDescriptors]) {
    const descriptor = grant.descriptorUuid ? await fromUuid(grant.descriptorUuid) as PackageSourceLike | null : null;
    const descriptorSystem = (descriptor?.system ?? grant.snapshot.system) as unknown as DescriptorSystemData;
    const poolSelections = await promptPoolBonusChoices(
      grant.snapshot.name || descriptor?.name || source.name,
      descriptorSystem.poolBonusChoiceGroups ?? []
    );
    if (poolSelections === null) return;
    const selections = await promptGroupChoices(grant.snapshot.name || descriptor?.name || source.name, descriptorSystem.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
    if (selections === null) return;
    descriptorSkillChoices[grant.id] = selections;
    descriptorPoolChoices[grant.id] = poolSelections;
  }
  try {
    await game.cypherv2.services.characterPackages.attachSpecies(actor, source, {
      ...(edgePool ? {edgePool} : {}), skillChoices, abilityChoices, descriptorChoices,
      resolvedDescriptorChoiceGroups: descriptorChoiceGroups, descriptorSkillChoices, descriptorPoolChoices,
      conflictResolver: resolveGrantConflictWithDialog,
      ...(replaceItemId ? {replaceItemId} : {}),
      ...(replaceGrantedItemsMode ? {replaceGrantedItemsMode} : {})
    });
    ui.notifications.info(game.i18n.localize("CYPHERV2.Species.Attached"));
  } catch (error) { if (!(error instanceof GrantConflictCancelledError)) notify(error); }
}

export async function promptRemovePackage(actor: PackageCharacterLike, packageItemId: string): Promise<void> {
  const item = embeddedPackages(actor).find((entry) => entry.id === packageItemId);
  if (!item) return;
  const mode = await removalMode(item.name);
  if (!mode) return;
  try {
    await game.cypherv2.services.characterPackages.remove(actor, packageItemId, mode);
    ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.Removed"));
  } catch (error) { notify(error); }
}

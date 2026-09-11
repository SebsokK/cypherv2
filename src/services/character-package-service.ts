import {POOL_KEYS, type PoolKey} from "../rules/core/core-types";
import {packagePoolBonuses, preservePoolDeficit} from "../packages/package-derived";
import type {
  AbilityGrant,
  CharacterPackageItemLike,
  CharacterTypeSystemData,
  DescriptorChoiceGroup,
  DescriptorSystemData,
  DescriptorGrant,
  GrantAlternative,
  GrantedByData,
  ItemSnapshot,
  PackageRole,
  PoolBonusChoiceGroup,
  SkillChoiceGroup,
  SkillGrant,
  SkillGrantOption,
  SpeciesSystemData
} from "../packages/package-types";
import {
  findGrantConflict,
  grantIdentity,
  hasGrantConflict,
  GrantConflictCancelledError,
  type GrantConflict,
  type GrantConflictDocument,
  type GrantConflictResolver,
  type GrantIdentity,
  type GrantDocumentLike,
  type GrantReplacementOption
} from "../packages/grant-conflicts";

export type RemoveGrantedItemsMode = "delete" | "keep";
export type PackageResolver = (uuid: string) => Promise<PackageSourceLike | null>;

export interface PackageSourceLike {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly img?: string;
  readonly system: Record<string, unknown>;
}

export interface PackageCharacterLike {
  readonly id: string;
  readonly uuid?: string;
  readonly type: string;
  readonly items: Iterable<Item> & {get(id: string): Item | undefined};
  readonly system: {
    readonly stats: Record<PoolKey, {readonly value: number}>;
    readonly derived: {readonly pools: Record<PoolKey, {readonly max: number}>};
  };
  createEmbeddedDocuments(type: string, data: Record<string, unknown>[]): Promise<unknown[]>;
  deleteEmbeddedDocuments(type: string, ids: string[]): Promise<unknown[]>;
  update(changes: Record<string, unknown>): Promise<unknown>;
}

export interface AttachTypeOptions {
  readonly edgePool?: PoolKey;
  readonly superheroicsPool?: PoolKey;
  readonly powerShifts?: readonly string[];
  readonly skillChoices?: Readonly<Record<string, readonly string[]>>;
  readonly abilityChoices?: Readonly<Record<string, readonly string[]>>;
  readonly replaceItemId?: string;
  readonly replaceGrantedItemsMode?: RemoveGrantedItemsMode;
  readonly conflictResolver?: GrantConflictResolver;
}

export interface AttachDescriptorOptions {
  readonly role: PackageRole;
  readonly poolChoices?: Readonly<Record<string, readonly PoolKey[]>>;
  readonly skillChoices?: Readonly<Record<string, readonly string[]>>;
  readonly parent?: GrantedByData;
  readonly conflictResolver?: GrantConflictResolver;
}

export interface AttachSpeciesOptions {
  readonly edgePool?: PoolKey;
  readonly skillChoices?: Readonly<Record<string, readonly string[]>>;
  readonly abilityChoices?: Readonly<Record<string, readonly string[]>>;
  readonly descriptorChoices?: Readonly<Record<string, readonly string[]>>;
  /** Runtime-resolved catalog options. These are never written back to the Species source. */
  readonly resolvedDescriptorChoiceGroups?: readonly DescriptorChoiceGroup[];
  readonly descriptorSkillChoices?: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
  readonly descriptorPoolChoices?: Readonly<Record<string, Readonly<Record<string, readonly PoolKey[]>>>>;
  readonly replaceItemId?: string;
  readonly replaceGrantedItemsMode?: RemoveGrantedItemsMode;
  readonly conflictResolver?: GrantConflictResolver;
}

export interface PackageAttachResult {
  readonly packageItem: unknown;
  readonly grantedItems: readonly unknown[];
  readonly instanceId: string;
  readonly skippedGrantIds: readonly string[];
}

export interface PackageRemoveResult {
  readonly removedPackageId: string;
  readonly deletedGrantedItemIds: readonly string[];
  readonly retainedGrantedItemIds: readonly string[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function snapshotData(snapshot: ItemSnapshot, type: "ability" | "skill"): Record<string, unknown> | null {
  if (!snapshot?.name || !snapshot.system || typeof snapshot.system !== "object") return null;
  return {name: snapshot.name, img: snapshot.img, type, system: clone(snapshot.system)};
}

function snapshotPackageData(snapshot: ItemSnapshot, type: "descriptor"): Record<string, unknown> | null {
  if (!snapshot?.name || !snapshot.system || typeof snapshot.system !== "object") return null;
  return {name: snapshot.name, ...(snapshot.img ? {img: snapshot.img} : {}), type, system: clone(snapshot.system)};
}

function grantProvenance(
  kind: "type" | "descriptor" | "species",
  sourceUuid: string,
  instanceId: string,
  grantId: string,
  identity: GrantIdentity
): GrantedByData {
  return {
    kind, sourceUuid, instanceId, grantId, status: "active",
    contentUuid: identity.contentUuid, contentKey: identity.contentKey,
    replacement: emptyReplacement()
  };
}

function emptyReplacement(): GrantedByData["replacement"] {
  return {
    active: false,
    originalName: "",
    originalContentUuid: "",
    originalContentKey: "",
    replacementName: "",
    replacementContentUuid: "",
    replacementContentKey: "",
    selectionKind: "none"
  };
}

function emptyProvenance(): GrantedByData {
  return {
    kind: "other", sourceUuid: "", instanceId: "", grantId: "", status: "active",
    contentUuid: "", contentKey: "", replacement: emptyReplacement()
  };
}

function sourceData(source: PackageSourceLike): Record<string, unknown> {
  return {name: source.name, img: source.img, type: source.type, system: clone(source.system)};
}

function embeddedData(source: PackageSourceLike, type: "ability" | "skill"): Record<string, unknown> {
  const data = sourceData(source);
  data.type = type;
  return data;
}

function packageItems(actor: PackageCharacterLike): CharacterPackageItemLike[] {
  return [...actor.items]
    .filter((item) => item.type === "characterType" || item.type === "descriptor" || item.type === "species") as unknown as CharacterPackageItemLike[];
}

function grantsFor(actor: PackageCharacterLike, instanceId: string): Item[] {
  return [...actor.items].filter((item) => (
    (item.system as {grantedBy?: GrantedByData}).grantedBy?.instanceId === instanceId
  ));
}

function grantTree(actor: PackageCharacterLike, instanceId: string): Item[] {
  const direct = grantsFor(actor, instanceId);
  return direct.flatMap((item) => {
    if (item.type !== "descriptor" && item.type !== "characterType" && item.type !== "species") return [item];
    const childInstanceId = (item.system as unknown as CharacterPackageItemLike["system"]).instance?.instanceId;
    return [item, ...(childInstanceId ? grantTree(actor, childInstanceId) : [])];
  });
}

export class CharacterPackageService {
  readonly #resolve: PackageResolver;
  readonly #idFactory: () => string;
  readonly #now: () => number;

  constructor(
    resolve: PackageResolver = async (uuid) => await fromUuid(uuid) as PackageSourceLike | null,
    idFactory: () => string = () => globalThis.crypto?.randomUUID?.() ?? `package-${Date.now()}-${Math.random()}`,
    now: () => number = Date.now
  ) {
    this.#resolve = resolve;
    this.#idFactory = idFactory;
    this.#now = now;
  }

  async attachType(
    actor: PackageCharacterLike,
    source: PackageSourceLike,
    options: AttachTypeOptions = {}
  ): Promise<PackageAttachResult> {
    this.#assert(actor, source, "characterType");
    const oldType = options.replaceItemId
      ? packageItems(actor).find((item) => item.id === options.replaceItemId && item.type === "characterType")
      : undefined;
    if (packageItems(actor).some((item) => item.type === "characterType" && item.id !== oldType?.id)) {
      throw new Error("This Character already has an active Type.");
    }
    const system = clone(source.system) as unknown as CharacterTypeSystemData;
    const edgePool = system.edgeGrant.mode === "choice" ? options.edgePool : system.edgeGrant.pool;
    if (system.edgeGrant.mode === "choice" && !edgePool) throw new Error("This Type requires an Edge Pool choice.");
    const requiresSuperheroicsPool = system.genre === "superhero"
      && system.superhero?.superheroics?.enabled === true;
    const superheroicsPool = options.superheroicsPool;
    if (requiresSuperheroicsPool && !superheroicsPool) {
      throw new Error("This Superhero Type requires a Superheroics Pool choice.");
    }
    if (superheroicsPool && !POOL_KEYS.includes(superheroicsPool)) {
      throw new Error("Invalid Superheroics Pool choice.");
    }
    const powerShiftCount = Number.isInteger(system.superhero?.powerShiftCount)
      ? Math.max(0, Number(system.superhero?.powerShiftCount))
      : 0;
    const powerShifts = Array.from({length: powerShiftCount}, (_, index) => (
      String(options.powerShifts?.[index] ?? "").trim()
    ));
    const skillSelections = this.#validateChoices(system.choiceGroups ?? [], options.skillChoices ?? {});
    const abilitySelections = this.#validateAbilityChoices(system.abilityChoiceGroups ?? [], options.abilityChoices ?? {});
    const instanceId = this.#idFactory();
    const sourceUuid = system.instance?.sourceUuid || source.uuid;
    const selectedAbilities = (system.abilityChoiceGroups ?? []).flatMap((group) => group.options
      .filter((option) => abilitySelections[group.id]?.includes(option.id))
      .map((option) => ({...option, id: `${group.id}:${option.id}`})));
    const prepared = [
      ...await this.#prepareAbilityGrants([...(system.abilityGrants ?? []), ...selectedAbilities], "type", sourceUuid, instanceId),
      ...await this.#prepareSkillGrants(system.skillGrants ?? [], "type", sourceUuid, instanceId),
      ...await this.#prepareChoiceGrants(system.choiceGroups ?? [], skillSelections, "type", sourceUuid, instanceId)
    ];
    const {grants: preparedGrants, skippedGrantIds} = await this.#resolveConflicts(
      actor, prepared, source, options.conflictResolver
    );
    const packageData = sourceData(source);
    packageData.system = {
      ...system,
      instance: {
        sourceUuid,
        instanceId,
        role: "primary",
        attachedAt: this.#now(),
        selections: {
          edgePool: edgePool ?? "none",
          superheroicsPool: requiresSuperheroicsPool ? superheroicsPool! : "none",
          powerShifts,
          poolChoices: [],
          skillChoices: Object.entries(skillSelections).map(([groupId, optionIds]) => ({groupId, optionIds})),
          abilityChoices: Object.entries(abilitySelections).map(([groupId, optionIds]) => ({groupId, optionIds})),
          descriptorChoices: [],
          suppressedGrantIds: skippedGrantIds
        },
        parent: emptyProvenance()
      }
    };
    return this.#commitAttach(actor, packageData, preparedGrants, oldType, options.replaceGrantedItemsMode ?? "delete", skippedGrantIds);
  }

  async attachDescriptor(
    actor: PackageCharacterLike,
    source: PackageSourceLike,
    options: AttachDescriptorOptions
  ): Promise<PackageAttachResult> {
    this.#assert(actor, source, "descriptor");
    const system = clone(source.system) as unknown as DescriptorSystemData;
    const sourceUuid = system.instance?.sourceUuid || source.uuid;
    if (packageItems(actor).some((item) => (
      item.type === "descriptor" && item.system.instance.sourceUuid === sourceUuid
    ))) throw new Error("This Descriptor is already attached.");
    if (options.role === "primary" && packageItems(actor).some((item) => (
      item.type === "descriptor" && item.system.instance.role === "primary"
    ))) throw new Error("This Character already has a primary Descriptor.");
    const instanceId = this.#idFactory();
    const poolSelections = this.#validatePoolChoices(system.poolBonusChoiceGroups ?? [], options.poolChoices ?? {});
    const selected = this.#validateChoices(system.choiceGroups ?? [], options.skillChoices ?? {});
    const prepared = [
      ...await this.#prepareSkillGrants(system.skillGrants ?? [], "descriptor", sourceUuid, instanceId),
      ...await this.#prepareChoiceGrants(system.choiceGroups ?? [], selected, "descriptor", sourceUuid, instanceId)
    ];
    const {grants: preparedGrants, skippedGrantIds} = await this.#resolveConflicts(
      actor, prepared, source, options.conflictResolver
    );
    const packageData = sourceData(source);
    packageData.system = {
      ...system,
      instance: {
        sourceUuid,
        instanceId,
        role: options.role,
        attachedAt: this.#now(),
        selections: {
          edgePool: "none",
          superheroicsPool: "none",
          powerShifts: [],
          poolChoices: Object.entries(poolSelections).map(([groupId, pools]) => ({groupId, pools})),
          skillChoices: Object.entries(selected).map(([groupId, optionIds]) => ({groupId, optionIds})),
          abilityChoices: [],
          descriptorChoices: [],
          suppressedGrantIds: skippedGrantIds
        },
        parent: options.parent ?? emptyProvenance()
      }
    };
    if (options.parent) (packageData.system as Record<string, unknown>).grantedBy = options.parent;
    return this.#commitAttach(actor, packageData, preparedGrants, undefined, "delete", skippedGrantIds);
  }

  async attachSpecies(
    actor: PackageCharacterLike,
    source: PackageSourceLike,
    options: AttachSpeciesOptions = {}
  ): Promise<PackageAttachResult> {
    this.#assert(actor, source, "species");
    const oldSpecies = options.replaceItemId
      ? packageItems(actor).find((item) => item.id === options.replaceItemId && item.type === "species")
      : undefined;
    if (packageItems(actor).some((item) => item.type === "species" && item.id !== oldSpecies?.id)) {
      throw new Error("This Character already has an active Species.");
    }
    const system = clone(source.system) as unknown as SpeciesSystemData;
    const edgePool = system.edgeGrant.mode === "choice" ? options.edgePool : system.edgeGrant.pool;
    if (system.edgeGrant.mode === "choice" && !edgePool) throw new Error("This Species requires an Edge Pool choice.");
    const skillSelections = this.#validateChoices(system.choiceGroups ?? [], options.skillChoices ?? {});
    const abilitySelections = this.#validateAbilityChoices(system.abilityChoiceGroups ?? [], options.abilityChoices ?? {});
    const runtimeDescriptorGroups = new Map(
      (options.resolvedDescriptorChoiceGroups ?? []).map((group) => [group.id, group])
    );
    const descriptorChoiceGroups = (system.descriptorChoiceGroups ?? []).map((group) => {
      if ((group.sourceMode ?? "fixed") !== "catalog") return group;
      const resolved = runtimeDescriptorGroups.get(group.id);
      return {...group, options: resolved?.options ?? group.options};
    });
    const descriptorSelections = this.#validateDescriptorChoices(
      descriptorChoiceGroups,
      options.descriptorChoices ?? {}
    );
    const instanceId = this.#idFactory();
    const sourceUuid = system.instance?.sourceUuid || source.uuid;
    const selectedAbilities = (system.abilityChoiceGroups ?? []).flatMap((group) => (
      group.options
        .filter((option) => abilitySelections[group.id]?.includes(option.id))
        .map((option) => ({...option, id: `${group.id}:${option.id}`}))
    ));
    const selectedDescriptors = descriptorChoiceGroups.flatMap((group) => (
      group.options
        .filter((option) => descriptorSelections[group.id]?.includes(option.id))
        .map((option) => ({...option, id: `${group.id}:${option.id}`}))
    ));
    const ownPrepared = [
      ...await this.#prepareAbilityGrants([...(system.abilityGrants ?? []), ...selectedAbilities], "species", sourceUuid, instanceId),
      ...await this.#prepareSkillGrants(system.skillGrants ?? [], "species", sourceUuid, instanceId),
      ...await this.#prepareChoiceGrants(system.choiceGroups ?? [], skillSelections, "species", sourceUuid, instanceId)
    ];
    const ownFiltered = await this.#resolveConflicts(
      actor, ownPrepared, source, options.conflictResolver
    );
    const accepted: Record<string, unknown>[] = [...ownFiltered.grants];
    const speciesSuppressed = [...ownFiltered.skippedGrantIds];
    const allSkippedGrantIds = [...ownFiltered.skippedGrantIds];
    const descriptorIdentities = new Set(packageItems(actor)
      .filter((item) => item.type === "descriptor")
      .map((item) => item.system.instance.sourceUuid || `snapshot:${item.name.trim().toLocaleLowerCase()}`));

    const descriptorGrants = [...(system.descriptorGrants ?? []), ...selectedDescriptors];
    if (!unique(descriptorGrants.map((grant) => grant.id))) {
      throw new Error("Species Descriptor grant IDs must be unique.");
    }
    for (const grant of descriptorGrants) {
      const resolved = grant.descriptorUuid ? await this.#resolve(grant.descriptorUuid) : null;
      if (resolved && resolved.type !== "descriptor") throw new Error("A Species Descriptor grant references a non-Descriptor Item.");
      const descriptorData = resolved ? sourceData(resolved) : snapshotPackageData(grant.snapshot, "descriptor");
      if (!descriptorData) throw new Error(`Descriptor grant '${grant.id}' has neither a source nor a usable snapshot.`);
      const descriptorSystem = clone(descriptorData.system as Record<string, unknown>) as unknown as DescriptorSystemData;
      const descriptorSourceUuid = descriptorSystem.instance?.sourceUuid || grant.descriptorUuid;
      const descriptorIdentityKey = descriptorSourceUuid || `snapshot:${String(descriptorData.name).trim().toLocaleLowerCase()}`;
      if (descriptorIdentities.has(descriptorIdentityKey)) {
        speciesSuppressed.push(grant.id);
        allSkippedGrantIds.push(grant.id);
        continue;
      }
      descriptorIdentities.add(descriptorIdentityKey);
      const descriptorInstanceId = this.#idFactory();
      const poolSelected = this.#validatePoolChoices(
        descriptorSystem.poolBonusChoiceGroups ?? [],
        options.descriptorPoolChoices?.[grant.id] ?? {}
      );
      const selected = this.#validateChoices(
        descriptorSystem.choiceGroups ?? [],
        options.descriptorSkillChoices?.[grant.id] ?? {}
      );
      const descriptorPrepared = [
        ...await this.#prepareSkillGrants(descriptorSystem.skillGrants ?? [], "descriptor", descriptorSourceUuid, descriptorInstanceId),
        ...await this.#prepareChoiceGrants(descriptorSystem.choiceGroups ?? [], selected, "descriptor", descriptorSourceUuid, descriptorInstanceId)
      ];
      const descriptorDefinition: PackageSourceLike = {
        id: String((resolved as PackageSourceLike | null)?.id ?? grant.id),
        uuid: descriptorSourceUuid,
        name: String(descriptorData.name),
        type: "descriptor",
        ...(descriptorData.img ? {img: String(descriptorData.img)} : {}),
        system: descriptorSystem as unknown as Record<string, unknown>
      };
      const descriptorFiltered = await this.#resolveConflicts(
        actor, descriptorPrepared, descriptorDefinition, options.conflictResolver, accepted
      );
      allSkippedGrantIds.push(...descriptorFiltered.skippedGrantIds);
      const descriptorIdentity = {
        contentUuid: descriptorSourceUuid,
        contentKey: `descriptor:${String(descriptorData.name).trim().toLocaleLowerCase()}`
      };
      const parent = {
        kind: "species", sourceUuid, instanceId, grantId: grant.id, status: "active",
        ...descriptorIdentity,
        replacement: emptyReplacement()
      } satisfies GrantedByData;
      descriptorData.system = {
        ...descriptorSystem,
        grantedBy: parent,
        instance: {
          sourceUuid: descriptorSourceUuid,
          instanceId: descriptorInstanceId,
          role: "speciesGranted",
          attachedAt: this.#now(),
          selections: {
            edgePool: "none",
            superheroicsPool: "none",
            powerShifts: [],
            poolChoices: Object.entries(poolSelected).map(([groupId, pools]) => ({groupId, pools})),
            skillChoices: Object.entries(selected).map(([groupId, optionIds]) => ({groupId, optionIds})),
            abilityChoices: [],
            descriptorChoices: [],
            suppressedGrantIds: descriptorFiltered.skippedGrantIds
          },
          parent
        }
      };
      accepted.push(descriptorData, ...descriptorFiltered.grants);
    }

    const packageData = sourceData(source);
    packageData.system = {
      ...system,
      instance: {
        sourceUuid,
        instanceId,
        role: "primary",
        attachedAt: this.#now(),
        selections: {
          edgePool: edgePool ?? "none",
          superheroicsPool: "none",
          powerShifts: [],
          poolChoices: [],
          skillChoices: Object.entries(skillSelections).map(([groupId, optionIds]) => ({groupId, optionIds})),
          abilityChoices: Object.entries(abilitySelections).map(([groupId, optionIds]) => ({groupId, optionIds})),
          descriptorChoices: Object.entries(descriptorSelections).map(([groupId, optionIds]) => ({groupId, optionIds})),
          suppressedGrantIds: speciesSuppressed
        },
        parent: emptyProvenance()
      }
    };
    return this.#commitAttach(
      actor,
      packageData,
      accepted,
      oldSpecies,
      options.replaceGrantedItemsMode ?? "delete",
      allSkippedGrantIds
    );
  }

  async remove(
    actor: PackageCharacterLike,
    packageItemId: string,
    grantedItemsMode: RemoveGrantedItemsMode
  ): Promise<PackageRemoveResult> {
    const packageItem = packageItems(actor).find((item) => item.id === packageItemId);
    if (!packageItem) throw new Error("Character Package not found.");
    const instanceId = packageItem.system.instance.instanceId;
    const granted = grantTree(actor, instanceId);
    const oldMax = Object.fromEntries(POOL_KEYS.map((pool) => [pool, actor.system.derived.pools[pool].max])) as Record<PoolKey, number>;
    const bonuses = packagePoolBonuses(packageItem);
    const deleteIds = grantedItemsMode === "delete" ? granted.map((item) => item.id) : [];
    if (grantedItemsMode === "keep") {
      await Promise.all(granted.map((item) => item.update({
        "system.grantedBy.status": "retained",
        ...((item.type === "descriptor" || item.type === "characterType" || item.type === "species")
          ? {"system.instance.parent.status": "retained"}
          : {})
      })));
    }
    await actor.deleteEmbeddedDocuments("Item", [packageItem.id, ...deleteIds]);
    await this.#updatePoolValues(actor, oldMax, Object.fromEntries(POOL_KEYS.map((pool) => [pool, oldMax[pool] - bonuses[pool]])) as Record<PoolKey, number>);
    return {
      removedPackageId: packageItem.id,
      deletedGrantedItemIds: deleteIds,
      retainedGrantedItemIds: grantedItemsMode === "keep" ? granted.map((item) => item.id) : []
    };
  }

  async #commitAttach(
    actor: PackageCharacterLike,
    packageData: Record<string, unknown>,
    grants: Record<string, unknown>[],
    replacing?: CharacterPackageItemLike,
    replaceGrantedItemsMode: RemoveGrantedItemsMode = "delete",
    skippedGrantIds: readonly string[] = []
  ): Promise<PackageAttachResult> {
    const oldMax = Object.fromEntries(POOL_KEYS.map((pool) => [pool, actor.system.derived.pools[pool].max])) as Record<PoolKey, number>;
    const added = packagePoolBonuses(packageData as unknown as CharacterPackageItemLike);
    const removed = replacing ? packagePoolBonuses(replacing) : {might: 0, speed: 0, intellect: 0};
    const created = await actor.createEmbeddedDocuments("Item", [packageData, ...grants]);
    try {
      if (replacing) {
        const oldGrants = grantTree(actor, replacing.system.instance.instanceId);
        if (replaceGrantedItemsMode === "keep") {
          await Promise.all(oldGrants.map((item) => item.update({
            "system.grantedBy.status": "retained",
            ...((item.type === "descriptor" || item.type === "characterType" || item.type === "species")
              ? {"system.instance.parent.status": "retained"}
              : {})
          })));
        }
        await actor.deleteEmbeddedDocuments("Item", [
          replacing.id,
          ...(replaceGrantedItemsMode === "delete" ? oldGrants.map((item) => item.id) : [])
        ]);
      }
      const newMax = Object.fromEntries(POOL_KEYS.map((pool) => [pool, oldMax[pool] + added[pool] - removed[pool]])) as Record<PoolKey, number>;
      await this.#updatePoolValues(actor, oldMax, newMax);
    } catch (error) {
      const createdIds = created.map((entry) => (entry as {id?: string}).id).filter((id): id is string => Boolean(id));
      if (createdIds.length) await actor.deleteEmbeddedDocuments("Item", createdIds);
      throw error;
    }
    const instanceId = ((packageData.system as CharacterTypeSystemData | DescriptorSystemData | SpeciesSystemData).instance.instanceId);
    return {packageItem: created[0], grantedItems: created.slice(1), instanceId, skippedGrantIds};
  }

  async #updatePoolValues(actor: PackageCharacterLike, oldMax: Record<PoolKey, number>, newMax: Record<PoolKey, number>): Promise<void> {
    const changes: Record<string, unknown> = {};
    for (const pool of POOL_KEYS) {
      changes[`system.stats.${pool}.value`] = preservePoolDeficit(actor.system.stats[pool].value, oldMax[pool], Math.max(0, newMax[pool]));
    }
    await actor.update(changes);
  }

  async #prepareAbilityGrants(
    grants: readonly AbilityGrant[],
    kind: "type" | "species",
    sourceUuid: string,
    instanceId: string
  ): Promise<Record<string, unknown>[]> {
    if (!unique(grants.map((grant) => grant.id))) throw new Error("Type Ability grant IDs must be unique.");
    return Promise.all(grants.map(async (grant) => {
      const source = grant.abilityUuid ? await this.#resolve(grant.abilityUuid) : null;
      if (source && source.type !== "ability") throw new Error("An Ability grant references a non-Ability Item.");
      const data = source ? embeddedData(source, "ability") : snapshotData(grant.snapshot, "ability");
      if (!data) throw new Error(`Ability grant '${grant.id}' has neither a source nor a usable snapshot.`);
      const identity = grantIdentity("ability", String(data.name ?? grant.snapshot.name), grant.abilityUuid);
      data.system = {...data.system as Record<string, unknown>, grantedBy: grantProvenance(kind, sourceUuid, instanceId, grant.id, identity)};
      return data;
    }));
  }

  async #prepareSkillGrants(
    grants: readonly SkillGrant[],
    kind: "type" | "descriptor" | "species",
    sourceUuid: string,
    instanceId: string
  ): Promise<Record<string, unknown>[]> {
    if (!unique(grants.map((grant) => grant.id))) throw new Error("Descriptor Skill grant IDs must be unique.");
    return Promise.all(grants.map((grant) => this.#prepareSkill(grant, grant.rank, kind, sourceUuid, instanceId, grant.id)));
  }

  async #prepareChoiceGrants(
    groups: readonly SkillChoiceGroup[],
    selected: Record<string, readonly string[]>,
    kind: "type" | "descriptor" | "species",
    sourceUuid: string,
    instanceId: string
  ): Promise<Record<string, unknown>[]> {
    const prepared: Record<string, unknown>[] = [];
    for (const group of groups) {
      for (const optionId of selected[group.id] ?? []) {
        const option = group.options.find((entry) => entry.id === optionId)!;
        prepared.push(await this.#prepareSkill(option, group.rank, kind, sourceUuid, instanceId, `${group.id}:${option.id}`));
      }
    }
    return prepared;
  }

  async #prepareSkill(option: SkillGrantOption, rank: string, kind: "type" | "descriptor" | "species", sourceUuid: string, instanceId: string, grantId: string): Promise<Record<string, unknown>> {
    const source = option.skillUuid ? await this.#resolve(option.skillUuid) : null;
    if (source && source.type !== "skill") throw new Error("A Skill grant references a non-Skill Item.");
    const data = source
      ? embeddedData(source, "skill")
      : snapshotData(option.snapshot, "skill") ?? (option.customName ? {name: option.customName, type: "skill", system: {}} : null);
    if (!data) throw new Error(`Skill grant '${grantId}' has neither a source, custom name, nor usable snapshot.`);
    const identity = grantIdentity("skill", String(data.name ?? option.customName), option.skillUuid);
    const skillSystem = data.system as Record<string, unknown>;
    const acquisition = skillSystem.acquisition && typeof skillSystem.acquisition === "object"
      ? skillSystem.acquisition as Record<string, unknown>
      : {};
    const notes = String(option.notes ?? "");
    data.system = {
      ...skillSystem,
      ...(notes ? {acquisition: {...acquisition, notes}} : {}),
      rank,
      grantedBy: grantProvenance(kind, sourceUuid, instanceId, grantId, identity)
    };
    return data;
  }

  async #resolveConflicts(
    actor: PackageCharacterLike,
    grants: readonly Record<string, unknown>[],
    packageSource: PackageSourceLike,
    resolver?: GrantConflictResolver,
    additional: readonly Record<string, unknown>[] = []
  ): Promise<{grants: Record<string, unknown>[]; skippedGrantIds: string[]}> {
    const accepted: Record<string, unknown>[] = [];
    const skippedGrantIds: string[] = [];
    const existing = [...actor.items] as unknown as GrantDocumentLike[];
    const additionalDocuments = additional.filter((entry) => entry.type === "ability" || entry.type === "skill") as unknown as GrantDocumentLike[];
    for (const originalData of grants) {
      let data = originalData;
      const type = data.type;
      if (type !== "ability" && type !== "skill") {
        accepted.push(data);
        continue;
      }
      while (true) {
        const provenance = ((data.system as Record<string, unknown>).grantedBy ?? {}) as GrantedByData;
        const identity: GrantIdentity = {type, contentUuid: provenance.contentUuid, contentKey: provenance.contentKey};
        const documents = [...existing, ...additionalDocuments, ...accepted as unknown as GrantDocumentLike[]];
        const conflicting = findGrantConflict(documents, identity);
        if (!conflicting) {
          accepted.push(data);
          break;
        }
        if (!resolver) {
          skippedGrantIds.push(provenance.grantId);
          break;
        }
        const conflict: GrantConflict = {
          id: `${provenance.instanceId}:${provenance.grantId}`,
          type,
          packageName: packageSource.name,
          packageSourceUuid: packageSource.uuid,
          grantId: provenance.grantId,
          existing: this.#conflictDocument(conflicting, type),
          proposed: this.#conflictDocument(data as unknown as GrantDocumentLike, type),
          suggestions: this.#suggestions(actor, packageSource, type, provenance.grantId),
          allowCustom: type === "skill",
          allowSuppress: true,
          allowGmOverride: false,
          context: "package"
        };
        const resolution = await resolver(conflict);
        if (resolution.action === "cancel") throw new GrantConflictCancelledError();
        if (resolution.action === "suppress") {
          skippedGrantIds.push(provenance.grantId);
          break;
        }
        if (resolution.action !== "replace") {
          throw new Error("GM Override is not a valid Character Package grant resolution.");
        }
        data = await this.#replacementData(data, resolution.replacement, resolution.selectionKind);
      }
    }
    return {grants: accepted, skippedGrantIds};
  }

  #conflictDocument(document: GrantDocumentLike | Record<string, unknown>, type: "ability" | "skill"): GrantConflictDocument {
    const data = document as {id?: string; uuid?: string; name?: string; system?: Record<string, unknown>};
    const system = data.system ?? {};
    const provenance = (system.grantedBy ?? {}) as Partial<GrantedByData>;
    const identity = grantIdentity(type, String(data.name ?? ""), String(provenance.contentUuid ?? ""));
    return {
      id: String(data.id ?? data.uuid ?? identity.contentKey),
      name: String(data.name ?? ""),
      type,
      rank: type === "skill" ? String(system.rank ?? "untrained") : "",
      contentUuid: String(provenance.contentUuid ?? identity.contentUuid),
      contentKey: String(provenance.contentKey ?? identity.contentKey)
    };
  }

  async #replacementData(
    original: Record<string, unknown>,
    replacement: GrantReplacementOption,
    selectionKind: "suggested" | "world" | "compendium" | "custom"
  ): Promise<Record<string, unknown>> {
    const type = original.type;
    if (type !== "ability" && type !== "skill") throw new Error("Only Skill and Ability grants can be replaced.");
    if (replacement.type !== type) throw new Error("A grant replacement must use the same Item type.");
    const source = replacement.itemUuid ? await this.#resolve(replacement.itemUuid) : null;
    if (source && source.type !== type) throw new Error(`The selected replacement is not a ${type} Item.`);
    const data = source
      ? embeddedData(source, type)
      : snapshotData(replacement.snapshot, type)
        ?? (type === "skill" && replacement.custom ? {name: replacement.name, type, system: {}} : null);
    if (!data) throw new Error(`The selected ${type} replacement is unavailable and has no usable snapshot.`);
    const originalSystem = original.system as Record<string, unknown>;
    const originalProvenance = (originalSystem.grantedBy ?? {}) as GrantedByData;
    const firstOriginal = originalProvenance.replacement?.active
      ? originalProvenance.replacement
      : {
          originalName: String(original.name ?? ""),
          originalContentUuid: originalProvenance.contentUuid,
          originalContentKey: originalProvenance.contentKey
        };
    const replacementIdentity = grantIdentity(type, String(data.name ?? replacement.name), replacement.itemUuid);
    const replacementSystem = data.system as Record<string, unknown>;
    const originalAcquisition = originalSystem.acquisition && typeof originalSystem.acquisition === "object"
      ? originalSystem.acquisition as Record<string, unknown>
      : {};
    const replacementAcquisition = replacementSystem.acquisition && typeof replacementSystem.acquisition === "object"
      ? replacementSystem.acquisition as Record<string, unknown>
      : {};
    data.system = {
      ...replacementSystem,
      ...(type === "skill" ? {rank: originalSystem.rank} : {}),
      ...(type === "skill" && originalAcquisition.notes
        ? {acquisition: {...replacementAcquisition, notes: originalAcquisition.notes}}
        : {}),
      grantedBy: {
        ...originalProvenance,
        contentUuid: replacementIdentity.contentUuid,
        contentKey: replacementIdentity.contentKey,
        replacement: {
          active: true,
          originalName: firstOriginal.originalName,
          originalContentUuid: firstOriginal.originalContentUuid,
          originalContentKey: firstOriginal.originalContentKey,
          replacementName: String(data.name ?? replacement.name),
          replacementContentUuid: replacementIdentity.contentUuid,
          replacementContentKey: replacementIdentity.contentKey,
          selectionKind
        }
      } satisfies GrantedByData
    };
    return data;
  }

  #suggestions(
    actor: PackageCharacterLike,
    packageSource: PackageSourceLike,
    type: "ability" | "skill",
    grantId: string
  ): GrantReplacementOption[] {
    const suggestions: GrantReplacementOption[] = [];
    const add = (
      option: {id: string; itemUuid: string; customName: string; snapshot: ItemSnapshot},
      reason: string,
      reasonSourceUuid: string
    ): void => {
      const name = option.snapshot?.name || option.customName;
      if (!name) return;
      suggestions.push({
        id: `${reasonSourceUuid}:${option.id}`,
        type,
        name,
        itemUuid: option.itemUuid,
        snapshot: option.snapshot,
        reason,
        reasonSourceUuid,
        ...(type === "skill" && !option.itemUuid ? {custom: true} : {})
      });
    };
    const addAlternatives = (alternatives: readonly GrantAlternative[] | undefined, reason: string, sourceUuid: string): void => {
      for (const alternative of alternatives ?? []) add(alternative, reason, sourceUuid);
    };
    const inspect = (
      packageItem: PackageSourceLike | CharacterPackageItemLike,
      selectedOnly = false
    ): void => {
      const system = packageItem.system as unknown as SpeciesSystemData & DescriptorSystemData & CharacterTypeSystemData;
      const selections = "instance" in system ? system.instance?.selections : undefined;
      if (type === "skill") {
        for (const grant of system.skillGrants ?? []) {
          if (packageItem.uuid === packageSource.uuid && grant.id === grantId) {
            addAlternatives(grant.alternatives, `${packageItem.name} — declared alternative`, packageItem.uuid);
          }
        }
        for (const group of system.choiceGroups ?? []) {
          const selected = selections?.skillChoices.find((entry) => entry.groupId === group.id)?.optionIds ?? [];
          const currentOptionId = grantId.startsWith(`${group.id}:`) ? grantId.slice(group.id.length + 1) : "";
          if (packageItem.uuid === packageSource.uuid && currentOptionId) {
            for (const option of group.options) if (option.id !== currentOptionId) {
              add({id: option.id, itemUuid: option.skillUuid, customName: option.customName, snapshot: option.snapshot}, `${packageItem.name} — Skill choice`, packageItem.uuid);
            }
          } else if (!selectedOnly) {
            for (const option of group.options) if (!selected.includes(option.id)) {
              add({id: option.id, itemUuid: option.skillUuid, customName: option.customName, snapshot: option.snapshot}, `${packageItem.name} — unused Skill choice`, packageItem.uuid);
            }
          }
        }
      } else {
        for (const grant of system.abilityGrants ?? []) {
          if (packageItem.uuid === packageSource.uuid && grant.id === grantId) {
            addAlternatives(grant.alternatives, `${packageItem.name} — declared alternative`, packageItem.uuid);
          }
        }
        for (const group of system.abilityChoiceGroups ?? []) {
          const selected = selections?.abilityChoices.find((entry) => entry.groupId === group.id)?.optionIds ?? [];
          const currentOptionId = grantId.startsWith(`${group.id}:`) ? grantId.slice(group.id.length + 1) : "";
          if (packageItem.uuid === packageSource.uuid && currentOptionId) {
            for (const option of group.options) if (option.id !== currentOptionId) {
              add({id: option.id, itemUuid: option.abilityUuid, customName: "", snapshot: option.snapshot}, `${packageItem.name} — Ability choice`, packageItem.uuid);
            }
          } else if (!selectedOnly) {
            for (const option of group.options) if (!selected.includes(option.id)) {
              add({id: option.id, itemUuid: option.abilityUuid, customName: "", snapshot: option.snapshot}, `${packageItem.name} — unused Ability choice`, packageItem.uuid);
            }
          }
        }
      }
    };
    inspect(packageSource, true);
    for (const packageItem of packageItems(actor)) inspect(packageItem);
    const seen = new Set<string>();
    return suggestions.filter((suggestion) => {
      const identity = grantIdentity(type, suggestion.name, suggestion.itemUuid);
      const key = identity.contentUuid || identity.contentKey;
      if (seen.has(key) || hasGrantConflict(actor.items as unknown as Iterable<GrantDocumentLike>, identity)) return false;
      seen.add(key);
      return true;
    });
  }

  #validateChoices(groups: readonly SkillChoiceGroup[], selections: Readonly<Record<string, readonly string[]>>): Record<string, readonly string[]> {
    const result: Record<string, readonly string[]> = {};
    for (const group of groups) {
      const selected = selections[group.id] ?? [];
      if (selected.length !== group.choose || !unique(selected) || selected.some((id) => !group.options.some((option) => option.id === id))) {
        throw new Error(`Descriptor choice '${group.id}' requires exactly ${group.choose} valid option(s).`);
      }
      result[group.id] = [...selected];
    }
    return result;
  }

  #validateAbilityChoices(
    groups: SpeciesSystemData["abilityChoiceGroups"],
    selections: Readonly<Record<string, readonly string[]>>
  ): Record<string, readonly string[]> {
    const result: Record<string, readonly string[]> = {};
    for (const group of groups) {
      const selected = selections[group.id] ?? [];
      if (selected.length !== group.choose || !unique(selected) || selected.some((id) => !group.options.some((option) => option.id === id))) {
        throw new Error(`Ability choice '${group.id}' requires exactly ${group.choose} valid option(s).`);
      }
      result[group.id] = [...selected];
    }
    return result;
  }

  #validateDescriptorChoices(
    groups: readonly DescriptorChoiceGroup[],
    selections: Readonly<Record<string, readonly string[]>>
  ): Record<string, readonly string[]> {
    if (!unique(groups.map((group) => group.id))) {
      throw new Error("Species Descriptor choice group IDs must be unique.");
    }
    const result: Record<string, readonly string[]> = {};
    for (const group of groups) {
      if (!unique(group.options.map((option) => option.id))) {
        throw new Error(`Descriptor choice '${group.id}' option IDs must be unique.`);
      }
      const selected = selections[group.id] ?? [];
      if (
        !Number.isInteger(group.choose)
        || group.choose < 1
        || group.choose > group.options.length
        || selected.length !== group.choose
        || !unique(selected)
        || selected.some((id) => !group.options.some((option) => option.id === id))
      ) {
        throw new Error(`Descriptor choice '${group.id}' requires exactly ${group.choose} valid option(s).`);
      }
      result[group.id] = [...selected];
    }
    return result;
  }

  #validatePoolChoices(
    groups: readonly PoolBonusChoiceGroup[],
    selections: Readonly<Record<string, readonly PoolKey[]>>
  ): Record<string, readonly PoolKey[]> {
    if (!unique(groups.map((group) => group.id))) {
      throw new Error("Descriptor Pool bonus choice group IDs must be unique.");
    }
    const result: Record<string, readonly PoolKey[]> = {};
    for (const group of groups) {
      const allowed = [...new Set(group.pools)].filter((pool): pool is PoolKey => POOL_KEYS.includes(pool));
      if (
        allowed.length !== group.pools.length
        || !Number.isInteger(group.choose)
        || group.choose < 1
        || group.choose > allowed.length
        || !Number.isInteger(group.amount)
        || group.amount < 1
      ) {
        throw new Error(`Descriptor Pool choice '${group.id}' is invalid.`);
      }
      const selected = selections[group.id] ?? [];
      if (selected.length !== group.choose || !unique(selected) || selected.some((pool) => !allowed.includes(pool))) {
        throw new Error(`Descriptor Pool choice '${group.id}' requires exactly ${group.choose} valid Pool(s).`);
      }
      result[group.id] = [...selected];
    }
    return result;
  }

  #assert(actor: PackageCharacterLike, source: PackageSourceLike, expectedType: string): void {
    if (actor.type !== "character") throw new Error("Character Packages require a Character Actor.");
    if (source.type !== expectedType) throw new Error(`Expected a ${expectedType} Item.`);
  }
}

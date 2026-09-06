import type {
  CoreCharacterSetupRequest,
  CoreCreationMode,
  StartingSkillSelection
} from "../creation/character-creation-types";

export type CharacterInitializationErrorCode =
  | "not-character"
  | "already-initialized"
  | "invalid-pools"
  | "invalid-skills"
  | "duplicate-skill"
  | "skill-source-missing"
  | "state-not-persisted";

export class CharacterInitializationError extends Error {
  constructor(readonly code: CharacterInitializationErrorCode, message: string) {
    super(message);
    this.name = "CharacterInitializationError";
  }
}

export interface CreationSkillSourceLike {
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly system: Record<string, unknown>;
}

export interface CreatedSkillLike {
  delete?(): Promise<unknown>;
}

export interface InitializationCharacterLike {
  readonly type: string;
  readonly items: Iterable<{readonly name: string; readonly type: string}>;
  readonly system: {
    readonly creation: {readonly coreInitialized: boolean; readonly mode: CoreCreationMode};
  };
  readonly sheet?: {render(options?: boolean | Record<string, unknown>): Promise<unknown>} | null;
  update(changes: Record<string, unknown>): Promise<unknown>;
  createEmbeddedDocuments(
    type: string,
    data: Record<string, unknown>[],
    operation?: Record<string, unknown>
  ): Promise<unknown[]>;
}

export type CreationSkillResolver = (uuid: string) => Promise<CreationSkillSourceLike | null>;
const foundrySkillResolver: CreationSkillResolver = async (uuid) => {
  try {
    const document = await fromUuid(uuid);
    if (!document || typeof document !== "object" || !("type" in document)) return null;
    const item = document as CreationSkillSourceLike;
    return item.type === "skill" ? item : null;
  } catch {
    return null;
  }
};

function normalizedName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export class CharacterInitializationService {
  readonly #resolveSkill: CreationSkillResolver;
  readonly #now: () => number;

  constructor(resolveSkill: CreationSkillResolver = foundrySkillResolver, now: () => number = Date.now) {
    this.#resolveSkill = resolveSkill;
    this.#now = now;
  }

  async setup(
    actor: InitializationCharacterLike,
    request: CoreCharacterSetupRequest
  ): Promise<void> {
    this.#assertAvailable(actor);
    const allocation = Object.values(request.pools);
    if (allocation.some((value) => !Number.isInteger(value) || value < 0)
      || allocation.reduce((sum, value) => sum + value, 0) !== 6) {
      throw new CharacterInitializationError("invalid-pools", "Core Setup must distribute exactly six Pool points.");
    }
    const trained = request.skills.filter((entry) => entry.rank === "trained");
    const inabilities = request.skills.filter((entry) => entry.rank === "inability");
    const validSkills = trained.length === 2 && inabilities.length === 0
      || trained.length === 3 && inabilities.length === 1;
    if (!validSkills) {
      throw new CharacterInitializationError(
        "invalid-skills",
        "Core Setup requires two trained Skills, or three trained Skills and one different Inability."
      );
    }

    const prepared = await Promise.all(request.skills.map((selection) => this.#skillData(selection)));
    const existingNames = new Set([...actor.items]
      .filter((item) => item.type === "skill")
      .map((item) => normalizedName(item.name)));
    const selectedNames = new Set<string>();
    for (const data of prepared) {
      const name = normalizedName(String(data.name));
      if (!name || existingNames.has(name) || selectedNames.has(name)) {
        throw new CharacterInitializationError("duplicate-skill", "Starting Skills must all be different.");
      }
      selectedNames.add(name);
    }

    const created = await actor.createEmbeddedDocuments("Item", prepared) as CreatedSkillLike[];
    try {
      await actor.update({
        "system.tier": 1,
        "system.stats.might.value": 8 + request.pools.might,
        "system.stats.might.baseMax": 8 + request.pools.might,
        "system.stats.might.baseEdge": 0,
        "system.stats.speed.value": 8 + request.pools.speed,
        "system.stats.speed.baseMax": 8 + request.pools.speed,
        "system.stats.speed.baseEdge": 0,
        "system.stats.intellect.value": 8 + request.pools.intellect,
        "system.stats.intellect.baseMax": 8 + request.pools.intellect,
        "system.stats.intellect.baseEdge": 0,
        "system.stats.effortBase": 1,
        "system.cypherLimitBase": 2,
        "system.proficiencies.weaponCategories": ["light"],
        "system.proficiencies.armorCategories": [],
        "system.creation": {
          coreInitialized: true,
          mode: "completed",
          initializedAt: this.#now()
        }
      });
      if (!actor.system.creation.coreInitialized) {
        throw new CharacterInitializationError(
          "state-not-persisted",
          "Foundry did not expose the persisted Core initialization state after update."
        );
      }
    } catch (error) {
      await Promise.allSettled(created.map((document) => document.delete?.()));
      throw error;
    }
  }

  async markInitialized(
    actor: InitializationCharacterLike,
    mode: "skipped" | "manual"
  ): Promise<void> {
    if (actor.type !== "character") {
      throw new CharacterInitializationError("not-character", "Core Setup requires a Character.");
    }
    if (actor.system.creation.coreInitialized) return;
    await actor.update({"system.creation": {
      coreInitialized: true,
      mode,
      initializedAt: this.#now()
    }});
    if (!actor.system.creation.coreInitialized) {
      throw new CharacterInitializationError(
        "state-not-persisted",
        "Foundry did not expose the persisted Core initialization state after update."
      );
    }
  }

  async #skillData(selection: StartingSkillSelection): Promise<Record<string, unknown>> {
    if (selection.sourceUuid) {
      const source = await this.#resolveSkill(selection.sourceUuid);
      if (!source) {
        throw new CharacterInitializationError("skill-source-missing", "A selected Skill source is unavailable.");
      }
      return {
        name: source.name,
        type: "skill",
        system: {
          ...structuredClone(source.system),
          rank: selection.rank,
          acquisition: {
            ...((source.system.acquisition as Record<string, unknown> | undefined) ?? {}),
            grantedByUuid: source.uuid
          }
        }
      };
    }
    const name = selection.customName?.trim() ?? "";
    if (!name) {
      throw new CharacterInitializationError("invalid-skills", "A custom Skill requires a name.");
    }
    const category = selection.category ?? "general";
    return {
      name,
      type: "skill",
      system: {
        rank: selection.rank,
        category,
        contexts: category === "general" ? [] : [category],
        acquisition: {minimumTier: 1, grantedByUuid: "", notes: ""}
      }
    };
  }

  #assertAvailable(actor: InitializationCharacterLike): void {
    if (actor.type !== "character") {
      throw new CharacterInitializationError("not-character", "Core Setup requires a Character.");
    }
    if (actor.system.creation.coreInitialized) {
      throw new CharacterInitializationError("already-initialized", "Core Setup has already been finalized.");
    }
  }
}

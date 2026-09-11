import {deriveCharacterData} from "../../src/rules/core/derived-data";
import {emptyCharacterOverrides} from "../../src/rules/core/character-overrides";
import type {
  CharacterCoreSystemData,
  CharacterDocumentLike,
  CharacterPools,
  RecoveryUsage,
  WoundCollection,
  WoundRecordData
} from "../../src/rules/core/core-types";
import {defaultRecoverySlots} from "../../src/rules/core/recovery-track";

export function wound(id: string): WoundRecordData {
  return {id, label: id, description: "", sourceUuid: "test", treated: false};
}

export function wounds(counts: Partial<Record<keyof WoundCollection, number>> = {}): WoundCollection {
  return {
    minor: Array.from({length: counts.minor ?? 0}, (_, index) => wound(`minor-${index + 1}`)),
    moderate: Array.from({length: counts.moderate ?? 0}, (_, index) => wound(`moderate-${index + 1}`)),
    major: Array.from({length: counts.major ?? 0}, (_, index) => wound(`major-${index + 1}`))
  };
}

export function pools(values: Partial<Record<"might" | "speed" | "intellect", number>> = {}): CharacterPools {
  return {
    might: {value: values.might ?? 10, baseMax: 10, baseEdge: 0},
    speed: {value: values.speed ?? 10, baseMax: 10, baseEdge: 0},
    intellect: {value: values.intellect ?? 10, baseMax: 10, baseEdge: 0}
  };
}

export interface FakeCharacter extends CharacterDocumentLike {
  id: string;
  name: string;
  updates: Record<string, unknown>[];
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1)!] = value;
}

export function character(options: {
  tier?: number;
  poolValues?: Partial<Record<"might" | "speed" | "intellect", number>>;
  wounds?: WoundCollection;
  usedRecoveries?: Partial<RecoveryUsage>;
  mightEdge?: number;
  effortBase?: number;
  xp?: number;
} = {}): FakeCharacter {
  const stats = pools(options.poolValues);
  stats.might.baseEdge = options.mightEdge ?? 0;
  const currentWounds = options.wounds ?? wounds();
  const used = {
    oneAction: false,
    tenMinutes: false,
    oneHour: false,
    tenHours: false,
    ...options.usedRecoveries
  };
  const system: CharacterCoreSystemData = {
    tier: options.tier ?? 1,
    overrides: emptyCharacterOverrides(),
    xp: options.xp ?? 0,
    resourcePoints: 0,
    cypherLimitBase: 2,
    focusProgress: [],
    genre: {sourceUuid: "", instanceId: "", provenance: "manual", attachedAt: 0},
    appearance: {backgroundMode: "theme", customImage: "", color: ""},
    creation: {coreInitialized: true, mode: "manual", initializedAt: 0},
    advancement: {
      cycle: 1,
      purchases: [],
      initializedFocusUuids: [],
      pendingFocusChoices: [],
      pendingGenreChoices: [],
      notes: ""
    },
    proficiencies: {weaponCategories: [], weaponFamilies: [], armorCategories: [], freelyUse: []},
    stats: Object.assign(stats, {effortBase: options.effortBase ?? 1}),
    wounds: currentWounds,
    recovery: {
      bonus: 0,
      used,
      slots: defaultRecoverySlots(used),
      customized: false,
      rollModifier: 0,
      history: []
    },
    presentation: {hideFocusInSentence: false, powerShiftsEnabled: false},
    powerShifts: [],
    rest: {lastType: "", history: []},
    derived: deriveCharacterData(stats, currentWounds, used, {}, [], undefined, 0, undefined, 2, options.tier ?? 1)
  };
  const actor: FakeCharacter = {
    id: "character-1",
    name: "Test Character",
    type: "character",
    system,
    updates: [],
    async update(changes): Promise<unknown> {
      this.updates.push(changes);
      for (const [path, value] of Object.entries(changes)) {
        const relativePath = path.startsWith("system.") ? path.slice(7) : path;
        setPath(this.system as unknown as Record<string, unknown>, relativePath, value);
      }
      this.system.derived = deriveCharacterData(
        this.system.stats,
        this.system.wounds,
        this.system.recovery.used,
        {},
        [],
        this.system.proficiencies,
        this.system.recovery.bonus,
        undefined,
        this.system.cypherLimitBase,
        this.system.tier,
        this.system.overrides,
        this.system.recovery.rollModifier,
        this.system.recovery.slots
      );
      return this;
    }
  };
  return actor;
}

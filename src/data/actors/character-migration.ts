export interface CharacterMigrationOptions {
  readonly partial?: boolean;
}

function normalizeOverrideValue(value: unknown, minimum: number): number | null {
  return Number.isInteger(value) && Number(value) >= minimum ? Number(value) : null;
}

function normalizeOverrides(overrides: Record<string, unknown>, partial = false): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  const stats = overrides.stats && typeof overrides.stats === "object"
    ? overrides.stats as Record<string, unknown>
    : {};
  const pool = (key: string) => {
    const value = stats[key] && typeof stats[key] === "object"
      ? stats[key] as Record<string, unknown>
      : {};
    const result: Record<string, unknown> = {};
    if (!partial || hasOwn(value, "max")) result.max = normalizeOverrideValue(value.max, 1);
    if (!partial || hasOwn(value, "edge")) result.edge = normalizeOverrideValue(value.edge, -20);
    return result;
  };
  if (!partial || hasOwn(overrides, "tier")) normalized.tier = normalizeOverrideValue(overrides.tier, 1);
  if (!partial || hasOwn(overrides, "effort")) normalized.effort = normalizeOverrideValue(overrides.effort, 0);
  if (!partial || hasOwn(overrides, "stats")) {
    const normalizedStats: Record<string, unknown> = {};
    for (const key of ["might", "speed", "intellect"]) {
      if (!partial || hasOwn(stats, key)) normalizedStats[key] = pool(key);
    }
    normalized.stats = normalizedStats;
  }
  return normalized;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeAdvancement(
  advancement: Record<string, unknown>,
  partial: boolean
): Record<string, unknown> {
  const normalized = {...advancement};
  if (!partial || hasOwn(advancement, "cycle")) {
    normalized.cycle = Number.isInteger(advancement.cycle) ? advancement.cycle : 1;
  }
  if (!partial || hasOwn(advancement, "purchases")) {
    normalized.purchases = Array.isArray(advancement.purchases) ? advancement.purchases : [];
  }
  if (!partial || hasOwn(advancement, "initializedFocusUuids")) {
    normalized.initializedFocusUuids = Array.isArray(advancement.initializedFocusUuids)
      ? advancement.initializedFocusUuids
      : [];
  }
  if (!partial || hasOwn(advancement, "pendingFocusChoices")) {
    normalized.pendingFocusChoices = Array.isArray(advancement.pendingFocusChoices)
      ? advancement.pendingFocusChoices
      : [];
  }
  if (!partial || hasOwn(advancement, "pendingGenreChoices")) {
    normalized.pendingGenreChoices = Array.isArray(advancement.pendingGenreChoices)
      ? advancement.pendingGenreChoices
      : [];
  }
  if (!partial || hasOwn(advancement, "guidanceCompletedTiers")) {
    normalized.guidanceCompletedTiers = Array.isArray(advancement.guidanceCompletedTiers)
      ? [...new Set(advancement.guidanceCompletedTiers
        .filter((tier): tier is number => Number.isInteger(tier) && Number(tier) >= 1)
        .map(Number))].sort((left, right) => left - right)
      : [];
  }
  if (!partial || hasOwn(advancement, "notes")) {
    normalized.notes = typeof advancement.notes === "string" ? advancement.notes : "";
  }
  return normalized;
}

function normalizeCreation(
  creation: Record<string, unknown>,
  partial: boolean
): Record<string, unknown> {
  const normalized = {...creation};
  if (!partial || hasOwn(creation, "coreInitialized")) {
    normalized.coreInitialized = creation.coreInitialized === true;
  }
  if (!partial || hasOwn(creation, "mode")) {
    const mode = creation.mode === "setup" ? "completed" : String(creation.mode);
    normalized.mode = ["completed", "skipped", "manual"].includes(mode)
      ? mode
      : "uninitialized";
  }
  if (!partial || hasOwn(creation, "initializedAt")) {
    normalized.initializedAt = Number.isInteger(creation.initializedAt) ? creation.initializedAt : 0;
  }
  return normalized;
}

function normalizeAppearance(
  appearance: Record<string, unknown>,
  partial: boolean
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  if (!partial || hasOwn(appearance, "backgroundMode")) {
    const mode = String(appearance.backgroundMode ?? "theme");
    normalized.backgroundMode = ["theme", "portrait", "custom"].includes(mode) ? mode : "theme";
  }
  if (!partial || hasOwn(appearance, "customImage")) {
    normalized.customImage = typeof appearance.customImage === "string" ? appearance.customImage : "";
  }
  if (!partial || hasOwn(appearance, "color")) {
    const color = typeof appearance.color === "string" ? appearance.color.trim() : "";
    normalized.color = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color) ? color.toLocaleLowerCase("en-US") : "";
  }
  return normalized;
}

/**
 * Normalize Character source data without expanding absent fields during a
 * Foundry partial update. Foundry invokes TypeDataModel migration both for
 * complete source construction and for partial document updates.
 */
export function migrateCharacterSystemData(
  source: Record<string, unknown>,
  options: CharacterMigrationOptions = {}
): Record<string, unknown> {
  const partial = options.partial === true;
  if (!partial) {
    source.overrides = normalizeOverrides(
      source.overrides && typeof source.overrides === "object"
        ? source.overrides as Record<string, unknown>
        : {}
    );
  } else if (source.overrides && typeof source.overrides === "object") {
    // Partial updates are path-based in normal operation. If Foundry supplies
    // the complete override branch, normalize only that intentional branch.
    source.overrides = normalizeOverrides(source.overrides as Record<string, unknown>, true);
  }
  if (!partial && (!source.genre || typeof source.genre !== "object")) {
    source.genre = {sourceUuid: "", instanceId: "", provenance: "manual", attachedAt: 0};
  }
  if (!partial) {
    source.appearance = normalizeAppearance(
      source.appearance && typeof source.appearance === "object"
        ? source.appearance as Record<string, unknown>
        : {},
      false
    );
  } else if (source.appearance && typeof source.appearance === "object") {
    source.appearance = normalizeAppearance(source.appearance as Record<string, unknown>, true);
  }
  if (Array.isArray(source.focusProgress)) {
    source.focusProgress = source.focusProgress.map((raw) => {
      const progress = raw as Record<string, unknown>;
      const ownedNodeIds = Array.isArray(progress.ownedNodeIds) ? progress.ownedNodeIds : [];
      const acquisitionRecords = Array.isArray(progress.acquisitions)
        ? progress.acquisitions
        : ownedNodeIds.map((nodeId) => ({
          nodeId,
          mode: "legacy",
          choiceId: "",
          choiceSource: "none",
          choiceGrantTier: 1,
          choiceFocusUuid: "",
          acquiredAt: 0
        }));
      return {
        focusUuid: String(progress.focusUuid ?? progress.focusItemId ?? ""),
        ownedNodeIds,
        acquisitions: acquisitionRecords,
        provenance: progress.provenance === "creation" ? "creation" : "additional",
        initialChoicesGranted: progress.initialChoicesGranted === true,
        attachedAt: Number.isInteger(progress.attachedAt) ? progress.attachedAt : 0
      };
    });
  }
  if (source.advancement && typeof source.advancement === "object") {
    source.advancement = normalizeAdvancement(source.advancement as Record<string, unknown>, partial);
  }
  if (source.recovery && typeof source.recovery === "object") {
    const recovery = source.recovery as Record<string, unknown>;
    source.recovery = partial && !hasOwn(recovery, "bonus")
      ? {...recovery}
      : {...recovery, bonus: Number.isInteger(recovery.bonus) ? recovery.bonus : 0};
  }
  if (source.creation && typeof source.creation === "object") {
    source.creation = normalizeCreation(source.creation as Record<string, unknown>, partial);
  }
  return source;
}

import type {ItemSnapshot} from "../packages/package-types";
import type {GenreAbilityEntry} from "./genre-types";

export const GENRE_MINIMUM_TIER_MIN = 1;
export const GENRE_MINIMUM_TIER_MAX = 6;

export class GenreCatalogError extends Error {
  constructor(readonly code: "entry-missing" | "invalid-minimum-tier", message: string) {
    super(message);
    this.name = "GenreCatalogError";
  }
}

export function normalizeGenreMinimumTier(value: unknown): number {
  const tier = Number(value);
  if (
    !Number.isInteger(tier)
    || tier < GENRE_MINIMUM_TIER_MIN
    || tier > GENRE_MINIMUM_TIER_MAX
  ) {
    throw new GenreCatalogError(
      "invalid-minimum-tier",
      `Genre Ability Minimum Tier must be an integer from ${GENRE_MINIMUM_TIER_MIN} to ${GENRE_MINIMUM_TIER_MAX}.`
    );
  }
  return tier;
}

/** Replace only one entry's tier while preserving UUID, snapshot, order, and every sibling entry. */
export function updateGenreMinimumTier(
  catalog: readonly GenreAbilityEntry[],
  entryId: string,
  value: unknown
): readonly GenreAbilityEntry[] {
  const minimumTier = normalizeGenreMinimumTier(value);
  let found = false;
  const updated = catalog.map((entry) => {
    if (entry.id !== entryId) return entry;
    found = true;
    return {...entry, minimumTier};
  });
  if (!found) throw new GenreCatalogError("entry-missing", "Genre Ability catalog entry not found.");
  return updated;
}

/** Refresh source-derived data without reconstructing tier or identity fields. */
export function updateGenreAbilitySnapshot(
  catalog: readonly GenreAbilityEntry[],
  entryId: string,
  snapshot: ItemSnapshot
): readonly GenreAbilityEntry[] {
  let found = false;
  const updated = catalog.map((entry) => {
    if (entry.id !== entryId) return entry;
    found = true;
    return {...entry, snapshot};
  });
  if (!found) throw new GenreCatalogError("entry-missing", "Genre Ability catalog entry not found.");
  return updated;
}

export function removeGenreAbilityEntry(
  catalog: readonly GenreAbilityEntry[],
  entryId: string
): readonly GenreAbilityEntry[] {
  return catalog.filter((entry) => entry.id !== entryId);
}

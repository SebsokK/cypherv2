import type {GenreDocumentLike} from "./genre-types";

export interface LegacyTypeGenreData {
  readonly genre?: string;
  readonly customGenreId?: string;
}

function key(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function legacyGenreSuggestion(
  type: LegacyTypeGenreData,
  genres: readonly GenreDocumentLike[]
): GenreDocumentLike | null {
  const legacy = type.genre === "custom" ? String(type.customGenreId ?? "") : String(type.genre ?? "");
  if (!legacy || legacy === "none") return null;
  const ordered = [...genres].sort((left, right) => left.uuid.localeCompare(right.uuid));
  return ordered.find((genre) => genre.uuid === legacy)
    ?? ordered.find((genre) => key(genre.system.legacyKey) === key(legacy))
    ?? ordered.find((genre) => key(String((genre.system as unknown as {slug?: string}).slug ?? "")) === key(legacy))
    ?? ordered.find((genre) => key(genre.name) === key(legacy))
    ?? null;
}

export function legacyGenreMigrationCandidate(
  currentGenreUuid: string,
  type: LegacyTypeGenreData,
  genres: readonly GenreDocumentLike[]
): GenreDocumentLike | null {
  return currentGenreUuid ? null : legacyGenreSuggestion(type, genres);
}

export async function resolveLegacyGenreSuggestion(
  type: LegacyTypeGenreData,
  genres: readonly GenreDocumentLike[],
  resolve: (uuid: string) => Promise<GenreDocumentLike | null>
): Promise<GenreDocumentLike | null> {
  if (type.genre === "custom" && type.customGenreId) {
    const direct = await resolve(type.customGenreId);
    if (direct?.type === "genre") return direct;
  }
  return legacyGenreSuggestion(type, genres);
}

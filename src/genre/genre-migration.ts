import {resolveLegacyGenreSuggestion} from "./genre-suggestion";
import type {GenreDocumentLike} from "./genre-types";
import type {GenreCharacterLike} from "../services/genre-service";

/** One-time, idempotent bridge from embedded Type suggestions to Character authority. */
export async function migrateLegacyTypeGenres(): Promise<void> {
  if (!game.user.isGM) return;
  const genres = [...game.items].filter((item) => item.type === "genre") as unknown as GenreDocumentLike[];
  if (!genres.length) return;
  for (const actor of game.actors) {
    try {
      if (actor.type !== "character") continue;
      const character = actor as unknown as GenreCharacterLike;
      const type = [...actor.items].find((item) => item.type === "characterType");
      if (!type || character.system.genre.sourceUuid) continue;
      const suggestion = await resolveLegacyGenreSuggestion(
        type.system as {genre?: string; customGenreId?: string},
        genres,
        async (uuid) => await fromUuid(uuid) as GenreDocumentLike | null
      );
      if (!suggestion) continue;
      await game.cypherv2.services.genres.attach(character, suggestion, "migration");
    } catch (error) {
      console.warn("cypherv2 | Could not migrate a legacy Type Genre suggestion", actor.uuid, error);
    }
  }
}

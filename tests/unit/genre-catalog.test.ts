import {describe, expect, it} from "vitest";

import {
  normalizeGenreMinimumTier,
  removeGenreAbilityEntry,
  updateGenreAbilitySnapshot,
  updateGenreMinimumTier
} from "../../src/genre/genre-catalog";
import type {GenreAbilityEntry} from "../../src/genre/genre-types";

function entry(id: string, minimumTier = 1): GenreAbilityEntry {
  return {
    id,
    abilityUuid: `Compendium.test.abilities.Item.${id}`,
    minimumTier,
    snapshot: {
      name: `Ability ${id}`,
      img: `${id}.svg`,
      system: {description: `<p>${id}</p>`, damage: Number(id.length)}
    }
  };
}

describe("Genre Ability catalog persistence", () => {
  it("stores numeric tiers by stable entry ID and preserves independent entries across reload", () => {
    const original = [entry("a"), entry("b")];
    const tierThree = updateGenreMinimumTier(original, "a", "3");
    const tierSix = updateGenreMinimumTier(tierThree, "b", 6);
    const reloaded = structuredClone(tierSix);

    expect(reloaded.map((candidate) => candidate.minimumTier)).toEqual([3, 6]);
    expect(reloaded.every((candidate) => typeof candidate.minimumTier === "number")).toBe(true);
    expect(reloaded.map((candidate) => candidate.id)).toEqual(["a", "b"]);
    expect(reloaded.map((candidate) => candidate.abilityUuid)).toEqual(
      original.map((candidate) => candidate.abilityUuid)
    );
    expect(reloaded.map((candidate) => candidate.snapshot)).toEqual(
      original.map((candidate) => candidate.snapshot)
    );
  });

  it("keeps tiers through Description/options edits, snapshot refresh, and sibling removal", () => {
    const catalog = updateGenreMinimumTier([entry("a"), entry("b")], "a", 3);
    const genre = {
      description: "Old",
      options: {totalEffortCapMode: "core"},
      abilityCatalog: catalog
    };

    genre.description = "New";
    genre.options = {totalEffortCapMode: "unlimited"};
    genre.abilityCatalog = updateGenreAbilitySnapshot(
      genre.abilityCatalog,
      "a",
      {name: "Ability A refreshed", system: {description: "Refreshed"}}
    );
    expect(genre.abilityCatalog.map((candidate) => candidate.minimumTier)).toEqual([3, 1]);
    expect(genre.abilityCatalog[0]).toMatchObject({
      id: "a",
      abilityUuid: "Compendium.test.abilities.Item.a",
      minimumTier: 3,
      snapshot: {name: "Ability A refreshed"}
    });

    genre.abilityCatalog = removeGenreAbilityEntry(genre.abilityCatalog, "b");
    expect(genre.abilityCatalog).toHaveLength(1);
    expect(genre.abilityCatalog[0]?.minimumTier).toBe(3);
  });

  it("rejects invalid tiers without mutating or resetting any catalog entry", () => {
    const catalog = [entry("a", 3), entry("b", 6)];
    const before = structuredClone(catalog);
    for (const value of [0, 7, 2.5, "", "not-a-tier"]) {
      expect(() => updateGenreMinimumTier(catalog, "a", value))
        .toThrow("Genre Ability Minimum Tier must be an integer from 1 to 6");
      expect(catalog).toEqual(before);
    }
    expect(normalizeGenreMinimumTier("4")).toBe(4);
  });
});

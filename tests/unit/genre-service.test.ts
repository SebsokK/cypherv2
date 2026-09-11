import {describe, expect, it, vi} from "vitest";

import type {GenreDocumentLike} from "../../src/genre/genre-types";
import {legacyGenreMigrationCandidate, legacyGenreSuggestion, resolveLegacyGenreSuggestion} from "../../src/genre/genre-suggestion";
import {GenreChoiceError, GenreService, type GenreCharacterLike} from "../../src/services/genre-service";

function genre(overrides: Partial<GenreDocumentLike["system"]> = {}): GenreDocumentLike {
  return {
    id: "genre-1",
    uuid: "Item.genre-1",
    name: "Superhero",
    type: "genre",
    img: "genre.svg",
    system: {
      description: "<p>Genre text</p>",
      abilityCatalog: [{
        id: "entry-1",
        abilityUuid: "Item.ability-1",
        minimumTier: 3,
        snapshot: {name: "Power Shift", img: "power.svg", system: {description: "<p>Power</p>", tier: 3}}
      }],
      options: {totalEffortCapMode: "unlimited"},
      legacyKey: "superhero",
      ...overrides
    }
  };
}

function actor(): GenreCharacterLike & {documents: any[]; updates: Record<string, unknown>[]} {
  const documents: any[] = [];
  const updates: Record<string, unknown>[] = [];
  const value: any = {
    id: "actor-1",
    uuid: "Actor.actor-1",
    name: "Hero",
    type: "character",
    items: documents,
    documents,
    updates,
    system: {
      tier: 3,
      genre: {sourceUuid: "", instanceId: "", provenance: "manual", attachedAt: 0},
      advancement: {pendingGenreChoices: [{id: "choice-1", source: "newTier", grantTier: 3}]}
    },
    async update(changes: Record<string, unknown>) {
      updates.push(changes);
      for (const [path, next] of Object.entries(changes)) {
        const parts = path.replace(/^system\./, "").split(".");
        let cursor = value.system as Record<string, any>;
        for (const part of parts.slice(0, -1)) cursor = cursor[part];
        cursor[parts.at(-1)!] = structuredClone(next);
      }
      return value;
    },
    async createEmbeddedDocuments(_type: string, data: Record<string, unknown>[]) {
      const created = data.map((entry, index) => {
        const document: any = {
          id: `created-${index}`,
          ...structuredClone(entry),
          async update(changes: Record<string, unknown>) {
            for (const [path, next] of Object.entries(changes)) {
              const parts = path.split(".");
              let cursor = document as Record<string, any>;
              for (const part of parts.slice(0, -1)) cursor = cursor[part];
              cursor[parts.at(-1)!] = structuredClone(next);
            }
            return document;
          },
          async delete() { documents.splice(documents.indexOf(document), 1); }
        };
        return document;
      });
      documents.push(...created);
      return created;
    }
  };
  return value;
}

function service(activeGenre = genre()): GenreService {
  return new GenreService(
    async (uuid) => uuid === activeGenre.uuid ? activeGenre : null,
    async (uuid) => uuid === "Item.ability-1" ? {
      uuid,
      name: "Power Shift",
      type: "ability",
      img: "power.svg",
      system: {description: "<p>Authoritative source</p>", activation: "passive"}
    } : null,
    () => "genre-instance",
    () => 1234
  );
}

describe("GenreService", () => {
  it("keeps future Origin entries distinct from ordinary Genre progression", async () => {
    const character = actor();
    await character.update({"system.genre.sourceUuid": "Item.genre-1"});
    const sourceGenre = genre({abilityCatalog: [
      ...genre().system.abilityCatalog,
      {
        id: "origin-armored-body",
        abilityUuid: "Item.armored-body",
        minimumTier: 1,
        catalog: "origin",
        minimumSuperheroRank: 2,
        snapshot: {name: "Armored Body", system: {description: "<p>Origin</p>"}}
      }
    ]});
    const genres = service(sourceGenre);
    expect(genres.eligibleEntries(character, sourceGenre, character.system.advancement.pendingGenreChoices[0]!))
      .toHaveLength(1);
    expect(genres.manualCatalog(character, sourceGenre).map((entry) => entry.id)).toEqual(["entry-1"]);
    await expect(genres.acquireManual(character, "origin-armored-body"))
      .rejects.toThrow("not part of Genre progression");
  });

  it("attaches exactly one authoritative Genre reference and replaces it explicitly", async () => {
    const character = actor();
    const first = genre();
    const genres = service(first);
    await genres.attach(character, first, "manual");
    expect(character.system.genre).toEqual({
      sourceUuid: first.uuid,
      instanceId: "genre-instance",
      provenance: "manual",
      attachedAt: 1234
    });
    await expect(genres.attach(character, first)).rejects.toMatchObject({code: "duplicate"});

    const second = {...genre(), id: "genre-2", uuid: "Item.genre-2", name: "Horror"} as GenreDocumentLike;
    await genres.attach(character, second, "typeSuggestion");
    expect(character.system.genre).toMatchObject({sourceUuid: second.uuid, provenance: "typeSuggestion"});
  });

  it("keeps acquired Abilities when the Genre association is removed", async () => {
    const character = actor();
    const genres = service();
    await genres.attach(character, genre());
    character.documents.push({id: "ability", type: "ability", name: "Retained", system: {grantedBy: {kind: "genre"}}});
    await genres.remove(character);
    expect(character.system.genre.sourceUuid).toBe("");
    expect(character.documents.map((item) => item.name)).toEqual(["Retained"]);
  });

  it("spends exactly one pending choice and grants a normal embedded Ability with Genre provenance", async () => {
    const character = actor();
    const sourceGenre = genre();
    const genres = service(sourceGenre);
    await genres.attach(character, sourceGenre);

    const result = await genres.acquire(character, "choice-1", "entry-1");
    expect(result).toMatchObject({abilityCreated: true, conflictOverridden: false});
    expect(character.system.advancement.pendingGenreChoices).toEqual([]);
    expect(character.documents).toHaveLength(1);
    expect(character.documents[0]).toMatchObject({
      type: "ability",
      name: "Power Shift",
      system: {
        description: "<p>Authoritative source</p>",
        grantedBy: {
          kind: "genre",
          sourceUuid: sourceGenre.uuid,
          instanceId: "genre-instance",
          grantId: "entry-1",
          contentUuid: "Item.ability-1"
        }
      }
    });
    await expect(genres.acquire(character, "choice-1", "entry-1"))
      .rejects.toBeInstanceOf(GenreChoiceError);
  });

  it("never treats a non-Ability UUID target as the authoritative catalog source", async () => {
    const character = actor();
    const sourceGenre = genre();
    const genres = new GenreService(
      async (uuid) => uuid === sourceGenre.uuid ? sourceGenre : null,
      async (uuid) => ({
        uuid,
        name: "Wrong Document",
        type: "skill",
        system: {description: "This must not replace the Ability snapshot."}
      }),
      () => "genre-instance",
      () => 1234
    );
    await genres.attach(character, sourceGenre);

    await genres.acquire(character, "choice-1", "entry-1");
    expect(character.documents[0]).toMatchObject({
      type: "ability",
      name: "Power Shift",
      system: {description: "<p>Power</p>", tier: 3}
    });
  });

  it("does not consume a choice when no Genre is attached or an entry is ineligible", async () => {
    const character = actor();
    const genres = service();
    await expect(genres.acquire(character, "choice-1", "entry-1"))
      .rejects.toMatchObject({code: "genre-required"});
    expect(character.system.advancement.pendingGenreChoices).toHaveLength(1);

    await genres.attach(character, genre());
    (character.system as {tier: number}).tier = 2;
    await expect(genres.acquire(character, "choice-1", "entry-1"))
      .rejects.toMatchObject({code: "entry-ineligible"});
    expect(character.system.advancement.pendingGenreChoices).toHaveLength(1);
  });

  it("routes duplicate Ability acquisition through the existing Grant Conflict resolver", async () => {
    const character = actor();
    const sourceGenre = genre();
    const genres = service(sourceGenre);
    await genres.attach(character, sourceGenre);
    character.documents.push({
      id: "existing",
      type: "ability",
      name: "Power Shift",
      system: {grantedBy: {contentUuid: "Item.ability-1", contentKey: "ability:power shift"}}
    });
    await expect(genres.acquire(character, "choice-1", "entry-1"))
      .rejects.toMatchObject({code: "duplicate-grant"});
    const resolver = vi.fn(async () => ({action: "gmOverride" as const}));
    const result = await genres.acquire(character, "choice-1", "entry-1", resolver);
    expect(resolver).toHaveBeenCalledWith(expect.objectContaining({context: "genre"}));
    expect(result).toMatchObject({abilityCreated: false, conflictOverridden: true});
    expect(character.documents).toHaveLength(1);
  });

  it("manually acquires higher-Tier catalog Abilities without consuming pending choices", async () => {
    const character = actor();
    (character.system as {tier: number}).tier = 1;
    const sourceGenre = genre();
    const genres = service(sourceGenre);
    await genres.attach(character, sourceGenre);
    const pendingBefore = structuredClone(character.system.advancement.pendingGenreChoices);

    const catalog = genres.manualCatalog(character, sourceGenre);
    expect(catalog[0]).toMatchObject({minimumTier: 3, normallyAvailable: false, owned: false});
    await genres.acquireManual(character, "entry-1");

    expect(character.system.advancement.pendingGenreChoices).toEqual(pendingBefore);
    expect(genres.manualCatalog(character, sourceGenre)[0]?.owned).toBe(true);
    expect(character.documents[0]).toMatchObject({
      system: {grantedBy: {
        kind: "genre", sourceUuid: sourceGenre.uuid, instanceId: "genre-instance", grantId: "entry-1"
      }}
    });
  });

  it("undoes manual Genre ownership while allowing the embedded Ability to be kept or deleted", async () => {
    const character = actor();
    const sourceGenre = genre();
    const genres = service(sourceGenre);
    await genres.attach(character, sourceGenre);
    await genres.acquireManual(character, "entry-1");

    expect(await genres.undoManual(character, "entry-1", false)).toEqual({
      abilityDeleted: false, abilityRetained: true
    });
    expect(character.documents).toHaveLength(1);
    expect(character.documents[0].system.grantedBy.status).toBe("retained");
    expect(genres.manualCatalog(character, sourceGenre)[0]?.owned).toBe(false);

    await genres.acquireManual(character, "entry-1");
    expect(character.documents[0].system.grantedBy.status).toBe("active");
    expect(await genres.undoManual(character, "entry-1", true)).toEqual({
      abilityDeleted: true, abilityRetained: false
    });
    expect(character.documents).toEqual([]);
  });

  it("matches legacy Type suggestions deterministically without overriding Character data", () => {
    const fantasy = {...genre(), id: "b", uuid: "Item.b", name: "Fantasy", system: {...genre().system, legacyKey: "fantasy"}} as GenreDocumentLike;
    const duplicate = {...fantasy, id: "a", uuid: "Item.a"} as GenreDocumentLike;
    expect(legacyGenreSuggestion({genre: "fantasy"}, [fantasy, duplicate])?.uuid).toBe("Item.a");
    expect(legacyGenreSuggestion({genre: "none"}, [fantasy])).toBeNull();
    expect(legacyGenreMigrationCandidate("Item.explicit", {genre: "fantasy"}, [fantasy])).toBeNull();
  });

  it("resolves a legacy custom Type suggestion by UUID, including compendium sources", async () => {
    const compendium = {...genre(), uuid: "Compendium.cypherv2.genres.Item.hero"} as GenreDocumentLike;
    const resolve = vi.fn(async (uuid: string) => uuid === compendium.uuid ? compendium : null);
    await expect(resolveLegacyGenreSuggestion(
      {genre: "custom", customGenreId: compendium.uuid},
      [],
      resolve
    )).resolves.toBe(compendium);
  });
});

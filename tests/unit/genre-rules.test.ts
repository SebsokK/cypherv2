import {describe, expect, it} from "vitest";

import {effectiveGenre, totalEffortCap} from "../../src/genre/genre-rules";
import type {GenreDocumentLike} from "../../src/genre/genre-types";

describe("Genre rules", () => {
  it("defaults no Genre/Core mode to cap 6 and represents Unlimited without a numeric ceiling", () => {
    expect(totalEffortCap(undefined)).toBe(6);
    expect(totalEffortCap("core")).toBe(6);
    expect(totalEffortCap("unlimited")).toBeNull();
  });

  it("reads options from the authoritative Genre source rather than the Character association", () => {
    const document = {
      id: "genre",
      uuid: "Item.genre",
      name: "Superhero",
      type: "genre",
      system: {
        description: "",
        abilityCatalog: [],
        options: {totalEffortCapMode: "unlimited"},
        legacyKey: "superhero"
      }
    } satisfies GenreDocumentLike;
    const association = {
      sourceUuid: document.uuid,
      instanceId: "instance",
      provenance: "manual" as const,
      attachedAt: 1
    };
    expect(effectiveGenre(association, () => document)).toEqual({
      sourceUuid: document.uuid,
      name: document.name,
      totalEffortCapMode: "unlimited"
    });
    expect(effectiveGenre({...association, sourceUuid: ""}, () => document)).toBeNull();
  });
});

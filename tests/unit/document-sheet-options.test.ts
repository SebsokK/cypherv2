import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";

import {DOCUMENT_SHEET_FORM_OPTIONS} from "../../src/applications/sheets/document-sheet-options";

describe("Application V2 document sheet form options", () => {
  beforeAll(() => {
    class MockDocumentSheet {}

    vi.stubGlobal("foundry", {
      applications: {
        api: {
          HandlebarsApplicationMixin: (base: typeof MockDocumentSheet) => base
        },
        sheets: {
          ActorSheetV2: MockDocumentSheet,
          ItemSheetV2: MockDocumentSheet
        }
      }
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("uses a native top-level form and persists changed fields", () => {
    expect(DOCUMENT_SHEET_FORM_OPTIONS).toEqual({
      tag: "form",
      form: {
        closeOnSubmit: false,
        submitOnChange: true
      }
    });
  });

  it("applies the native form behavior to every document sheet", async () => {
    const [{CharacterSheet}, {NpcSheet}, {CypherV2ItemSheet}] = await Promise.all([
      import("../../src/applications/sheets/character-sheet"),
      import("../../src/applications/sheets/npc-sheet"),
      import("../../src/applications/sheets/item-sheet")
    ]);

    for (const SheetClass of [CharacterSheet, NpcSheet, CypherV2ItemSheet]) {
      expect(SheetClass.DEFAULT_OPTIONS).toMatchObject(DOCUMENT_SHEET_FORM_OPTIONS);
    }
  });
});

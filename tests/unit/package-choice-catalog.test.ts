import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it, vi} from "vitest";
import {
  discoverAvailableDescriptors,
  PUBLIC_DESCRIPTOR_PACK_ID,
  resolveDescriptorChoiceCatalogs,
  type DescriptorCatalogDocumentLike
} from "../../src/packages/package-choice-catalog";
import type {DescriptorChoiceGroup} from "../../src/packages/package-types";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const coreSource = JSON.parse(await readFile(
  path.join(projectRoot, "content/core-items/reviewed-packs.json"),
  "utf8"
));

function descriptor(uuid: string, name: string): DescriptorCatalogDocumentLike {
  return {
    uuid,
    name,
    type: "descriptor",
    img: "icons/svg/book.svg",
    system: {description: `<p>${name}</p>`}
  };
}

function catalogGroup(): DescriptorChoiceGroup {
  return {
    id: "heritage",
    choose: 1,
    sourceMode: "catalog",
    catalogItemType: "descriptor",
    options: []
  };
}

describe("dynamic package choice catalogs", () => {
  it("resolves all 33 current public Descriptors without changing the catalog rule", () => {
    const publicDescriptors = coreSource.packs.descriptors.documents.map((document: any) => ({
      ...document,
      uuid: `Compendium.${PUBLIC_DESCRIPTOR_PACK_ID}.Item.${document._id}`
    }));
    const sourceGroup = catalogGroup();
    const [resolved] = resolveDescriptorChoiceCatalogs([sourceGroup], publicDescriptors);

    expect(resolved?.options).toHaveLength(33);
    expect(new Set(resolved?.options.map((option) => option.descriptorUuid)).size).toBe(33);
    expect(sourceGroup).toEqual(catalogGroup());
    expect(sourceGroup.options).toEqual([]);
  });

  it("grows and shrinks from the 33-system-Descriptor catalog with supported World content without modifying the package", () => {
    const sourceGroup = catalogGroup();
    const publicDescriptors = coreSource.packs.descriptors.documents.map((document: any) => ({
      ...document,
      uuid: `Compendium.${PUBLIC_DESCRIPTOR_PACK_ID}.Item.${document._id}`
    }));
    const customDescriptor = descriptor("Item.world-custom", "World Custom");

    expect(resolveDescriptorChoiceCatalogs([sourceGroup], publicDescriptors)[0]?.options).toHaveLength(33);
    expect(resolveDescriptorChoiceCatalogs([sourceGroup], [...publicDescriptors, customDescriptor])[0]?.options).toHaveLength(34);
    expect(resolveDescriptorChoiceCatalogs([sourceGroup], publicDescriptors)[0]?.options).toHaveLength(33);
    expect(sourceGroup.options).toEqual([]);
  });

  it("discovers the canonical system pack plus World Descriptor Items", async () => {
    const publicDescriptor = descriptor("Compendium.cypherv2.descriptors.Item.fast", "Fast");
    const worldDescriptor = descriptor("Item.world-custom", "World Custom");
    const ignoredWorldItem = {...descriptor("Item.skill", "Not a Descriptor"), type: "skill"};
    let requestedPack = "";
    vi.stubGlobal("game", {
      items: [worldDescriptor, ignoredWorldItem],
      packs: {
        get(id: string) {
          requestedPack = id;
          return {async getDocuments() { return [publicDescriptor]; }};
        }
      }
    });
    try {
      expect((await discoverAvailableDescriptors()).map((document) => document.uuid)).toEqual([
        publicDescriptor.uuid,
        worldDescriptor.uuid
      ]);
      expect(requestedPack).toBe(PUBLIC_DESCRIPTOR_PACK_ID);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("deduplicates stable UUIDs but preserves same-name documents with different UUIDs", () => {
    const first = descriptor("Item.first", "Shared Name");
    const duplicate = {...first, system: {description: "duplicate"}};
    const distinct = descriptor("Item.second", "Shared Name");
    const [resolved] = resolveDescriptorChoiceCatalogs([catalogGroup()], [first, duplicate, distinct]);

    expect(resolved?.options.map((option) => option.descriptorUuid)).toEqual(["Item.first", "Item.second"]);
    expect(resolved?.options.map((option) => option.snapshot.name)).toEqual(["Shared Name", "Shared Name"]);
  });

  it("leaves legacy and explicit fixed groups unchanged", () => {
    const fixed: DescriptorChoiceGroup = {
      id: "fixed",
      choose: 1,
      options: [{id: "fast", descriptorUuid: "Item.fast", snapshot: {name: "Fast", system: {}}}]
    };
    const [resolved] = resolveDescriptorChoiceCatalogs([fixed], [descriptor("Item.other", "Other")]);
    expect(resolved).toBe(fixed);
    expect(resolved?.options.map((option) => option.descriptorUuid)).toEqual(["Item.fast"]);
  });
});

import type {DescriptorChoiceGroup, DescriptorGrant, ItemSnapshot} from "./package-types";

export const PUBLIC_DESCRIPTOR_PACK_ID = "cypherv2.descriptors";

export interface DescriptorCatalogDocumentLike {
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly img?: string;
  readonly system: Record<string, unknown>;
  toObject?(): Record<string, unknown>;
}

interface DescriptorCatalogPackLike {
  getDocuments(): Promise<readonly DescriptorCatalogDocumentLike[]>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function snapshot(document: DescriptorCatalogDocumentLike): ItemSnapshot {
  const source = document.toObject?.() ?? {};
  return {
    name: String(source.name ?? document.name),
    ...(String(source.img ?? document.img ?? "") ? {img: String(source.img ?? document.img)} : {}),
    system: clone((source.system ?? document.system) as Record<string, unknown>)
  };
}

function compareDocuments(left: DescriptorCatalogDocumentLike, right: DescriptorCatalogDocumentLike): number {
  const leftName = left.name.toLocaleLowerCase();
  const rightName = right.name.toLocaleLowerCase();
  if (leftName < rightName) return -1;
  if (leftName > rightName) return 1;
  return left.uuid < right.uuid ? -1 : left.uuid > right.uuid ? 1 : 0;
}

/** Resolve catalog-backed Descriptor groups without mutating or persisting their source definitions. */
export function resolveDescriptorChoiceCatalogs(
  groups: readonly DescriptorChoiceGroup[],
  availableDescriptors: readonly DescriptorCatalogDocumentLike[]
): DescriptorChoiceGroup[] {
  const descriptorsByUuid = new Map<string, DescriptorCatalogDocumentLike>();
  for (const document of availableDescriptors) {
    if (document.type !== "descriptor" || !document.uuid || descriptorsByUuid.has(document.uuid)) continue;
    descriptorsByUuid.set(document.uuid, document);
  }
  const catalogOptions: DescriptorGrant[] = [...descriptorsByUuid.values()]
    .sort(compareDocuments)
    .map((document) => ({
      id: document.uuid,
      descriptorUuid: document.uuid,
      snapshot: snapshot(document)
    }));

  return groups.map((group) => {
    if ((group.sourceMode ?? "fixed") !== "catalog") return group;
    return {
      ...group,
      options: group.catalogItemType === "descriptor" ? catalogOptions : []
    };
  });
}

/** Foundry-facing discovery deliberately covers the canonical system pack and World Items. */
export async function discoverAvailableDescriptors(): Promise<DescriptorCatalogDocumentLike[]> {
  const foundryGame = game as unknown as {
    readonly items: Iterable<DescriptorCatalogDocumentLike>;
    readonly packs?: {get(id: string): DescriptorCatalogPackLike | undefined};
  };
  const publicPack = foundryGame.packs?.get(PUBLIC_DESCRIPTOR_PACK_ID);
  const publicDocuments = publicPack ? await publicPack.getDocuments() : [];
  const worldDocuments = [...foundryGame.items].filter((document) => document.type === "descriptor");
  return [...publicDocuments, ...worldDocuments];
}

export async function prepareDescriptorChoiceGroups(
  groups: readonly DescriptorChoiceGroup[]
): Promise<DescriptorChoiceGroup[]> {
  if (!groups.some((group) => (group.sourceMode ?? "fixed") === "catalog")) return [...groups];
  return resolveDescriptorChoiceCatalogs(groups, await discoverAvailableDescriptors());
}

import type {ItemSnapshot} from "../packages/package-types";

export const GENRE_EFFORT_CAP_MODES = ["core", "unlimited"] as const;
export const GENRE_ASSOCIATION_PROVENANCES = ["manual", "typeSuggestion", "migration"] as const;

export type GenreEffortCapMode = (typeof GENRE_EFFORT_CAP_MODES)[number];
export type GenreAssociationProvenance = (typeof GENRE_ASSOCIATION_PROVENANCES)[number];

export interface GenreAssociationData {
  readonly sourceUuid: string;
  readonly instanceId: string;
  readonly provenance: GenreAssociationProvenance;
  readonly attachedAt: number;
}

export interface GenreAbilityEntry {
  readonly id: string;
  readonly abilityUuid: string;
  readonly minimumTier: number;
  readonly snapshot: ItemSnapshot;
}

export interface GenreSystemData {
  readonly description: string;
  readonly abilityCatalog: readonly GenreAbilityEntry[];
  readonly options: {readonly totalEffortCapMode: GenreEffortCapMode};
  /** Compatibility key used only to match old Type genre suggestions. */
  readonly legacyKey: string;
}

export interface GenreDocumentLike {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly type: "genre";
  readonly img?: string;
  readonly system: GenreSystemData;
  readonly sheet?: {render(force?: boolean): unknown};
}

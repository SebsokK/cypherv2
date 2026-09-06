import type {GrantedByData} from "./package-types";

export type GrantContentType = "ability" | "skill";

export interface GrantIdentity {
  readonly type: GrantContentType;
  readonly contentUuid: string;
  readonly contentKey: string;
}

export interface GrantDocumentLike {
  readonly type: string;
  readonly name: string;
  readonly system: Record<string, unknown>;
}

export interface GrantConflictDocument {
  readonly id: string;
  readonly name: string;
  readonly type: GrantContentType;
  readonly rank: string;
  readonly contentUuid: string;
  readonly contentKey: string;
}

export interface GrantReplacementOption {
  readonly id: string;
  readonly type: GrantContentType;
  readonly name: string;
  readonly itemUuid: string;
  readonly snapshot: {readonly name: string; readonly img?: string; readonly system: Record<string, unknown>};
  readonly reason: string;
  readonly reasonSourceUuid: string;
  readonly custom?: boolean;
}

export interface GrantConflict {
  readonly id: string;
  readonly type: GrantContentType;
  readonly packageName: string;
  readonly packageSourceUuid: string;
  readonly grantId: string;
  readonly existing: GrantConflictDocument;
  readonly proposed: GrantConflictDocument;
  readonly suggestions: readonly GrantReplacementOption[];
  readonly allowCustom: boolean;
  readonly allowSuppress: boolean;
  readonly allowGmOverride: boolean;
  readonly context: "package" | "focus" | "genre";
}

export type GrantConflictResolution =
  | {readonly action: "suppress"}
  | {readonly action: "replace"; readonly replacement: GrantReplacementOption; readonly selectionKind: "suggested" | "world" | "compendium" | "custom"}
  | {readonly action: "gmOverride"}
  | {readonly action: "cancel"};

export type GrantConflictResolver = (conflict: GrantConflict) => Promise<GrantConflictResolution>;

export class GrantConflictCancelledError extends Error {
  constructor() {
    super("Grant conflict resolution was cancelled.");
    this.name = "GrantConflictCancelledError";
  }
}

export function normalizedContentKey(type: "ability" | "skill", name: string): string {
  return `${type}:${String(name ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")}`;
}

export function grantIdentity(type: "ability" | "skill", name: string, contentUuid = ""): GrantIdentity {
  return {type, contentUuid, contentKey: normalizedContentKey(type, name)};
}

export function documentGrantIdentity(document: GrantDocumentLike): GrantIdentity | null {
  if (document.type !== "ability" && document.type !== "skill") return null;
  const provenance = (document.system.grantedBy ?? {}) as Partial<GrantedByData>;
  return {
    type: document.type,
    contentUuid: String(provenance.contentUuid ?? ""),
    contentKey: String(provenance.contentKey || normalizedContentKey(document.type, document.name))
  };
}

export function sameGrant(left: GrantIdentity, right: GrantIdentity): boolean {
  if (left.type !== right.type) return false;
  if (left.contentUuid && right.contentUuid) return left.contentUuid === right.contentUuid;
  return left.contentKey === right.contentKey;
}

export function hasGrantConflict(documents: Iterable<GrantDocumentLike>, candidate: GrantIdentity): boolean {
  return Boolean(findGrantConflict(documents, candidate));
}

export function findGrantConflict(documents: Iterable<GrantDocumentLike>, candidate: GrantIdentity): GrantDocumentLike | null {
  return [...documents].find((document) => {
    const existing = documentGrantIdentity(document);
    return existing ? sameGrant(existing, candidate) : false;
  }) ?? null;
}

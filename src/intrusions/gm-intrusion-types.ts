export type GMIntrusionMode = "targeted" | "group" | "free";

export interface GMIntrusionPolicy {
  readonly targetedXpToTarget: number;
  readonly targetedXpToShare: number;
  readonly groupXpPerTarget: number;
  readonly freeXp: number;
}

export interface GMIntrusionTarget {
  readonly actorId: string;
  readonly actorName: string;
  readonly actorImage?: string;
}

/** Ephemeral runtime state. It is never written to a Document or world setting. */
export interface GMIntrusionRecord {
  readonly id: string;
  readonly mode: GMIntrusionMode;
  readonly targets: readonly GMIntrusionTarget[];
  readonly targetXp: number;
  readonly sharedXp: number;
  readonly naturalRoll: number;
}

/** The only persisted intrusion state: an unresolved second-XP obligation. */
export interface PendingGMIntrusionXP {
  readonly intrusionId: string;
  readonly messageId: string;
  readonly sourceActorId: string;
  readonly amount: number;
  readonly responderUserId?: string;
}

export interface GMIntrusionRecipient {
  readonly actorId: string;
  readonly actorName: string;
  readonly actorImage: string;
}

export interface GMIntrusionChatState {
  readonly kind: "gm-intrusion";
  readonly intrusionId: string;
  readonly mode: GMIntrusionMode;
  readonly sourceActorId: string;
  readonly sourceActorName: string;
  readonly targetXp: number;
  readonly sharedXp: number;
  readonly status: "pending" | "resolving" | "resolved";
  readonly recipients: readonly GMIntrusionRecipient[];
  /** Immutable presentation snapshots of the Characters affected by the transaction. */
  readonly affectedCharacters?: readonly GMIntrusionRecipient[];
  readonly resolvedRecipient?: GMIntrusionRecipient;
}

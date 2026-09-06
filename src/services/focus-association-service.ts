import type {PendingFocusChoice} from "../advancement/advancement-types";
import type {FocusDocumentLike, FocusProgress} from "../focus/focus-types";
import {effectiveTier} from "../rules/core/character-overrides";

export type FocusAssociationProvenance = "creation" | "additional";
export type FocusAssociationErrorCode =
  | "not-character"
  | "not-focus"
  | "duplicate"
  | "creation-tier"
  | "creation-focus-exists"
  | "progress-missing";

export class FocusAssociationError extends Error {
  constructor(readonly code: FocusAssociationErrorCode, message: string) {
    super(message);
    this.name = "FocusAssociationError";
  }
}

export interface FocusAssociationCharacterLike {
  readonly id: string;
  readonly uuid?: string;
  readonly type: string;
  readonly system: {
    readonly tier: number;
    readonly focusProgress: readonly FocusProgress[];
    readonly advancement: {
      readonly pendingFocusChoices: readonly PendingFocusChoice[];
      readonly initializedFocusUuids: readonly string[];
    };
  };
  update(changes: Record<string, unknown>): Promise<unknown>;
}

export interface FocusAttachResult {
  readonly progress: FocusProgress;
  readonly choicesGranted: readonly PendingFocusChoice[];
}

export interface FocusRemoveResult {
  readonly progress: FocusProgress;
  readonly removedPendingChoiceIds: readonly string[];
}

type IdFactory = () => string;
const defaultIdFactory: IdFactory = () => globalThis.crypto?.randomUUID?.()
  ?? `focus-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class FocusAssociationService {
  readonly #idFactory: IdFactory;
  readonly #now: () => number;
  readonly #operations = new Map<string, Promise<unknown>>();

  constructor(idFactory: IdFactory = defaultIdFactory, now: () => number = Date.now) {
    this.#idFactory = idFactory;
    this.#now = now;
  }

  async attach(
    actor: FocusAssociationCharacterLike,
    focus: FocusDocumentLike,
    provenance: FocusAssociationProvenance
  ): Promise<FocusAttachResult> {
    return this.#exclusive(actor, async () => {
      this.#assert(actor, focus);
      if (actor.system.focusProgress.some((entry) => this.#matches(entry, focus))) {
        throw new FocusAssociationError("duplicate", "This Focus is already attached.");
      }
      if (provenance === "creation") {
        if (effectiveTier(actor.system) !== 1) {
          throw new FocusAssociationError("creation-tier", "A creation Focus requires a Tier 1 Character.");
        }
        if (actor.system.focusProgress.some((entry) => entry.provenance === "creation")) {
          throw new FocusAssociationError("creation-focus-exists", "This Character already has a creation Focus.");
        }
      }

      const alreadyInitialized = actor.system.advancement.initializedFocusUuids.includes(focus.uuid);
      const progress: FocusProgress = {
        focusUuid: focus.uuid,
        ownedNodeIds: [],
        acquisitions: [],
        provenance,
        initialChoicesGranted: !alreadyInitialized,
        attachedAt: this.#now()
      };
      const choiceSource = provenance === "creation" ? "characterCreation" : "additionalFocus";
      const choicesGranted: PendingFocusChoice[] = alreadyInitialized ? [] : Array.from({length: 2}, () => ({
        id: this.#idFactory(),
        source: choiceSource,
        grantTier: 1,
        focusUuid: focus.uuid
      }));
      await actor.update({
        "system.focusProgress": [...actor.system.focusProgress, progress],
        "system.advancement.pendingFocusChoices": [
          ...actor.system.advancement.pendingFocusChoices,
          ...choicesGranted
        ],
        "system.advancement.initializedFocusUuids": alreadyInitialized
          ? [...actor.system.advancement.initializedFocusUuids]
          : [...actor.system.advancement.initializedFocusUuids, focus.uuid]
      });
      return {progress, choicesGranted};
    });
  }

  async remove(actor: FocusAssociationCharacterLike, focusUuid: string): Promise<FocusRemoveResult> {
    return this.#exclusive(actor, async () => {
      if (actor.type !== "character") {
        throw new FocusAssociationError("not-character", "Focus association requires a Character.");
      }
      const progress = actor.system.focusProgress.find((entry) => entry.focusUuid === focusUuid);
      if (!progress) throw new FocusAssociationError("progress-missing", "Focus progression was not found.");
      const removedPendingChoiceIds = actor.system.advancement.pendingFocusChoices
        .filter((choice) => choice.focusUuid === focusUuid)
        .map((choice) => choice.id);
      await actor.update({
        "system.focusProgress": actor.system.focusProgress.filter((entry) => entry !== progress),
        "system.advancement.pendingFocusChoices": actor.system.advancement.pendingFocusChoices
          .filter((choice) => choice.focusUuid !== focusUuid)
      });
      return {progress, removedPendingChoiceIds};
    });
  }

  #assert(actor: FocusAssociationCharacterLike, focus: FocusDocumentLike): void {
    if (actor.type !== "character") {
      throw new FocusAssociationError("not-character", "Focus association requires a Character.");
    }
    if (focus.type !== "focus" || !focus.uuid) {
      throw new FocusAssociationError("not-focus", "Only a Focus Item can be attached.");
    }
  }

  #matches(progress: FocusProgress, focus: FocusDocumentLike): boolean {
    return progress.focusUuid === focus.uuid || progress.focusUuid === focus.id;
  }

  #key(actor: FocusAssociationCharacterLike): string {
    return actor.uuid ?? actor.id;
  }

  async #exclusive<T>(actor: FocusAssociationCharacterLike, operation: () => Promise<T>): Promise<T> {
    const key = this.#key(actor);
    const previous = this.#operations.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    this.#operations.set(key, current);
    try {
      return await current;
    } finally {
      if (this.#operations.get(key) === current) this.#operations.delete(key);
    }
  }
}

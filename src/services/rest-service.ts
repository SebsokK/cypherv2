import type {RestType} from "../constants/system";
import {
  assertLiving,
  cloneWounds,
  defaultIdFactory,
  type CharacterDocumentLike,
  type IdFactory,
  type RestHistoryEntry,
  type WoundCollection,
  type WoundRecordData
} from "../rules/core/core-types";

export type OneHourRestChoice = "remove-moderate" | "remove-minors";

export interface RestOptions {
  oneHourChoice?: OneHourRestChoice;
  removeMinorsInsteadOfOneModerate?: boolean;
  majorTaskSucceeded?: boolean;
}

export interface RestResult {
  type: RestType;
  wounds: WoundCollection;
  removed: WoundRecordData[];
  choice: string;
  majorTaskSucceeded: boolean;
}

export interface RestPreparation {
  result: RestResult;
  historyEntry: RestHistoryEntry;
}

export class RestService {
  readonly #idFactory: IdFactory;
  readonly #now: () => number;

  constructor(idFactory: IdFactory = defaultIdFactory, now: () => number = Date.now) {
    this.#idFactory = idFactory;
    this.#now = now;
  }

  rest(current: WoundCollection, type: RestType, options: RestOptions = {}): RestResult {
    const wounds = cloneWounds(current);
    const removed: WoundRecordData[] = [];
    let choice = "";

    if (type === "10-minutes") {
      removed.push(...wounds.minor);
      wounds.minor = [];
      choice = "remove-minors";
    } else if (type === "1-hour") {
      choice = options.oneHourChoice ?? "remove-moderate";
      if (choice === "remove-minors") {
        removed.push(...wounds.minor);
        wounds.minor = [];
      } else {
        const wound = wounds.moderate.pop();
        if (wound) removed.push(wound);
      }
    } else if (type === "10-hours") {
      const exchange = options.removeMinorsInsteadOfOneModerate === true
        && wounds.minor.length > 0
        && wounds.moderate.length > 0;
      choice = exchange ? "remove-minors-instead-of-one-moderate" : "remove-all-moderate";
      if (exchange) {
        removed.push(...wounds.minor);
        wounds.minor = [];
        removed.push(...wounds.moderate.slice(1));
        wounds.moderate = wounds.moderate.slice(0, 1);
      } else {
        removed.push(...wounds.moderate);
        wounds.moderate = [];
      }
      if (options.majorTaskSucceeded === true) {
        const wound = wounds.major.pop();
        if (wound) removed.push(wound);
      }
    }

    return {
      type,
      wounds,
      removed,
      choice,
      majorTaskSucceeded: options.majorTaskSucceeded === true
    };
  }

  prepare(actor: CharacterDocumentLike, type: RestType, options: RestOptions = {}): RestPreparation {
    assertLiving(actor);
    const result = this.rest(actor.system.wounds, type, options);
    return {
      result,
      historyEntry: {
        id: this.#idFactory(),
        type,
        choice: result.choice,
        majorTaskSucceeded: result.majorTaskSucceeded,
        removedWoundIds: result.removed.map((wound) => wound.id),
        timestamp: this.#now()
      }
    };
  }

  async apply(
    actor: CharacterDocumentLike,
    type: RestType,
    options: RestOptions = {}
  ): Promise<RestResult> {
    const {result, historyEntry} = this.prepare(actor, type, options);
    await actor.update({
      "system.wounds": result.wounds,
      "system.rest.lastType": type,
      "system.rest.history": [...actor.system.rest.history, historyEntry]
    });
    return result;
  }
}

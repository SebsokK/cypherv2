import {describe, expect, it} from "vitest";

import {RestService} from "../../src/services/rest-service";
import {character, wounds} from "../helpers/core-fixtures";

describe("RestService", () => {
  const service = new RestService(() => "rest-id", () => 5678);

  it("removes every Minor Wound after 10 minutes", () => {
    const result = service.rest(wounds({minor: 3, moderate: 1}), "10-minutes");
    expect(result.wounds.minor).toHaveLength(0);
    expect(result.wounds.moderate).toHaveLength(1);
    expect(result.removed).toHaveLength(3);
  });

  it("removes one Moderate Wound after 1 hour", () => {
    const result = service.rest(wounds({minor: 2, moderate: 3}), "1-hour", {
      oneHourChoice: "remove-moderate"
    });
    expect(result.wounds.moderate).toHaveLength(2);
    expect(result.wounds.minor).toHaveLength(2);
    expect(result.removed.map((entry) => entry.id)).toEqual(["moderate-3"]);
  });

  it("can remove all Minor Wounds instead after 1 hour", () => {
    const result = service.rest(wounds({minor: 3, moderate: 2}), "1-hour", {
      oneHourChoice: "remove-minors"
    });
    expect(result.wounds.minor).toHaveLength(0);
    expect(result.wounds.moderate).toHaveLength(2);
  });

  it("removes all Moderate Wounds after 10 hours", () => {
    const result = service.rest(wounds({minor: 2, moderate: 3, major: 1}), "10-hours");
    expect(result.wounds.moderate).toHaveLength(0);
    expect(result.wounds.minor).toHaveLength(2);
    expect(result.wounds.major).toHaveLength(1);
  });

  it("can exchange one 10-hour Moderate removal for all Minor Wounds", () => {
    const result = service.rest(wounds({minor: 3, moderate: 3}), "10-hours", {
      removeMinorsInsteadOfOneModerate: true
    });
    expect(result.wounds.minor).toHaveLength(0);
    expect(result.wounds.moderate.map((entry) => entry.id)).toEqual(["moderate-1"]);
    expect(result.removed).toHaveLength(5);
  });

  it("does not exchange when there is no Moderate Wound to replace", () => {
    const result = service.rest(wounds({minor: 3}), "10-hours", {
      removeMinorsInsteadOfOneModerate: true
    });
    expect(result.wounds.minor).toHaveLength(3);
  });

  it("removes one Major after a successful difficulty 6 Might task", () => {
    const result = service.rest(wounds({major: 2}), "10-hours", {majorTaskSucceeded: true});
    expect(result.wounds.major.map((entry) => entry.id)).toEqual(["major-1"]);
  });

  it("does not remove a Major when that task fails", () => {
    const result = service.rest(wounds({major: 2}), "10-hours", {majorTaskSucceeded: false});
    expect(result.wounds.major).toHaveLength(2);
  });

  it("persists the Rest type and structured history", async () => {
    const actor = character({wounds: wounds({minor: 2})});
    const result = await service.apply(actor, "10-minutes");

    expect(result.removed).toHaveLength(2);
    expect(actor.system.rest.lastType).toBe("10-minutes");
    expect(actor.system.rest.history[0]).toEqual({
      id: "rest-id",
      type: "10-minutes",
      choice: "remove-minors",
      majorTaskSucceeded: false,
      removedWoundIds: ["minor-1", "minor-2"],
      timestamp: 5678
    });
  });

  it("does not allow Rest after death", async () => {
    const actor = character({wounds: wounds({major: 3})});
    await expect(service.apply(actor, "10-hours", {majorTaskSucceeded: true})).rejects.toThrow(/dead/i);
  });
});

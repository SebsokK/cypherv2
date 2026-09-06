import {describe, expect, it, vi} from "vitest";
import {artifactLevelFormula, artifactLevelIsRollable, artifactUsable} from "../../src/artifacts/artifact-rules";
import type {ArtifactItemLike} from "../../src/artifacts/artifact-types";
import {ArtifactService} from "../../src/services/artifact-service";

function artifact(level: string, depleted = false): ArtifactItemLike {
  const system = {level, depleted};
  return {
    id: "artifact",
    uuid: "Actor.a.Item.artifact",
    name: "Spellbook",
    type: "artifact",
    system,
    update: vi.fn(async (changes: Record<string, unknown>) => {
      if (Object.hasOwn(changes, "system.level")) system.level = String(changes["system.level"]);
    })
  };
}

describe("Artifact Level and usability", () => {
  it("distinguishes a fixed Level from a rollable Level formula", () => {
    expect(artifactLevelFormula({level: "6"})).toBe("6");
    expect(artifactLevelIsRollable({level: "6"})).toBe(false);
    expect(artifactLevelFormula({level: " 1d6+2 "})).toBe("1d6+2");
    expect(artifactLevelIsRollable({level: "1d6+2"})).toBe(true);
  });

  it("resolves a rollable Level formula into the Artifact's persistent fixed Level", async () => {
    const roller = vi.fn(async () => ({total: 7, chatRoll: {formula: "1d6+2"}}));
    const service = new ArtifactService(roller);
    const item = artifact("1d6+2");
    await expect(service.rollLevel(item)).resolves.toMatchObject({formula: "1d6+2", total: 7});
    expect(item.update).toHaveBeenCalledWith({"system.level": "7"});
    expect(item.system.level).toBe("7");
    expect(service.canRollLevel(item)).toBe(false);
  });

  it("disables automatic use while Depleted and restores it when cleared", async () => {
    const service = new ArtifactService(async () => ({total: 4}));
    expect(artifactUsable({depleted: true})).toBe(false);
    expect(service.canRollLevel(artifact("1d6", true))).toBe(false);
    await expect(service.rollLevel(artifact("1d6", true))).rejects.toThrow("depleted");
    expect(artifactUsable({depleted: false})).toBe(true);
    expect(service.canRollLevel(artifact("1d6", false))).toBe(true);
  });
});

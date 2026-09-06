import {afterEach, describe, expect, it, vi} from "vitest";

import {prepareRoll, resolveRoll} from "../../src/rolls/roll-engine";
import {coreNaturalEffects} from "../../src/rolls/roll-engine";
import type {RollContext} from "../../src/rolls/roll-types";
import {CORE_TOTAL_EFFORT_CAP} from "../../src/rules/core/effort-rules";
import {
  buildAuditRollCardData,
  buildPublicRollCardData,
  RollChatService
} from "../../src/services/roll-chat-service";
import type {RollCharacterDocumentLike} from "../../src/services/roll-service";

function context(difficulty: RollContext["difficulty"]): RollContext {
  return {
    actor: {id: "actor-1", name: "Ada"},
    label: "CYPHERV2.Roll.TestRoll",
    pool: "speed",
    difficulty,
    assets: 1,
    paidEffort: 1,
    freeEffort: 0,
    edge: 1,
    poolValue: 10,
    limits: {difficultyCeiling: 10, assetLimit: 2, paidEffortMaximum: 3, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
    contributions: []
  };
}

const localize = (key: string): string => `loc:${key}`;

describe("Roll Chat presentation", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("shows outcome, performance, and calculation for a known roll", () => {
    const result = resolveRoll(prepareRoll(context({mode: "known", value: 5})), 12);
    const data = buildPublicRollCardData(result, "rollOnly", localize);

    expect(data).toMatchObject({
      presentation: "known",
      outcomeClass: "success",
      finalDifficulty: 3,
      targetNumber: 9,
      beatsDifficulty: 6,
      showBeatsDifficulty: true,
      naturalRoll: 12,
      poolCost: 2
    });
  });

  it("renders contribution steps with centralized signed modifiers", () => {
    const signedContext = {
      ...context({mode: "known" as const, value: 5}),
      contributions: [{
        id: "ease",
        label: "Ease Source",
        direction: "ease" as const,
        steps: 2,
        source: "other" as const
      }, {
        id: "hinder",
        label: "Hindrance Source",
        direction: "hinder" as const,
        steps: 3,
        source: "other" as const
      }]
    };
    const result = resolveRoll(prepareRoll(signedContext), 12);
    const data = buildPublicRollCardData(result, "full", localize);

    expect(data.breakdown).toContainEqual(
      expect.objectContaining({label: "loc:Ease Source", modifier: "+2"})
    );
    expect(data.breakdown).toContainEqual(
      expect.objectContaining({label: "loc:Hindrance Source", modifier: "-3"})
    );
  });

  it("uses only BEATS DIFFICULTY for an unknown roll", () => {
    const result = resolveRoll(prepareRoll(context({mode: "unknown"})), 14);
    const data = buildPublicRollCardData(result, "full", localize);

    expect(data.presentation).toBe("unknown");
    expect(data.beatsDifficulty).toBe(6);
    expect(data).not.toHaveProperty("outcome");
    expect(data).not.toHaveProperty("targetNumber");
  });

  it("shows the hidden outcome and performance without secret resolution fields", () => {
    const result = resolveRoll(prepareRoll(context({mode: "hidden", value: 7})), 14);
    const data = buildPublicRollCardData(result, "rollOnly", localize);

    expect(data).toMatchObject({
      presentation: "concealed",
      naturalRoll: 14,
      outcomeClass: "failure",
      beatsDifficulty: 6,
      showBeatsDifficulty: true
    });
    for (const secretKey of [
      "originalDifficulty",
      "difficulty",
      "finalDifficulty",
      "targetNumber",
      "success"
    ]) {
      expect(data).not.toHaveProperty(secretKey);
    }
  });

  it("shows valid natural effects once the hidden outcome is known", () => {
    const resolved = resolveRoll(prepareRoll(context({mode: "hidden", value: 7})), 19);
    const result = {...resolved, naturalEffects: coreNaturalEffects(resolved)};
    const data = buildPublicRollCardData(result, "rollOnly", localize);

    expect(data.naturalEffects).toHaveLength(1);
    expect(JSON.stringify(data)).toContain("Minor");
    expect(buildAuditRollCardData(result, localize).naturalEffects).toHaveLength(1);
  });

  it("exposes outcome and performance for hidden rolls without exposing the target", () => {
    const result = resolveRoll(prepareRoll(context({mode: "hidden", value: 4})), 12);
    const data = buildPublicRollCardData(result, "resultOnly", localize);

    expect(data).toMatchObject({
      presentation: "concealed",
      outcomeClass: "success",
      beatsDifficulty: 6
    });
    expect(data).not.toHaveProperty("finalDifficulty");
    expect(data).not.toHaveProperty("targetNumber");
  });

  it("shows a hidden automatic success without fabricating a roll or leaking difficulty", () => {
    const automaticContext = {
      ...context({mode: "hidden" as const, value: 1}),
      contributions: [{
        id: "trained",
        label: "trained",
        direction: "ease" as const,
        steps: 1,
        source: "skill" as const
      }]
    };
    const result = resolveRoll(prepareRoll(automaticContext), 20);
    const data = buildPublicRollCardData(result, "full", localize);

    expect(data).toMatchObject({
      presentation: "concealed",
      outcome: "loc:CYPHERV2.Roll.Success",
      showNaturalRoll: false,
      naturalRoll: null
    });
    expect(data).not.toHaveProperty("beatsDifficulty");
    expect(data).not.toHaveProperty("finalDifficulty");
    expect(data).not.toHaveProperty("targetNumber");
    expect(data.resolutionDetails).toEqual([]);
  });

  it("includes Skill identity, rank, natural effect, and actual paid cost", () => {
    const skillContext = {
      ...context({mode: "known", value: 5}),
      origin: {
        kind: "skill" as const,
        itemId: "skill-1",
        name: "Climbing",
        rank: "specialized" as const
      }
    };
    const resolved = resolveRoll(prepareRoll(skillContext), 19);
    const result = {...resolved, naturalEffects: coreNaturalEffects(resolved)};
    const data = buildPublicRollCardData(result, "full", localize);

    expect(data).toMatchObject({
      skillName: "Climbing",
      skillRank: "loc:CYPHERV2.Skill.Ranks.specialized",
      naturalRoll: 19,
      poolCost: 2
    });
    expect(data.naturalEffects).toContainEqual(expect.objectContaining({
      label: "loc:CYPHERV2.Roll.NaturalEffects.Minor"
    }));
  });

  it("puts the complete hidden resolution only in the GM audit payload", () => {
    const result = resolveRoll(prepareRoll(context({mode: "hidden", value: 7})), 14);
    const audit = buildAuditRollCardData(result, localize);

    expect(audit).toMatchObject({
      originalDifficulty: 7,
      finalDifficulty: 5,
      targetNumber: 15,
      outcomeClass: "failure"
    });
  });

  it("publishes only a secret-free public ChatMessage when GM audit is disabled", async () => {
    const result = resolveRoll(prepareRoll(context({mode: "hidden", value: 7})), 14);
    const messages: Record<string, unknown>[] = [];
    const create = vi.fn(async (message: Record<string, unknown>) => {
      messages.push(message);
      return {};
    });
    vi.stubGlobal("game", {i18n: {localize}});
    vi.stubGlobal("foundry", {
      applications: {
        handlebars: {
          renderTemplate: vi.fn(async (_path: string, data: Record<string, unknown>) => JSON.stringify(data))
        }
      }
    });
    vi.stubGlobal("ChatMessage", {
      create,
      getSpeaker: () => ({actor: "actor-1"}),
      getWhisperRecipients: () => [{id: "gm-1"}]
    });
    const callAll = vi.fn();
    vi.stubGlobal("Hooks", {callAll});

    await new RollChatService().publish(
      {id: "actor-1", name: "Ada"} as RollCharacterDocumentLike,
      {result},
      "rollOnly"
    );

    expect(create).toHaveBeenCalledTimes(1);
    const publicMessage = messages[0]!;
    const publicPayload = JSON.parse(String(publicMessage.content)) as Record<string, unknown>;
    expect(publicMessage).not.toHaveProperty("flags");
    expect(publicPayload).not.toHaveProperty("finalDifficulty");
    expect(publicPayload).not.toHaveProperty("targetNumber");
    expect(publicPayload).toMatchObject({outcomeClass: "failure", beatsDifficulty: 6});
    expect(callAll).toHaveBeenCalledWith(
      "cypherv2HiddenRollAudit",
      expect.objectContaining({originalDifficulty: 7, finalDifficulty: 5, targetNumber: 15}),
      expect.anything(),
      expect.anything()
    );
  });

  it("creates a separate blind GM audit only when explicitly enabled", async () => {
    const result = resolveRoll(prepareRoll(context({mode: "hidden", value: 7})), 14);
    const messages: Record<string, unknown>[] = [];
    vi.stubGlobal("game", {i18n: {localize}});
    vi.stubGlobal("foundry", {
      applications: {handlebars: {renderTemplate: vi.fn(async (_path: string, data: Record<string, unknown>) => JSON.stringify(data))}}
    });
    vi.stubGlobal("ChatMessage", {
      create: vi.fn(async (message: Record<string, unknown>) => { messages.push(message); return {}; }),
      getSpeaker: () => ({actor: "actor-1"}),
      getWhisperRecipients: () => [{id: "gm-1"}]
    });
    vi.stubGlobal("Hooks", {callAll: vi.fn()});

    await new RollChatService().publish(
      {id: "actor-1", name: "Ada"} as RollCharacterDocumentLike,
      {result},
      "full",
      {showGmAudit: true}
    );

    expect(messages).toHaveLength(2);
    const auditMessage = messages[1]!;
    expect(auditMessage).toMatchObject({whisper: ["gm-1"], blind: true});
    expect(JSON.parse(String(auditMessage.content))).toMatchObject({
      originalDifficulty: 7,
      finalDifficulty: 5,
      targetNumber: 15
    });
  });
});

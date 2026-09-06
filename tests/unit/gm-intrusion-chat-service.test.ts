import {readFileSync} from "node:fs";
import {resolve} from "node:path";

import {afterEach, describe, expect, it, vi} from "vitest";

import type {GMIntrusionRecord} from "../../src/intrusions/gm-intrusion-types";
import {
  buildGMIntrusionCardData,
  createGMIntrusionChatState,
  GMIntrusionChatService,
  isGMIntrusionChatState
} from "../../src/services/gm-intrusion-chat-service";

function record(mode: GMIntrusionRecord["mode"] = "targeted"): GMIntrusionRecord {
  return {
    id: "intrusion-1",
    mode,
    targets: mode === "group" ? [
      {actorId: "actor-1", actorName: "Leon Kennedy", actorImage: "leon.webp"},
      {actorId: "actor-2", actorName: "Dada Wong", actorImage: "dada.webp"},
      {actorId: "actor-3", actorName: "Jill Valentine", actorImage: "jill.webp"}
    ] : [{actorId: "actor-1", actorName: "Arthur", actorImage: "arthur.webp"}],
    targetXp: mode === "free" ? 0 : 1,
    sharedXp: mode === "targeted" ? 1 : 0,
    naturalRoll: mode === "free" ? 1 : 0
  };
}

describe("GM Intrusion Chat presentation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds pending Targeted state and resolved Group/Free state", () => {
    const recipient = {actorId: "actor-2", actorName: "B", actorImage: "b.webp"};
    const targeted = createGMIntrusionChatState(record(), [recipient]);
    expect(targeted).toMatchObject({
      kind: "gm-intrusion",
      intrusionId: "intrusion-1",
      sourceActorId: "actor-1",
      status: "pending",
      recipients: [recipient]
    });
    expect(createGMIntrusionChatState(record("group")).status).toBe("resolved");
    expect(createGMIntrusionChatState(record("free")).status).toBe("resolved");
    expect(buildGMIntrusionCardData(targeted)).toMatchObject({
      isTargeted: true,
      pending: true,
      hasRecipients: true
    });
    expect(isGMIntrusionChatState(targeted)).toBe(true);
  });

  it("persists every affected Group Character as a presentation snapshot", () => {
    const state = createGMIntrusionChatState(record("group"));
    expect(state.affectedCharacters).toEqual([
      {actorId: "actor-1", actorName: "Leon Kennedy", actorImage: "leon.webp"},
      {actorId: "actor-2", actorName: "Dada Wong", actorImage: "dada.webp"},
      {actorId: "actor-3", actorName: "Jill Valentine", actorImage: "jill.webp"}
    ]);
    expect(buildGMIntrusionCardData(state)).toMatchObject({
      isGroup: true,
      hasAffectedCharacters: true,
      affectedCharacters: state.affectedCharacters
    });
  });

  it("exposes the persisted Free Intrusion target identity without XP controls", () => {
    const state = createGMIntrusionChatState(record("free"));
    const data = buildGMIntrusionCardData(state);
    const root = resolve(import.meta.dirname, "../..");
    const template = readFileSync(resolve(root, "templates/chat/gm-intrusion-card.hbs"), "utf8");

    expect(data).toMatchObject({
      isFree: true,
      targetXp: 0,
      sharedXp: 0,
      sourceCharacter: {
        actorId: "actor-1",
        actorName: "Arthur",
        actorImage: "arthur.webp"
      }
    });
    expect(template).toContain('class="intrusion-card-identity intrusion-free-identity"');
    expect(template).toContain("sourceCharacter.actorImage");
    expect(template).toContain("sourceCharacter.actorName");
    expect(template).toContain("CYPHERV2.Intrusion.Chat.FreeHint");
    expect(template.slice(template.indexOf("{{else}}", template.indexOf("{{else if isGroup}}"))))
      .not.toContain("assignSharedIntrusionXp");
  });

  it("uses one full-width row for each recipient and each Group Character", () => {
    const root = resolve(import.meta.dirname, "../..");
    const template = readFileSync(resolve(root, "templates/chat/gm-intrusion-card.hbs"), "utf8");
    const styles = readFileSync(resolve(root, "styles/components/_roll-card.scss"), "utf8");

    expect(template).toContain('class="intrusion-recipient-list"');
    expect(template).toContain('class="intrusion-group-list"');
    expect(template).toContain('class="intrusion-group-character"');
    expect(template).toContain('CYPHERV2.Intrusion.Chat.XPAmount');
    expect(template).toContain('xp=../targetXp');
    expect(styles).toMatch(/\.intrusion-recipient-list\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(styles).toMatch(/button\.intrusion-recipient\s*\{[\s\S]*?width:\s*100%/);
    expect(styles).not.toMatch(/\.intrusion-recipient-list\s*\{[\s\S]*?repeat\(auto-fit/);
  });

  it("publishes the authoritative card state in one ChatMessage", async () => {
    const messages: Record<string, unknown>[] = [];
    vi.stubGlobal("foundry", {
      applications: {handlebars: {renderTemplate: vi.fn(async (_path: string, data: unknown) => JSON.stringify(data))}}
    });
    vi.stubGlobal("ChatMessage", {
      create: vi.fn(async (message: Record<string, unknown>) => {
        messages.push(message);
        return {id: "message-1"};
      }),
      getSpeaker: vi.fn(() => ({}))
    });

    const recipient = {actorId: "actor-2", actorName: "B", actorImage: "b.webp"};
    const message = await new GMIntrusionChatService().publish(record(), undefined, [recipient]);
    expect(message.id).toBe("message-1");
    expect(messages[0]).toHaveProperty(
      "flags.cypherv2.gmIntrusion",
      expect.objectContaining({status: "pending", recipients: [recipient]})
    );
    expect(JSON.stringify(messages[0])).not.toMatch(/gmNotes|timestamp/);
  });

  it("updates content and state together when shared XP resolves", async () => {
    const update = vi.fn(async () => undefined);
    vi.stubGlobal("foundry", {
      applications: {handlebars: {renderTemplate: vi.fn(async () => "<article>resolved</article>")}}
    });
    const state = {
      ...createGMIntrusionChatState(record()),
      status: "resolved" as const,
      recipients: [],
      resolvedRecipient: {actorId: "actor-2", actorName: "B", actorImage: "b.webp"}
    };
    await new GMIntrusionChatService().update({update} as unknown as ChatMessage, state);
    expect(update).toHaveBeenCalledWith({
      content: "<article>resolved</article>",
      "flags.cypherv2.gmIntrusion": state
    });
  });
});

import {readFileSync} from "node:fs";

import {afterEach, describe, expect, it, vi} from "vitest";

import {
  eligibleSharedXpRecipients,
  GMIntrusionController,
  isPendingXP,
  selectDistributionResponder
} from "../../src/intrusions/gm-intrusion-controller";
import type {GMIntrusionChatState} from "../../src/intrusions/gm-intrusion-types";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import {createGMIntrusionChatState} from "../../src/services/gm-intrusion-chat-service";
import {GMIntrusionService} from "../../src/services/gm-intrusion-service";
import {character} from "../helpers/core-fixtures";

describe("GM Intrusion distribution coordinator", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("chooses exactly one active non-GM owner deterministically by User ID", () => {
    const selected = selectDistributionResponder([
      {id: "user-c", active: true, isGM: false},
      {id: "user-a", active: true, isGM: false},
      {id: "user-b", active: false, isGM: false},
      {id: "gm-a", active: true, isGM: true}
    ]);

    expect(selected?.id).toBe("user-a");
  });

  it("assigns one inactive owner so pending XP survives until they reconnect", () => {
    expect(selectDistributionResponder([
      {id: "user-a", active: false, isGM: false},
      {id: "gm-a", active: true, isGM: true}
    ])?.id).toBe("user-a");
  });

  it("accepts only the minimal pending-XP persistence shape", () => {
    expect(isPendingXP({
      intrusionId: "intrusion-1",
      messageId: "message-1",
      sourceActorId: "actor-1",
      amount: 1,
      responderUserId: "user-a"
    })).toBe(true);
    expect(isPendingXP({
      id: "legacy-history",
      title: "Old persistent intrusion",
      description: "Should be discarded",
      targets: []
    })).toBe(false);
  });

  it("lists distinct Characters assigned to non-GM Users regardless of connection state", () => {
    vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
    const actor = (id: string, name: string, ownerIds: string[], type = "character") => ({
      id,
      name,
      img: id + ".webp",
      type,
      testUserPermission: (user: {id: string}) => ownerIds.includes(user.id)
    });
    const source = actor("source", "Source", ["user-a"]);
    const connected = actor("connected", "Connected", ["user-b"]);
    const offline = actor("offline", "Offline", ["user-c"]);
    const unusedPregen = actor("unused", "Unused Pregen", ["user-b"]);
    const npc = actor("npc", "NPC", ["user-d"], "npc");
    const gmOnly = actor("gm-only", "GM Only", ["gm-a"]);
    const sharedOwnership = actor("shared", "Shared Ownership", ["user-a", "user-b"]);
    vi.stubGlobal("game", {users: [
      {id: "user-a", active: true, isGM: false, character: source},
      {id: "user-b", active: true, isGM: false, character: connected},
      {id: "user-c", active: false, isGM: false, character: offline},
      {id: "user-d", active: true, isGM: false, character: npc},
      {id: "user-e", active: true, isGM: false, character: sharedOwnership},
      {id: "user-f", active: false, isGM: false, character: sharedOwnership},
      {id: "gm-a", active: true, isGM: true, character: gmOnly}
    ]});
    expect(eligibleSharedXpRecipients([
      source,
      connected,
      offline,
      unusedPregen,
      npc,
      gmOnly,
      sharedOwnership,
      sharedOwnership
    ] as never, "source")).toEqual([
      {actorId: "connected", actorName: "Connected", actorImage: "connected.webp"},
      {actorId: "offline", actorName: "Offline", actorImage: "offline.webp"},
      {actorId: "shared", actorName: "Shared Ownership", actorImage: "shared.webp"}
    ]);
  });

  it("uses connectivity-neutral copy for an empty recipient list", () => {
    const translations = JSON.parse(readFileSync("lang/en.json", "utf8")) as Record<string, string>;
    expect(translations["CYPHERV2.Intrusion.Chat.NoEligible"]).toBe("No eligible Character available.");
    expect(translations["CYPHERV2.Intrusion.Chat.NoEligible"]).not.toMatch(/connected/i);
  });

  it("lets the GM award shared XP once to an offline player's Character", async () => {
    const source = Object.assign(character({xp: 0}), {
      id: "source",
      name: "Source",
      img: "source.webp",
      testUserPermission: (user: {id: string}) => user.id === "user-a"
    });
    const recipient = Object.assign(character({xp: 4}), {
      id: "recipient",
      name: "Offline Recipient",
      img: "recipient.webp",
      testUserPermission: (user: {id: string}) => user.id === "user-b"
    });
    const gm = {id: "gm-a", active: true, isGM: true, character: null};
    const sourceOwner = {id: "user-a", active: false, isGM: false, character: source};
    const recipientOwner = {id: "user-b", active: false, isGM: false, character: recipient};
    const actorEntries = [source, recipient];
    const actors = Object.assign(actorEntries, {
      get: (id: string) => actorEntries.find((actor) => actor.id === id)
    });
    let pending: unknown[] = [];
    let chatState: GMIntrusionChatState | undefined;
    const message = {
      id: "message-1",
      getFlag: (_scope: string, key: string) => key === "gmIntrusion" ? chatState : undefined
    };
    const messageEntries = [message];
    const messages = Object.assign(messageEntries, {
      get: (id: string) => messageEntries.find((entry) => entry.id === id)
    });
    const chat = {
      publish: vi.fn(async (record, _speaker, recipients) => {
        chatState = createGMIntrusionChatState(record, recipients);
        return message;
      }),
      update: vi.fn(async (_message, state) => {
        chatState = state;
      })
    };

    vi.stubGlobal("game", {
      user: gm,
      users: [gm, sourceOwner, recipientOwner],
      actors,
      messages,
      i18n: {localize: (key: string) => key},
      settings: {
        get: (_scope: string, key: string) => {
          if (key === "gmIntrusions") return pending;
          if (key === "enabledRuleModules") return [];
          if (key === "defaultDifficultyCeiling") return 10;
          return undefined;
        },
        set: vi.fn(async (_scope: string, key: string, value: unknown) => {
          if (key === "gmIntrusions") pending = value as unknown[];
        })
      }
    });
    vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
    vi.stubGlobal("Hooks", {callAll: vi.fn()});

    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const controller = new GMIntrusionController(
      new GMIntrusionService(rules, () => "intrusion-1"),
      chat as never
    );

    await controller.createManual({mode: "targeted", actorIds: [source.id]});
    expect(source.system.xp).toBe(1);
    expect(recipient.system.xp).toBe(4);
    expect(chatState?.recipients).toEqual([
      {actorId: recipient.id, actorName: recipient.name, actorImage: recipient.img}
    ]);

    await controller.requestDistribution("intrusion-1", recipient.id);
    expect(recipient.system.xp).toBe(5);
    expect(chatState).toMatchObject({status: "resolved", recipients: []});
    expect(pending).toEqual([]);

    await expect(controller.requestDistribution("intrusion-1", recipient.id))
      .rejects.toThrow("CYPHERV2.Intrusion.Errors.AlreadyResolved");
    expect(recipient.system.xp).toBe(5);
  });

  it("keeps offline-player recipient choices visible to the sole active GM during the initial render race", () => {
    vi.useFakeTimers();
    const leon = Object.assign(character(), {id: "leon", name: "Leon Kennedy", img: "leon.webp"});
    const dada = Object.assign(character(), {id: "dada", name: "Dada Wong", img: "dada.webp"});
    const jill = Object.assign(character(), {id: "jill", name: "Jill Valentine", img: "jill.webp"});
    const gm = {id: "gm-a", active: true, isGM: true, character: null};
    const playerLeon = {id: "user-leon", active: false, isGM: false, character: leon};
    const playerDada = {id: "user-dada", active: false, isGM: false, character: dada};
    const playerJill = {id: "user-jill", active: false, isGM: false, character: jill};
    const actors = Object.assign([leon, dada, jill], {
      get: (id: string) => [leon, dada, jill].find((actor) => actor.id === id)
    });
    const state = createGMIntrusionChatState({
      id: "intrusion-1",
      mode: "targeted",
      targets: [{actorId: leon.id, actorName: leon.name, actorImage: leon.img}],
      targetXp: 1,
      sharedXp: 1,
      naturalRoll: 0
    }, [
      {actorId: dada.id, actorName: dada.name, actorImage: dada.img},
      {actorId: jill.id, actorName: jill.name, actorImage: jill.img}
    ]);
    const message = {
      id: "message-1",
      getFlag: (_scope: string, key: string) => key === "gmIntrusion" ? state : undefined
    };
    const buttons = [dada, jill].map((actor) => ({
      dataset: {recipientActorId: actor.id} as Record<string, string>,
      disabled: false,
      remove: vi.fn(),
      addEventListener: vi.fn()
    }));
    let renderHook: ((message: unknown, html: unknown) => void) | undefined;

    vi.stubGlobal("game", {
      user: gm,
      users: [gm, playerLeon, playerDada, playerJill],
      actors,
      messages: Object.assign([message], {get: () => message}),
      socket: {on: vi.fn(), emit: vi.fn()},
      settings: {
        // Reproduces the first Chat render, before createManual has stored pending XP.
        get: (_scope: string, key: string) => key === "gmIntrusions" ? [] : key === "enabledRuleModules" ? [] : 10,
        set: vi.fn(async () => undefined)
      },
      i18n: {localize: (key: string) => key}
    });
    vi.stubGlobal("ui", {notifications: {error: vi.fn()}});
    vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
    vi.stubGlobal("Hooks", {
      on: vi.fn((name: string, callback: typeof renderHook) => {
        if (name === "renderChatMessageHTML") renderHook = callback;
      }),
      callAll: vi.fn()
    });

    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    new GMIntrusionController(
      new GMIntrusionService(rules),
      {publish: vi.fn(), update: vi.fn()} as never
    ).initialize();
    renderHook?.(message, {querySelectorAll: () => buttons});

    expect(buttons.map((button) => button.dataset.recipientActorId)).toEqual(["dada", "jill"]);
    expect(buttons.every((button) => button.remove.mock.calls.length === 0)).toBe(true);
    expect(buttons.every((button) => button.addEventListener.mock.calls.length === 1)).toBe(true);
  });

  it("allows the designated target owner to request resolution but rejects an unrelated player", async () => {
    const source = Object.assign(character(), {
      id: "source",
      name: "Source",
      img: "source.webp",
      testUserPermission: (user: {id: string}) => user.id === "user-source"
    });
    const recipient = Object.assign(character(), {
      id: "recipient",
      name: "Recipient",
      img: "recipient.webp",
      testUserPermission: (user: {id: string}) => user.id === "user-recipient"
    });
    const gm = {id: "gm-a", active: true, isGM: true, character: null};
    const sourceOwner = {id: "user-source", active: true, isGM: false, character: source};
    const recipientOwner = {id: "user-recipient", active: false, isGM: false, character: recipient};
    const unrelated = {id: "user-other", active: true, isGM: false, character: null};
    const actors = Object.assign([source, recipient], {
      get: (id: string) => [source, recipient].find((actor) => actor.id === id)
    });
    const state = createGMIntrusionChatState({
      id: "intrusion-1",
      mode: "targeted",
      targets: [{actorId: source.id, actorName: source.name, actorImage: source.img}],
      targetXp: 1,
      sharedXp: 1,
      naturalRoll: 0
    }, [{actorId: recipient.id, actorName: recipient.name, actorImage: recipient.img}]);
    const message = {
      id: "message-1",
      getFlag: (_scope: string, key: string) => key === "gmIntrusion" ? state : undefined
    };
    let socketHandler: ((message: unknown) => void) | undefined;
    const emit = vi.fn();
    const gameState = {
      user: sourceOwner as typeof sourceOwner | typeof unrelated,
      users: [gm, sourceOwner, recipientOwner, unrelated],
      actors,
      messages: Object.assign([message], {get: () => message}),
      socket: {
        on: vi.fn((_name: string, callback: typeof socketHandler) => {
          socketHandler = callback;
        }),
        emit
      },
      i18n: {localize: (key: string) => key},
      settings: {
        get: (_scope: string, key: string) => key === "gmIntrusions" ? [{
          intrusionId: "intrusion-1",
          messageId: message.id,
          sourceActorId: source.id,
          amount: 1,
          responderUserId: sourceOwner.id
        }] : key === "enabledRuleModules" ? [] : 10,
        set: vi.fn(async () => undefined)
      }
    };
    vi.stubGlobal("game", gameState);
    vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
    vi.stubGlobal("Hooks", {on: vi.fn(), callAll: vi.fn()});
    vi.stubGlobal("ui", {notifications: {error: vi.fn()}});

    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const controller = new GMIntrusionController(
      new GMIntrusionService(rules),
      {publish: vi.fn(), update: vi.fn()} as never
    );
    controller.initialize();
    const request = controller.requestDistribution("intrusion-1", recipient.id);
    const socketRequest = emit.mock.calls[0]?.[1] as {requestId: string; requesterUserId: string};
    expect(socketRequest.requesterUserId).toBe(sourceOwner.id);
    socketHandler?.({
      type: "distribution-result",
      requestId: socketRequest.requestId,
      recipientUserId: sourceOwner.id,
      success: true
    });
    await expect(request).resolves.toBeUndefined();

    gameState.user = unrelated;
    await expect(controller.requestDistribution("intrusion-1", recipient.id))
      .rejects.toThrow("CYPHERV2.Intrusion.Errors.NotAuthorized");
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("shows the acting GM a notification and restores the row after a stale recipient click", async () => {
    vi.useFakeTimers();
    const source = Object.assign(character(), {
      id: "source",
      name: "Source",
      img: "source.webp",
      testUserPermission: () => false
    });
    const gm = {id: "gm-a", active: true, isGM: true, character: null};
    const actors = Object.assign([source], {
      get: (id: string) => id === source.id ? source : undefined
    });
    const state = createGMIntrusionChatState({
      id: "intrusion-1",
      mode: "targeted",
      targets: [{actorId: source.id, actorName: source.name, actorImage: source.img}],
      targetXp: 1,
      sharedXp: 1,
      naturalRoll: 0
    }, [{actorId: "missing", actorName: "Missing", actorImage: "missing.webp"}]);
    const message = {
      id: "message-1",
      getFlag: (_scope: string, key: string) => key === "gmIntrusion" ? state : undefined
    };
    const messages = Object.assign([message], {
      get: (id: string) => id === message.id ? message : undefined
    });
    const errorNotification = vi.fn();
    let renderHook: ((message: unknown, html: unknown) => void) | undefined;
    let click: ((event: {preventDefault(): void; stopPropagation(): void}) => void) | undefined;
    const button = {
      dataset: {recipientActorId: "missing"} as Record<string, string>,
      disabled: false,
      remove: vi.fn(),
      addEventListener: vi.fn((_type: string, listener: typeof click) => {
        click = listener;
      })
    };
    const html = {querySelectorAll: () => [button]};

    vi.stubGlobal("game", {
      user: gm,
      users: [gm],
      actors,
      messages,
      socket: {on: vi.fn(), emit: vi.fn()},
      i18n: {localize: (key: string) => key},
      settings: {
        get: (_scope: string, key: string) => key === "gmIntrusions" ? [{
          intrusionId: "intrusion-1",
          messageId: message.id,
          sourceActorId: source.id,
          amount: 1
        }] : key === "enabledRuleModules" ? [] : 10,
        set: vi.fn(async () => undefined)
      }
    });
    vi.stubGlobal("ui", {notifications: {error: errorNotification}});
    vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
    vi.stubGlobal("Hooks", {
      on: vi.fn((name: string, callback: typeof renderHook) => {
        if (name === "renderChatMessageHTML") renderHook = callback;
      }),
      callAll: vi.fn()
    });

    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    new GMIntrusionController(
      new GMIntrusionService(rules),
      {publish: vi.fn(), update: vi.fn()} as never
    ).initialize();
    renderHook?.(message, html);
    click?.({preventDefault: vi.fn(), stopPropagation: vi.fn()});
    await vi.advanceTimersByTimeAsync(0);

    expect(errorNotification).toHaveBeenCalledWith("CYPHERV2.Intrusion.Errors.CharacterMissing");
    expect(button.disabled).toBe(false);
  });
});

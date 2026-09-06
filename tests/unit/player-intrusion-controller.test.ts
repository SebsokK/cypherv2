import {afterEach, describe, expect, it, vi} from "vitest";

import {PlayerIntrusionController} from "../../src/intrusions/player-intrusion-controller";
import {PlayerIntrusionService} from "../../src/services/player-intrusion-service";
import {character} from "../helpers/core-fixtures";

function setup(options: {xp?: number; confirmed?: boolean; owner?: boolean} = {}) {
  const actor = Object.assign(character({xp: options.xp ?? 2}), {
    uuid: "Scene.scene.Token.token.Actor.character-1",
    img: "hero.webp",
    testUserPermission: vi.fn(() => options.owner ?? true)
  });
  const user = {id: "gm-1", isGM: true, active: true, targets: []};
  const publish = vi.fn(async () => ({id: "message-1"}));
  vi.stubGlobal("game", {
    user,
    users: [user],
    messages: [],
    socket: {emit: vi.fn(), on: vi.fn()},
    i18n: {localize: (key: string) => key}
  });
  vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
  vi.stubGlobal("foundry", {
    applications: {api: {DialogV2: {confirm: vi.fn(async () => options.confirmed ?? true)}}}
  });
  vi.stubGlobal("fromUuid", vi.fn(async () => actor));
  vi.stubGlobal("Hooks", {callAll: vi.fn()});
  return {
    actor,
    publish,
    controller: new PlayerIntrusionController(
      new PlayerIntrusionService(),
      {publish} as never
    )
  };
}

describe("PlayerIntrusionController", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("spends nothing when confirmation is cancelled", async () => {
    const {actor, controller, publish} = setup({confirmed: false});
    await expect(controller.activate(actor)).resolves.toBe(false);
    expect(actor.system.xp).toBe(2);
    expect(publish).not.toHaveBeenCalled();
  });

  it("spends exactly one XP and publishes after confirmation", async () => {
    const {actor, controller, publish} = setup();
    await expect(controller.activate(actor)).resolves.toBe(true);
    expect(actor.system.xp).toBe(1);
    expect(publish).toHaveBeenCalledOnce();
  });

  it("blocks zero XP and unauthorized users before mutation", async () => {
    const zero = setup({xp: 0});
    await expect(zero.controller.activate(zero.actor)).rejects.toThrow("RequiresXP");
    expect(zero.actor.system.xp).toBe(0);

    const denied = setup({owner: false});
    (game.user as {isGM: boolean}).isGM = false;
    await expect(denied.controller.activate(denied.actor)).rejects.toThrow("NotAuthorized");
    expect(denied.actor.system.xp).toBe(2);
  });

  it("suppresses a rapid second activation while the first confirmation is pending", async () => {
    const {actor, controller} = setup();
    let finish!: (value: boolean) => void;
    const pending = new Promise<boolean>((resolve) => { finish = resolve; });
    (foundry.applications.api.DialogV2.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);
    const first = controller.activate(actor);
    await expect(controller.activate(actor)).resolves.toBe(false);
    finish(false);
    await expect(first).resolves.toBe(false);
    expect(actor.system.xp).toBe(2);
  });
});

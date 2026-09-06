import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const sheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const controller = readFileSync("src/intrusions/player-intrusion-controller.ts", "utf8");
const card = readFileSync("templates/chat/player-intrusion-card.hbs", "utf8");
const styles = readFileSync("styles/components/_character-header.scss", "utf8");

describe("Player Intrusion UI and authority", () => {
  it("places one permission-aware lightning action beside the Character name", () => {
    const nameRow = template.match(/<div class="character-hud-name-row">[\s\S]*?<\/div>/)?.[0] ?? "";
    expect(nameRow).toContain('data-action="playerIntrusion"');
    expect(nameRow).toContain("fa-bolt");
    expect(nameRow).toContain("header.playerIntrusion.visible");
    expect(nameRow).toContain("header.playerIntrusion.canUse");
    expect(template.slice(template.indexOf("character-hud-currency"), template.indexOf("</header>")))
      .not.toContain("playerIntrusion");
    expect(sheet).toContain("services.playerIntrusions.canUse");
  });

  it("keeps confirmation, permission validation, duplicate guards, and exact synthetic identity in the controller", () => {
    expect(controller).toContain("DialogV2.confirm");
    expect(controller).toContain("testUserPermission");
    expect(controller).toContain("#activeActors");
    expect(controller).toContain("#activeRequests");
    expect(controller).toContain("completedRequest(requestId)");
    expect(controller).toContain("await fromUuid(actorUuid)");
    expect(controller).toContain("actor.uuid !== actorUuid");
    expect(controller).not.toContain("game.actors.get");
  });

  it("uses a compact Character-accent card and no consequence workflow", () => {
    expect(card).toContain("player-intrusion-card");
    expect(card).toContain("cypherv2-chat-card");
    expect(card).toContain("actorImage");
    expect(card).not.toMatch(/Accept|Refuse|Resolve|data-action/);
    expect(styles).toContain(".character-player-intrusion");
    expect(styles).toContain("var(--cypherv2-character-accent)");
  });
});

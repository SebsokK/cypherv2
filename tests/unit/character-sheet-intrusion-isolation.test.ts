import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(process.cwd());

describe("Character Sheet GM Intrusion isolation", () => {
  it("contains no GM Intrusion controls while exposing only the Player Intrusion header action", () => {
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
    const sheetStyles = readFileSync(resolve(root, "styles/sheets/_sheets.scss"), "utf8");

    expect(source).not.toMatch(/GMIntrusion|gmIntrusion/);
    expect(template).not.toMatch(/GM Intrusion|gmIntrusion/);
    expect(template).toContain('data-action="playerIntrusion"');
    expect(template.indexOf('data-action="playerIntrusion"')).toBeLessThan(template.indexOf("character-hud-sentence"));
    expect(template.slice(template.indexOf("character-hud-currency"), template.indexOf("</header>")))
      .not.toContain("playerIntrusion");
    expect(sheetStyles).not.toMatch(/intrusion-list|intrusion-actions/);
  });

  it("keeps GM Intrusion cards free of Accept/Refuse/React/Resolve lifecycle", () => {
    const controller = readFileSync(resolve(root, "src/intrusions/gm-intrusion-controller.ts"), "utf8");
    const service = readFileSync(resolve(root, "src/services/gm-intrusion-service.ts"), "utf8");
    const template = readFileSync(resolve(root, "templates/chat/gm-intrusion-card.hbs"), "utf8");

    expect(controller).not.toMatch(/#active|requestReaction|remove-target|remove-intrusion|clear-active/);
    expect(service).not.toMatch(/reactionXpCost|async react/);
    expect(template).not.toMatch(/Accept|Refuse|React|Resolve/);
    expect(template).toContain('data-action="assignSharedIntrusionXp"');
  });
});

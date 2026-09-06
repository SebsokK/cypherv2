import {readFileSync} from "node:fs";
import {resolve} from "node:path";

import {describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "../..");
const checkboxStyles = readFileSync(resolve(root, "styles/components/_checkbox.scss"), "utf8");
const itemStyles = readFileSync(resolve(root, "styles/components/_item-rule-sheet.scss"), "utf8");
const styleIndex = readFileSync(resolve(root, "styles/index.scss"), "utf8");
const itemTemplate = readFileSync(resolve(root, "templates/item/item-sheet.hbs"), "utf8");
const intrusionDialog = readFileSync(resolve(root, "src/applications/dialogs/gm-intrusion-dialog.ts"), "utf8");

describe("shared Cypher V2 checkbox presentation", () => {
  it("scopes one custom checkbox control to Cypher sheets and dialogs", () => {
    expect(styleIndex).toContain('@use "components/checkbox";');
    expect(checkboxStyles).toContain('.cypherv2-sheet input[type="checkbox"]');
    expect(checkboxStyles).toContain('.cypherv2-dialog input[type="checkbox"]');
    expect(checkboxStyles).toContain('.application.dialog:has(.cypherv2-dialog-fields)');
    expect(checkboxStyles).toContain("appearance: none");
  });

  it("keeps checked and unchecked states on identical fixed dimensions", () => {
    expect(checkboxStyles).toContain("$checkbox-size: 0.875rem;");
    expect(checkboxStyles).toContain("inline-size: $checkbox-size;");
    expect(checkboxStyles).toContain("block-size: $checkbox-size;");
    expect(checkboxStyles).toContain("min-inline-size: $checkbox-size;");
    expect(checkboxStyles).toContain("max-inline-size: $checkbox-size;");
    expect(checkboxStyles).not.toMatch(/&:checked\s*\{[^}]*?(?:inline|block|width|height)-size/s);
  });

  it("uses the semantic soft red and an off-white vector checkmark", () => {
    expect(checkboxStyles).toMatch(/&:checked\s*\{[\s\S]*?background:\s*var\(--cypherv2-danger\)/);
    expect(checkboxStyles).toMatch(/&::before\s*\{[\s\S]*?background-color:\s*var\(--cypherv2-text-primary\)/);
    expect(checkboxStyles).toContain("$checkmark-mask: url(");
    expect(checkboxStyles).not.toContain('content: "✓"');
    expect(checkboxStyles).not.toMatch(/yellow|orange|#[0-9a-f]{3,8}/i);
    expect(itemStyles).not.toContain("accent-color");
    expect(itemStyles).not.toContain("appearance: auto");
  });

  it("suppresses Foundry's checked ::after glyph and retains only the Cypher ::before checkmark", () => {
    expect(checkboxStyles).toMatch(/&::after\s*\{\s*content:\s*none;\s*display:\s*none;/s);
    expect(checkboxStyles).toMatch(/&:checked\s*\{[\s\S]*?&::before\s*\{\s*opacity:\s*1;/);
  });

  it("centers a fixed vector box without font metrics or positional hacks", () => {
    expect(checkboxStyles).toContain("place-items: center");
    expect(checkboxStyles).toContain("place-self: center");
    expect(checkboxStyles).toContain("inline-size: 0.625rem");
    expect(checkboxStyles).toContain("block-size: 0.5rem");
    expect(checkboxStyles).toContain("position: static");
    expect(checkboxStyles).toContain("-webkit-mask-image: $checkmark-mask");
    expect(checkboxStyles).toContain("mask-image: $checkmark-mask");
    expect(checkboxStyles).not.toMatch(/font-size|line-height/);
    expect(checkboxStyles).not.toMatch(/translate|rotate|scale\(/);
    expect(checkboxStyles).not.toMatch(/\b(?:top|left):/);
    expect(checkboxStyles).not.toMatch(/inline-size:\s*0\.48rem|block-size:\s*0\.27rem/);
  });

  it("preserves explicit hover, keyboard focus, and disabled states", () => {
    expect(checkboxStyles).toContain("&:not(:disabled):hover");
    expect(checkboxStyles).toContain("&:focus-visible");
    expect(checkboxStyles).toContain("outline: 2px solid var(--cypherv2-text-primary)");
    expect(checkboxStyles).toContain("&:disabled");
    expect(checkboxStyles).toContain("cursor: not-allowed");
  });

  it("leaves native label associations and checkbox form fields intact", () => {
    expect(itemTemplate).toContain('<label class="compact-mechanic-checkbox"><input name="system.ammo.enabled" type="checkbox"');
    expect(itemTemplate).toContain('<input name="system.depletion.enabled" type="checkbox"');
    expect(itemTemplate).toContain('<label class="checkbox-field"><input name="system.weaponUse.light" type="checkbox"');
    expect(intrusionDialog).toContain('<label class="intrusion-character-choice"><input name="group-');
    expect(checkboxStyles).not.toMatch(/pointer-events:\s*none/);
  });
});

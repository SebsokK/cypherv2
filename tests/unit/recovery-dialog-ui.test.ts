import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {
  recoveryDialogModes,
  resolveRecoveryDialogMode
} from "../../src/applications/dialogs/character-core-dialogs";

const dialogSource = readFileSync("src/applications/dialogs/character-core-dialogs.ts", "utf8");
const rollDialogSource = readFileSync("src/applications/dialogs/roll-dialog.ts", "utf8");
const dialogStyles = readFileSync("styles/components/_dialogs.scss", "utf8");
const headerTemplate = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const headerSheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");

describe("Recovery dialog presentation", () => {
  it("uses the authoritative derived Recovery formula in both Header and dialog", () => {
    expect(headerTemplate).toContain("{{header.recoveryFormulaLabel}}");
    expect(headerSheet).toContain("recoveryFormulaLabel: coreSystem.derived.recovery.formula");
    expect(dialogSource).toContain("actor.system.derived.recovery.formula");
    expect(headerTemplate.slice(
      headerTemplate.indexOf("character-hud-recovery-heading"),
      headerTemplate.indexOf("character-hud-recovery-buttons")
    )).not.toContain("lastAction");
  });

  it("defaults One Action to mutually exclusive Normal, Last Action, and Non-Rest modes", () => {
    expect(recoveryDialogModes("one-action")).toEqual(["normal", "lastAction", "nonRest"]);
    expect(dialogSource).toContain('input name="mode" type="radio"');
    expect(dialogSource).toContain('mode === "normal" ? " checked"');
    expect(dialogSource).not.toContain('<select name="kind">');
    expect(dialogSource).not.toContain('name="lastAction" type="checkbox"');
  });

  it.each(["10-minutes", "1-hour", "10-hours"] as const)(
    "never offers Last Action for %s",
    (type) => {
      expect(recoveryDialogModes(type)).toEqual(["normal", "nonRest"]);
      expect(() => resolveRecoveryDialogMode(type, "lastAction")).toThrow(/not available/i);
    }
  );

  it("maps the mode buttons onto existing Recovery kind and lastAction mechanics", () => {
    expect(resolveRecoveryDialogMode("one-action", "normal")).toEqual({kind: "normal", lastAction: false});
    expect(resolveRecoveryDialogMode("one-action", "lastAction")).toEqual({kind: "normal", lastAction: true});
    expect(resolveRecoveryDialogMode("one-action", "nonRest")).toEqual({kind: "nonRest", lastAction: false});
    expect(dialogSource).toContain("completeNonRest(actor, type, slotId)");
    expect(dialogSource).toContain("resolution.lastAction");
  });

  it("uses shared scoped Cypher V2 dialog primitives and semantic Theme tokens", () => {
    expect(dialogSource).toContain("cypherv2 cypherv2-dialog cypherv2-recovery-dialog");
    expect(rollDialogSource).toContain("cypherv2 cypherv2-dialog cypherv2-dialog-fields cypherv2-roll-dialog");
    for (const className of [
      ".cypherv2-dialog-section",
      ".cypherv2-dialog-section-heading",
      ".cypherv2-dialog-button-group",
      ".cypherv2-dialog-toggle",
      ".cypherv2-dialog-field",
      ".cypherv2-dialog-actions",
      ".cypherv2-dialog-callout"
    ]) expect(dialogStyles).toContain(className);
    for (const token of [
      "--cypherv2-surface-primary",
      "--cypherv2-surface-secondary",
      "--cypherv2-surface-raised",
      "--cypherv2-text-primary",
      "--cypherv2-text-muted",
      "--cypherv2-accent",
      "--cypherv2-border",
      "--cypherv2-success",
      "--cypherv2-danger"
    ]) expect(dialogStyles).toContain(`var(${token})`);
    expect(dialogStyles).toContain(".application.dialog:has(.cypherv2-dialog, .cypherv2-dialog-fields)");
    expect(dialogStyles).not.toMatch(/\.application\.dialog\s*\{/);
  });
});

import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {
  packageChoiceSubmissionGuard,
  togglePackageChoice
} from "../../src/applications/dialogs/package-choice-dialog";

const dialogSource = readFileSync("src/applications/dialogs/package-choice-dialog.ts", "utf8");
const packageSource = readFileSync("src/applications/dialogs/character-package-dialogs.ts", "utf8");
const styles = readFileSync("styles/components/_dialogs.scss", "utf8");

describe("Package Choice Dialog V2", () => {
  it("uses full-width native buttons and no select/list input", () => {
    expect(dialogSource).toContain('<button type="button" class="package-choice-option"');
    expect(dialogSource).not.toContain("<select");
    expect(dialogSource).not.toContain("<option");
    expect(styles).toContain(".package-choice-option");
    expect(styles).toContain("width: 100%");
    expect(styles).toContain("white-space: normal");
    expect(styles).toContain("overflow-wrap: anywhere");
  });

  it("resolves Choose 1 from the option action with no visible footer confirmation", () => {
    expect(dialogSource).toContain('data-action="package-choice-${index}"');
    expect(dialogSource).toContain("callback: (): string[] => claimSubmission() ? [option.id] : []");
    expect(styles).toContain(".application.dialog:has(.package-choice-single) .form-footer");
    expect(styles).toMatch(/\.application\.dialog:has\(\.package-choice-single\) \.form-footer\s*\{\s*display: none;/);
  });

  it("guards every accepted result against duplicate submission", () => {
    const claim = packageChoiceSubmissionGuard();
    expect(claim()).toBe(true);
    expect(claim()).toBe(false);
    expect(claim()).toBe(false);
    expect(dialogSource.match(/claimSubmission\(\)/g)).toHaveLength(2);
  });

  it("toggles multi-choice rows without exceeding the required count", () => {
    expect(togglePackageChoice([], "history", 2)).toEqual(["history"]);
    expect(togglePackageChoice(["history"], "occult", 2)).toEqual(["history", "occult"]);
    expect(togglePackageChoice(["history", "occult"], "philosophy", 2)).toEqual(["history", "occult"]);
    expect(togglePackageChoice(["history", "occult"], "history", 2)).toEqual(["occult"]);
  });

  it("requires an exact multi-selection before enabling compact Confirm", () => {
    expect(dialogSource).toContain('action: "confirm-package-choice"');
    expect(dialogSource).toContain("disabled: true");
    expect(dialogSource).toContain("confirm.disabled = selected.length !== request.choose");
    expect(dialogSource).toContain('row.setAttribute("aria-pressed", String(isSelected))');
    expect(dialogSource).toContain('classList.toggle("is-selected", isSelected)');
    expect(styles).toContain(".package-choice-check");
  });

  it("integrates Skill, Ability, Pool bonus, Type, Descriptor and Species choices", () => {
    expect(packageSource).toContain("async function promptGroupChoices");
    expect(packageSource).toContain("async function promptPoolBonusChoices");
    expect(packageSource).toContain("async function promptEdgePool");
    expect(packageSource).not.toContain('select name="optionIds"');
    expect(packageSource).not.toContain('select name="pool"');
    expect(packageSource.match(/promptGroupChoices\(/g)?.length).toBeGreaterThanOrEqual(6);
    expect(packageSource.match(/promptPoolBonusChoices\(/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps sequential cancellation ahead of the unchanged package transaction", () => {
    const typeFlow = packageSource.slice(
      packageSource.indexOf("export async function promptAttachType"),
      packageSource.indexOf("export async function promptAttachDescriptor")
    );
    expect(typeFlow.indexOf("promptGroupChoices")).toBeLessThan(typeFlow.indexOf("attachType"));
    expect(typeFlow).toContain("if (skillChoices === null) return");
    expect(typeFlow).toContain("if (abilityChoices === null) return");

    const descriptorFlow = packageSource.slice(
      packageSource.indexOf("export async function promptAttachDescriptor"),
      packageSource.indexOf("async function promptPoolBonusChoices")
    );
    expect(descriptorFlow.indexOf("promptPoolBonusChoices")).toBeLessThan(descriptorFlow.indexOf("attachDescriptor"));
    expect(descriptorFlow).toContain("if (poolChoices === null) return");
    expect(descriptorFlow).toContain("if (skillChoices === null) return");
  });

  it("preserves full labels and keyboard-compatible button semantics", () => {
    expect(dialogSource).toContain("escapeHtml(option.label)");
    expect(dialogSource).toContain('type="button"');
    expect(dialogSource).toContain('aria-pressed="false"');
    expect(styles).toContain("&:focus-visible");
    expect(styles).toContain("max-height: min(70vh, 42rem)");
  });
});

import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("Grant Conflict Resolver UI", () => {
  it("uses one compact DialogV2 adapter for Skill and Ability package conflicts", () => {
    const source = readFileSync(resolve(root, "src/applications/dialogs/grant-conflict-dialog.ts"), "utf8");
    expect(source).toContain("DialogV2.input");
    expect(source).toContain('value="suggestion:');
    expect(source).toContain('value="world"');
    expect(source).toContain('value="uuid"');
    expect(source).toContain('value="custom"');
    expect(source).toContain('value="suppress"');
    expect(source).toContain('value="gmOverride"');
    expect(source).not.toMatch(/addEventListener\(/);
  });

  it("injects the same resolver into Type, Descriptor, Species, and Focus workflows", () => {
    const packageDialogs = readFileSync(resolve(root, "src/applications/dialogs/character-package-dialogs.ts"), "utf8");
    const characterSheet = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    expect(packageDialogs.match(/conflictResolver: resolveGrantConflictWithDialog/g)).toHaveLength(3);
    expect(characterSheet).toContain("nodeId,\n        resolveGrantConflictWithDialog");
  });

  it("scopes its visual integration to the Theme Registry variables", () => {
    const styles = readFileSync(resolve(root, "styles/sheets/_sheets.scss"), "utf8");
    expect(styles).toContain(".cypherv2.grant-conflict-dialog");
    expect(styles).toContain("var(--cypherv2-color-surface)");
    expect(styles).toContain("var(--cypherv2-color-border)");
  });
});

import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(process.cwd());

describe("Focus Tree Editor Item Sheet integration", () => {
  it("gates every persistent editor entry point behind GM context", () => {
    const source = readFileSync(
      resolve(root, "src/applications/sheets/item-sheet.ts"),
      "utf8"
    );
    const template = readFileSync(resolve(root, "templates/item/item-sheet.hbs"), "utf8");

    expect(source).toMatch(/game\.user\.isGM/);
    expect(source).toMatch(/canEditFocusTree:[\s\S]*game\.user\.isGM/);
    expect(template).toMatch(/#if canEditFocusTree[\s\S]*data-action="editFocusTree"/);
    expect(template).toMatch(/#if focusTreeEditing[\s\S]*data-action="saveFocusTree"/);
  });

  it("uses ItemSheetV2 native drop resolution and one atomic graph update", () => {
    const source = readFileSync(
      resolve(root, "src/applications/sheets/item-sheet.ts"),
      "utf8"
    );

    expect(source).toContain("override async _onDropDocument");
    expect(source).not.toMatch(/addEventListener\(["'](?:drop|dragover)/);
    expect(source).toContain('this.item.update({"system.graph": graph})');
    expect(source).not.toMatch(/system\.graph\.nodes["']?\s*:/);
  });

  it("renders an explicit selected-node panel whose controls cannot submit or navigate", () => {
    const template = readFileSync(resolve(root, "templates/item/item-sheet.hbs"), "utf8");
    const tree = readFileSync(resolve(root, "templates/focus/focus-tree.hbs"), "utf8");

    expect(template).toMatch(/#if focusEditor\.selectedNode[\s\S]*SelectedNode/);
    for (const action of [
      "moveFocusNode",
      "setFocusNodeTier",
      "openFocusNode",
      "refreshFocusSnapshot",
      "startFocusConnection",
      "deleteFocusNode"
    ]) expect(template).toMatch(new RegExp(
      `<button[^>]*type="button"[^>]*data-action="${action}"`
    ));
    expect(tree).toContain('type="button" class="focus-tree-node-inspect"');
    expect(tree).not.toMatch(/href=|type="submit"/);
    const source = readFileSync(
      resolve(root, "src/applications/sheets/item-sheet.ts"),
      "utf8"
    );
    expect(source).toMatch(/#onSelectFocusEditorNode[\s\S]*event\.preventDefault\(\)[\s\S]*event\.stopPropagation\(\)/);
    expect(source).toMatch(/addEventListener\("keydown"[\s\S]*event\.key !== "Escape"[\s\S]*cancelConnection/);
  });

  it("captures scroll before editor rerender and restores it after Application V2 render", () => {
    const source = readFileSync(
      resolve(root, "src/applications/sheets/item-sheet.ts"),
      "utf8"
    );
    expect(source).toMatch(/#rerender[\s\S]*captureFocusEditorScroll\(this\.element\)[\s\S]*this\.render/);
    expect(source).toMatch(/_onRender[\s\S]*restoreFocusEditorScroll\(this\.element/);
    expect(source).not.toMatch(/scrollTop\s*=\s*0/);
  });

  it("offers confirmed working-copy connection clearing and a rich tooltip without native titles", () => {
    const source = readFileSync(resolve(root, "src/applications/sheets/item-sheet.ts"), "utf8");
    const template = readFileSync(resolve(root, "templates/item/item-sheet.hbs"), "utf8");
    const tree = readFileSync(resolve(root, "templates/focus/focus-tree.hbs"), "utf8");

    expect(source).toMatch(/#onClearFocusConnections[\s\S]*DialogV2\.confirm[\s\S]*editor\.clearConnections/);
    expect(template).toContain('data-action="clearFocusConnections"');
    expect(template.match(/data-action="clearFocusConnections"/g)).toHaveLength(1);
    expect(template).toMatch(/data-action="saveFocusTree"[\s\S]*data-action="clearFocusConnections"[\s\S]*data-action="cancelFocusTree"/);
    expect(template).toMatch(/data-action="clearFocusConnections"[^>]*#unless focusEditor\.connections\.length|#unless focusEditor\.connections\.length[^>]*data-action="clearFocusConnections"/);
    expect(tree).toContain("data-cypherv2-tooltip");
    expect(tree).toContain("{{{node.descriptionHtml}}}");
    expect(tree).not.toMatch(/focus-tree-node-inspect[^>]*title=/);
  });
});

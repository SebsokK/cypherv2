import {describe, expect, it} from "vitest";

import {
  captureFocusEditorScroll,
  restoreFocusEditorScroll
} from "../../src/applications/sheets/focus-editor-scroll";

class FakeElement {
  scrollTop = 0;
  scrollLeft = 0;
  readonly dataset: Record<string, string>;
  readonly #queries = new Map<string, FakeElement>();

  constructor(dataset: Record<string, string> = {}) {
    this.dataset = dataset;
  }

  map(selector: string, element: FakeElement): void {
    this.#queries.set(selector, element);
  }

  querySelector<T>(_selector: string): T | null {
    return (this.#queries.get(_selector) ?? null) as T | null;
  }
}

class FakeRoot extends FakeElement {
  sections: FakeElement[] = [];

  querySelectorAll<T>(_selector: string): T[] {
    return this.sections as T[];
  }
}

describe("Focus editor scroll preservation", () => {
  it("restores vertical sheet/window scroll and independent tree scrolling after rerender", () => {
    const root = new FakeRoot();
    const sheet = new FakeElement();
    const windowContent = new FakeElement();
    const section = new FakeElement({focusUuid: "Item.focus"});
    const tree = new FakeElement();
    root.map(".cypherv2-sheet.cypherv2-item", sheet);
    root.map(".window-content", windowContent);
    root.sections = [section];
    section.map(".focus-tree-scroll", tree);
    sheet.scrollTop = 420;
    windowContent.scrollTop = 35;
    tree.scrollLeft = 190;
    tree.scrollTop = 12;

    const state = captureFocusEditorScroll(root as unknown as ParentNode);
    sheet.scrollTop = 0;
    windowContent.scrollTop = 0;
    tree.scrollLeft = 0;
    tree.scrollTop = 0;
    restoreFocusEditorScroll(root as unknown as ParentNode, state);

    expect(sheet.scrollTop).toBe(420);
    expect(windowContent.scrollTop).toBe(35);
    expect(tree.scrollLeft).toBe(190);
    expect(tree.scrollTop).toBe(12);
  });
});

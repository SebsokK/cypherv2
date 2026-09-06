import {describe, expect, it} from "vitest";

import {
  captureItemSheetUiState,
  restoreItemSheetUiState
} from "../../src/applications/sheets/item-sheet-ui-state";

class FakeScroller {
  scrollTop = 0;
}

class FakeInput {
  readonly dataset: {itemFocusKey: string};
  selectionStart: number | null;
  selectionEnd: number | null;
  selectionDirection: "forward" | "backward" | "none" | null;
  focusOptions: FocusOptions | undefined;
  restoredSelection: [number, number, string | undefined] | undefined;

  constructor(
    key: string,
    selection: {start: number; end: number; direction: "forward" | "backward" | "none"} | null = null
  ) {
    this.dataset = {itemFocusKey: key};
    this.selectionStart = selection?.start ?? null;
    this.selectionEnd = selection?.end ?? null;
    this.selectionDirection = selection?.direction ?? null;
  }

  focus(options?: FocusOptions): void {
    this.focusOptions = options;
  }

  setSelectionRange(start: number, end: number, direction?: string): void {
    this.restoredSelection = [start, end, direction];
  }
}

class FakeRoot {
  constructor(
    readonly scroller: FakeScroller,
    readonly focusedInput: FakeInput | null = null,
    readonly inputs: FakeInput[] = focusedInput ? [focusedInput] : []
  ) {}

  querySelector<T>(selector: string): T | null {
    if (selector === "[data-item-sheet-scroll]") return this.scroller as T;
    if (selector === "[data-item-focus-key]:focus") return this.focusedInput as T | null;
    return null;
  }

  querySelectorAll<T>(selector: string): T[] {
    return (selector === "[data-item-focus-key]" ? this.inputs : []) as T[];
  }
}

describe("Item Sheet transient UI state", () => {
  it("restores content scroll after a document-triggered rerender without document data", () => {
    const before = new FakeRoot(new FakeScroller());
    before.scroller.scrollTop = 438;
    const state = captureItemSheetUiState(before as unknown as ParentNode);

    const after = new FakeRoot(new FakeScroller());
    restoreItemSheetUiState(after as unknown as ParentNode, state);

    expect(after.scroller.scrollTop).toBe(438);
    expect(state).toEqual({scrollTop: 438});
    expect(state).not.toHaveProperty("system");
  });

  it("restores an opted-in logical input after its DOM node is replaced", () => {
    const beforeInput = new FakeInput("system.woundCapacities.minor", {
      start: 0,
      end: 1,
      direction: "forward"
    });
    const before = new FakeRoot(new FakeScroller(), beforeInput);
    before.scroller.scrollTop = 217;
    const state = captureItemSheetUiState(before as unknown as ParentNode);

    const afterInput = new FakeInput("system.woundCapacities.minor");
    const unrelatedInput = new FakeInput("system.woundCapacities.major");
    const after = new FakeRoot(new FakeScroller(), null, [unrelatedInput, afterInput]);
    restoreItemSheetUiState(after as unknown as ParentNode, state);

    expect(state.focusedInput).toEqual({
      key: "system.woundCapacities.minor",
      selectionStart: 0,
      selectionEnd: 1,
      selectionDirection: "forward"
    });
    expect(after.scroller.scrollTop).toBe(217);
    expect(afterInput.focusOptions).toEqual({preventScroll: true});
    expect(afterInput.restoredSelection).toEqual([0, 1, "forward"]);
    expect(unrelatedInput.focusOptions).toBeUndefined();
  });

  it("restores focus when a native number input has no selectable caret range", () => {
    const key = "system.woundCapacities.moderate";
    const state = captureItemSheetUiState(
      new FakeRoot(new FakeScroller(), new FakeInput(key)) as unknown as ParentNode
    );
    const replacement = new FakeInput(key);

    restoreItemSheetUiState(
      new FakeRoot(new FakeScroller(), null, [replacement]) as unknown as ParentNode,
      state
    );

    expect(replacement.focusOptions).toEqual({preventScroll: true});
    expect(replacement.restoredSelection).toBeUndefined();
  });
});

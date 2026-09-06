export interface ItemSheetUiState {
  readonly scrollTop: number;
  readonly focusedInput?: {
    readonly key: string;
    readonly selectionStart?: number;
    readonly selectionEnd?: number;
    readonly selectionDirection?: "forward" | "backward" | "none";
  };
}

/** Capture transient Item Sheet presentation state before Application V2 replaces its DOM. */
export function captureItemSheetUiState(root: ParentNode): ItemSheetUiState {
  const scroller = root.querySelector<HTMLElement>("[data-item-sheet-scroll]");
  const input = root.querySelector<HTMLInputElement>("[data-item-focus-key]:focus");
  const key = input?.dataset.itemFocusKey;
  if (!input || !key) return {scrollTop: scroller?.scrollTop ?? 0};

  let selectionStart: number | null = null;
  let selectionEnd: number | null = null;
  let selectionDirection: "forward" | "backward" | "none" | null = null;
  try {
    selectionStart = input.selectionStart;
    selectionEnd = input.selectionEnd;
    selectionDirection = input.selectionDirection;
  } catch {
    // Number inputs do not expose a text selection range in every browser.
  }

  return {
    scrollTop: scroller?.scrollTop ?? 0,
    focusedInput: {
      key,
      ...(selectionStart === null ? {} : {selectionStart}),
      ...(selectionEnd === null ? {} : {selectionEnd}),
      ...(selectionDirection === null ? {} : {selectionDirection})
    }
  };
}

/** Restore transient presentation state without writing anything to the Item Document. */
export function restoreItemSheetUiState(root: ParentNode, state: ItemSheetUiState): void {
  const scroller = root.querySelector<HTMLElement>("[data-item-sheet-scroll]");
  if (scroller) scroller.scrollTop = state.scrollTop;

  if (!state.focusedInput) return;
  const input = [...root.querySelectorAll<HTMLInputElement>("[data-item-focus-key]")]
    .find((candidate) => candidate.dataset.itemFocusKey === state.focusedInput?.key);
  if (!input) return;
  input.focus({preventScroll: true});

  const {selectionStart, selectionEnd, selectionDirection} = state.focusedInput;
  if (selectionStart === undefined || selectionEnd === undefined) return;
  try {
    input.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
  } catch {
    // Focus restoration is still valid for native number inputs without selection ranges.
  }
}

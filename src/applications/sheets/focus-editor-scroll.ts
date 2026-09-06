export interface FocusEditorScrollState {
  readonly vertical: number;
  readonly windowVertical: number;
  readonly trees: readonly {
    readonly focusUuid: string;
    readonly left: number;
    readonly top: number;
  }[];
}

/** Capture sheet and per-tree scroll without storing presentation data in a Document. */
export function captureFocusEditorScroll(root: ParentNode): FocusEditorScrollState {
  const sheet = root.querySelector<HTMLElement>(".cypherv2-sheet.cypherv2-item");
  const windowContent = root.querySelector<HTMLElement>(".window-content");
  const trees = [...root.querySelectorAll<HTMLElement>(
    ".cypherv2-focus-tree-section[data-focus-uuid]"
  )].map((section) => {
    const scroller = section.querySelector<HTMLElement>(".focus-tree-scroll");
    return {
      focusUuid: section.dataset.focusUuid ?? "",
      left: scroller?.scrollLeft ?? 0,
      top: scroller?.scrollTop ?? 0
    };
  });
  return {
    vertical: sheet?.scrollTop ?? 0,
    windowVertical: windowContent?.scrollTop ?? 0,
    trees
  };
}

/** Restore after Application V2 replaces the sheet content during a rerender. */
export function restoreFocusEditorScroll(
  root: ParentNode,
  state: FocusEditorScrollState
): void {
  const sheet = root.querySelector<HTMLElement>(".cypherv2-sheet.cypherv2-item");
  if (sheet) sheet.scrollTop = state.vertical;
  const windowContent = root.querySelector<HTMLElement>(".window-content");
  if (windowContent) windowContent.scrollTop = state.windowVertical;

  const sections = [...root.querySelectorAll<HTMLElement>(
    ".cypherv2-focus-tree-section[data-focus-uuid]"
  )];
  for (const tree of state.trees) {
    const section = sections.find((entry) => entry.dataset.focusUuid === tree.focusUuid);
    const scroller = section?.querySelector<HTMLElement>(".focus-tree-scroll");
    if (!scroller) continue;
    scroller.scrollLeft = tree.left;
    scroller.scrollTop = tree.top;
  }
}

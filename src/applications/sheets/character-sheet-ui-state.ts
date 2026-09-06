export interface CharacterSheetUiState {
  readonly activeTab: string;
  readonly tabScroll: Readonly<Record<string, number>>;
  readonly disclosures: Readonly<Record<string, boolean>>;
}

/** Capture tab and viewport state before Application V2 replaces the Character Sheet DOM. */
export function captureCharacterSheetUiState(root: ParentNode): CharacterSheetUiState {
  const tabs = [...root.querySelectorAll<HTMLElement>(
    ".cypherv2-sheet.cypherv2-character > .tab[data-tab]"
  )];
  const active = tabs.find((tab) => tab.classList.contains("active"));
  const disclosures = [...root.querySelectorAll<HTMLDetailsElement>(
    "details[data-persistent-disclosure]"
  )];
  return {
    activeTab: active?.dataset.tab ?? "skills",
    tabScroll: Object.fromEntries(tabs.map((tab) => [tab.dataset.tab ?? "", tab.scrollTop])),
    disclosures: Object.fromEntries(disclosures.map((details) => [
      details.dataset.persistentDisclosure ?? "",
      details.open
    ]))
  };
}

/** Restore independent tab scroll positions after the active tab has been restored. */
export function restoreCharacterSheetScroll(
  root: ParentNode,
  state: CharacterSheetUiState
): void {
  for (const tab of root.querySelectorAll<HTMLElement>(
    ".cypherv2-sheet.cypherv2-character > .tab[data-tab]"
  )) {
    tab.scrollTop = state.tabScroll[tab.dataset.tab ?? ""] ?? 0;
  }
  for (const details of root.querySelectorAll<HTMLDetailsElement>(
    "details[data-persistent-disclosure]"
  )) {
    const key = details.dataset.persistentDisclosure ?? "";
    if (Object.hasOwn(state.disclosures, key)) details.open = state.disclosures[key] ?? false;
  }
}

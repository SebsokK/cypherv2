type SheetAction = (this: any, ...args: any[]) => unknown;

/** Wrap mutating ApplicationV2 actions so direct/programmatic dispatch is safe. */
export function guardEditableActions<T extends Record<string, SheetAction>>(
  actions: T,
  mutatingActions: ReadonlySet<string>
): T {
  return Object.fromEntries(Object.entries(actions).map(([name, handler]) => [
    name,
    mutatingActions.has(name)
      ? function guardedEditableAction(this: {readonly isEditable: boolean}, ...args: any[]): unknown {
          if (!this.isEditable) return undefined;
          return handler.apply(this, args);
        }
      : handler
  ])) as T;
}

/**
 * Make a rendered sheet honestly read-only while preserving inspection,
 * disclosure, and other non-mutating navigation controls.
 */
export function enforceReadOnlySheetPresentation(
  root: HTMLElement,
  editable: boolean,
  mutatingActions: ReadonlySet<string>
): void {
  if (editable) return;
  for (const field of root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input[name], select[name], textarea[name]"
  )) field.disabled = true;
  for (const editableRegion of root.querySelectorAll<HTMLElement>("[data-edit]")) {
    editableRegion.removeAttribute("data-edit");
  }
  for (const control of root.querySelectorAll<HTMLElement>("[data-action]")) {
    if (!mutatingActions.has(control.dataset.action ?? "")) continue;
    control.setAttribute("aria-disabled", "true");
    if (control instanceof HTMLButtonElement) control.disabled = true;
    else {
      control.removeAttribute("tabindex");
      control.setAttribute("inert", "");
    }
  }
}

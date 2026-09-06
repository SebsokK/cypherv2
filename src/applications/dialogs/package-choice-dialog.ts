export interface PackageChoiceOption {
  readonly id: string;
  readonly label: string;
}

export interface PackageChoiceRequest {
  readonly title: string;
  readonly prompt: string;
  readonly ariaLabel: string;
  readonly choose: number;
  readonly options: readonly PackageChoiceOption[];
}

interface DialogLike {
  readonly element: HTMLElement;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

/** Toggle one multi-choice option without ever exceeding the required count. */
export function togglePackageChoice(
  selected: readonly string[],
  optionId: string,
  required: number
): string[] {
  if (selected.includes(optionId)) return selected.filter((id) => id !== optionId);
  if (selected.length >= required) return [...selected];
  return [...selected, optionId];
}

/** A small synchronous guard used before any dialog result is accepted. */
export function packageChoiceSubmissionGuard(): () => boolean {
  let submitted = false;
  return () => {
    if (submitted) return false;
    submitted = true;
    return true;
  };
}

function choiceRows(options: readonly PackageChoiceOption[], single: boolean): string {
  return options.map((option, index) => {
    const action = single ? ` data-action="package-choice-${index}"` : "";
    return `<button type="button" class="package-choice-option"${action} data-package-choice-option data-option-id="${escapeHtml(option.id)}" aria-pressed="false"><i class="fa-solid fa-check package-choice-check" aria-hidden="true"></i><span>${escapeHtml(option.label)}</span></button>`;
  }).join("");
}

/**
 * Present one generic package choice without applying any package mechanics.
 * The caller remains responsible for passing the returned IDs to its existing resolver.
 */
export async function promptPackageChoice(request: PackageChoiceRequest): Promise<string[] | null> {
  const options = request.options.filter((option, index, all) => (
    option.id && all.findIndex((candidate) => candidate.id === option.id) === index
  ));
  if (!Number.isInteger(request.choose) || request.choose < 1 || request.choose > options.length) return null;

  const single = request.choose === 1;
  const claimSubmission = packageChoiceSubmissionGuard();
  let selected: string[] = [];
  const content = `<div class="cypherv2 cypherv2-dialog package-choice-dialog ${single ? "package-choice-single" : "package-choice-multiple"}" data-package-choice-required="${request.choose}">
    <header class="cypherv2-dialog-heading package-choice-heading"><strong>${escapeHtml(request.title)}</strong></header>
    <p class="cypherv2-dialog-help package-choice-prompt">${escapeHtml(request.prompt)}</p>
    <div class="package-choice-options" role="group" aria-label="${escapeHtml(request.ariaLabel)}">${choiceRows(options, single)}</div>
    ${single ? "" : `<div class="package-choice-selection-status" aria-live="polite"><span data-package-choice-count>0 / ${request.choose} ${game.i18n.localize("CYPHERV2.Packages.Selected")}</span></div>`}
  </div>`;

  const buttons = single
    ? options.map((option, index) => ({
      action: `package-choice-${index}`,
      label: option.label,
      callback: (): string[] => claimSubmission() ? [option.id] : []
    }))
    : [{
      action: "confirm-package-choice",
      label: game.i18n.localize("CYPHERV2.Actions.Confirm"),
      icon: "fa-solid fa-check",
      disabled: true,
      callback: (): string[] => claimSubmission() ? [...selected] : []
    }];

  const result = await foundry.applications.api.DialogV2.wait({
    window: {title: request.title},
    position: {width: 430},
    content,
    buttons,
    close: (): null => null,
    render: single ? undefined : (_event: Event, dialog: DialogLike): void => {
      const rows = [...dialog.element.querySelectorAll<HTMLButtonElement>("button[data-package-choice-option]")];
      const confirm = dialog.element.querySelector<HTMLButtonElement>('button[data-action="confirm-package-choice"]');
      const count = dialog.element.querySelector<HTMLElement>("[data-package-choice-count]");
      const synchronize = (): void => {
        for (const row of rows) {
          const isSelected = selected.includes(row.dataset.optionId ?? "");
          row.classList.toggle("is-selected", isSelected);
          row.setAttribute("aria-pressed", String(isSelected));
        }
        if (confirm) confirm.disabled = selected.length !== request.choose;
        if (count) count.textContent = game.i18n.format("CYPHERV2.Packages.SelectionCount", {
          selected: selected.length,
          required: request.choose
        });
      };
      for (const row of rows) {
        row.addEventListener("click", () => {
          selected = togglePackageChoice(selected, row.dataset.optionId ?? "", request.choose);
          synchronize();
        });
      }
      synchronize();
    }
  }) as string[] | null;
  return Array.isArray(result) && result.length === request.choose ? result : null;
}

import {
  horrorRangeBand,
  horrorRangeFillPercentage,
  HORROR_INTRUSION_RANGE_MAX,
  HORROR_INTRUSION_RANGE_MIN
} from "../../horror/horror-mode";
import {
  currentHorrorIntrusionRange,
  setHorrorIntrusionRange
} from "../../config/settings";

interface HorrorDialogLike {
  readonly element: HTMLElement;
}

function updatePresentation(root: HTMLElement, input: HTMLInputElement, range: number): void {
  const active = range > HORROR_INTRUSION_RANGE_MIN;
  const summary = root.querySelector<HTMLElement>("[data-horror-summary]");
  const explanation = root.querySelector<HTMLElement>("[data-horror-explanation]");
  const output = root.querySelector<HTMLOutputElement>("[data-horror-value]");
  root.dataset.horrorBand = horrorRangeBand(range);
  root.style.setProperty("--cypherv2-horror-fill", `${horrorRangeFillPercentage(range)}%`);
  input.value = String(range);
  input.setAttribute("aria-valuetext", active ? `1–${range}` : "Natural 1");
  if (output) output.value = String(range);
  if (summary) {
    summary.textContent = active
      ? game.i18n.format("CYPHERV2.Horror.RangeSummary", {range})
      : game.i18n.localize("CYPHERV2.Horror.NormalSummary");
  }
  if (explanation) {
    explanation.textContent = active
      ? game.i18n.format("CYPHERV2.Horror.Explanation", {range})
      : game.i18n.localize("CYPHERV2.Horror.NormalExplanation");
  }
}

export async function promptHorrorMode(): Promise<void> {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  const current = currentHorrorIntrusionRange();
  const content = `<div class="cypherv2 cypherv2-dialog cypherv2-horror-dialog" data-horror-dialog data-horror-band="${horrorRangeBand(current)}" style="--cypherv2-horror-fill: ${horrorRangeFillPercentage(current)}%">
    <header class="cypherv2-dialog-heading">
      <span>${game.i18n.localize("CYPHERV2.Horror.Title")}</span>
      <strong data-horror-summary></strong>
    </header>
    <section class="cypherv2-dialog-section">
      <div class="horror-range-control">
        <input class="horror-range-input" id="cypherv2-horror-intrusion-range" name="horrorIntrusionRange" type="range" min="${HORROR_INTRUSION_RANGE_MIN}" max="${HORROR_INTRUSION_RANGE_MAX}" step="1" value="${current}" aria-label="${game.i18n.localize("CYPHERV2.Horror.RangeLabel")}">
        <output class="horror-range-value" data-horror-value for="cypherv2-horror-intrusion-range">${current}</output>
      </div>
      <p class="cypherv2-dialog-help" data-horror-explanation></p>
    </section>
  </div>`;
  await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Horror.Title")},
    content,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Horror.Close")},
    render: (_event: Event, dialog: HorrorDialogLike) => {
      const root = dialog.element.querySelector<HTMLElement>("[data-horror-dialog]");
      const input = root?.querySelector<HTMLInputElement>("[name='horrorIntrusionRange']");
      if (!root || !input) return;
      updatePresentation(root, input, current);
      input.addEventListener("input", () => {
        updatePresentation(root, input, Number(input.value));
      });
      input.addEventListener("change", () => {
        void setHorrorIntrusionRange(Number(input.value)).catch((error) => {
          ui.notifications.error(error instanceof Error ? error.message : String(error));
          updatePresentation(root, input, currentHorrorIntrusionRange());
        });
      });
    }
  });
}

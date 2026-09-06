export interface TooltipRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export function tooltipPosition(
  target: TooltipRect,
  tooltip: Pick<TooltipRect, "width" | "height">,
  viewport: {readonly width: number; readonly height: number},
  margin = 8
): {left: number; top: number} {
  const right = target.right + margin;
  const left = right + tooltip.width <= viewport.width - margin
    ? right
    : target.left - tooltip.width - margin;
  return {
    left: Math.max(margin, Math.min(left, viewport.width - tooltip.width - margin)),
    top: Math.max(margin, Math.min(target.top, viewport.height - tooltip.height - margin))
  };
}

/** A sheet-scoped, reusable rich tooltip host for any Cypher document control. */
export class SystemTooltip {
  #listeners: AbortController | null = null;
  #tooltip: HTMLElement | null = null;
  #target: HTMLElement | null = null;

  bind(root: HTMLElement): void {
    this.disconnect();
    const listeners = new AbortController();
    this.#listeners = listeners;

    const showFromEvent = (event: Event): void => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;
      const target = eventTarget.closest<HTMLElement>("[data-cypherv2-tooltip]");
      if (!target || !root.contains(target)) return;
      this.#show(target);
    };
    const hideAfterLeave = (event: Event): void => {
      if (!(event instanceof PointerEvent) || !this.#target) return;
      const related = event.relatedTarget;
      if (related instanceof Node && this.#target.contains(related)) return;
      this.hide();
    };

    root.addEventListener("pointerover", showFromEvent, {signal: listeners.signal});
    root.addEventListener("pointerout", hideAfterLeave, {signal: listeners.signal});
    root.addEventListener("focusin", showFromEvent, {signal: listeners.signal});
    root.addEventListener("focusout", () => this.hide(), {signal: listeners.signal});
    root.addEventListener("scroll", () => this.hide(), {capture: true, signal: listeners.signal});
    root.addEventListener("click", () => this.hide(), {signal: listeners.signal});
    root.ownerDocument.addEventListener("visibilitychange", () => this.hide(), {
      signal: listeners.signal
    });
    root.ownerDocument.defaultView?.addEventListener("blur", () => this.hide(), {
      signal: listeners.signal
    });
  }

  hide(): void {
    this.#tooltip?.remove();
    this.#tooltip = null;
    this.#target = null;
  }

  disconnect(): void {
    this.#listeners?.abort();
    this.#listeners = null;
    this.hide();
  }

  #show(target: HTMLElement): void {
    if (this.#target === target && this.#tooltip) return;
    this.hide();
    const template = target.parentElement?.querySelector<HTMLTemplateElement>(
      ":scope > .cypherv2-tooltip-template"
    );
    if (!template) return;

    const tooltip = target.ownerDocument.createElement("div");
    tooltip.className = "cypherv2-system-tooltip";
    tooltip.id = target.getAttribute("aria-describedby") ?? `cypherv2-tooltip-${crypto.randomUUID()}`;
    tooltip.role = "tooltip";
    tooltip.append(template.content.cloneNode(true));
    target.ownerDocument.body.append(tooltip);
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const view = target.ownerDocument.defaultView;
    const position = tooltipPosition(targetRect, tooltipRect, {
      width: view?.innerWidth ?? target.ownerDocument.documentElement.clientWidth,
      height: view?.innerHeight ?? target.ownerDocument.documentElement.clientHeight
    });
    tooltip.style.left = `${position.left}px`;
    tooltip.style.top = `${position.top}px`;
    this.#target = target;
    this.#tooltip = tooltip;
  }
}

export interface RectangleLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ConnectionEndpoints {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Convert a viewport rectangle to the coordinate system of the graph canvas. */
export function relativeRectangle(
  rectangle: RectangleLike,
  canvas: Pick<RectangleLike, "left" | "top">
): RectangleLike {
  return {
    left: rectangle.left - canvas.left,
    top: rectangle.top - canvas.top,
    width: rectangle.width,
    height: rectangle.height
  };
}

/**
 * Intersect the center-to-center segment with both node rectangles.
 * This is orientation-agnostic and remains valid if a future editor moves nodes.
 */
export function connectionEndpoints(
  from: RectangleLike,
  to: RectangleLike
): ConnectionEndpoints {
  const fromCenter = {
    x: from.left + from.width / 2,
    y: from.top + from.height / 2
  };
  const toCenter = {
    x: to.left + to.width / 2,
    y: to.top + to.height / 2
  };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  if (dx === 0 && dy === 0) return {
    x1: fromCenter.x,
    y1: fromCenter.y,
    x2: toCenter.x,
    y2: toCenter.y
  };

  const boundaryScale = (rectangle: RectangleLike): number => Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : (rectangle.width / 2) / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : (rectangle.height / 2) / Math.abs(dy)
  );
  const fromScale = boundaryScale(from);
  const toScale = boundaryScale(to);
  return {
    x1: fromCenter.x + dx * fromScale,
    y1: fromCenter.y + dy * fromScale,
    x2: toCenter.x - dx * toScale,
    y2: toCenter.y - dy * toScale
  };
}

export function refreshFocusTreeConnections(section: HTMLElement): void {
  const canvas = section.querySelector<HTMLElement>(".focus-tree-canvas");
  const svg = canvas?.querySelector<SVGSVGElement>(".focus-tree-connections");
  if (!canvas || !svg) return;

  const canvasRectangle = canvas.getBoundingClientRect();
  const width = canvasRectangle.width;
  const height = canvasRectangle.height;
  if (width <= 0 || height <= 0) return;

  // SVG user units now exactly match CSS pixels in the current graph canvas.
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const nodes = new Map<string, HTMLElement>();
  for (const node of canvas.querySelectorAll<HTMLElement>(".focus-tree-node[data-node-id]")) {
    const nodeId = node.dataset.nodeId;
    if (nodeId) nodes.set(nodeId, node);
  }
  for (const line of svg.querySelectorAll<SVGLineElement>("line[data-from][data-to]")) {
    const from = nodes.get(line.dataset.from ?? "");
    const to = nodes.get(line.dataset.to ?? "");
    if (!from || !to) continue;
    const endpoints = connectionEndpoints(
      relativeRectangle(from.getBoundingClientRect(), canvasRectangle),
      relativeRectangle(to.getBoundingClientRect(), canvasRectangle)
    );
    line.setAttribute("x1", String(endpoints.x1));
    line.setAttribute("y1", String(endpoints.y1));
    line.setAttribute("x2", String(endpoints.x2));
    line.setAttribute("y2", String(endpoints.y2));
  }
}

/** Scoped lifecycle controller for every Focus Tree rendered inside one sheet. */
export class FocusTreeConnectionController {
  #observer: ResizeObserver | null = null;
  #frame: number | null = null;
  #sections: HTMLElement[] = [];

  bind(root: ParentNode): void {
    this.disconnect();
    this.#sections = [...root.querySelectorAll<HTMLElement>(".cypherv2-focus-tree-section")];
    if (this.#sections.length === 0) return;

    this.#observer = new ResizeObserver(() => this.scheduleRefresh());
    for (const section of this.#sections) {
      this.#observer.observe(section);
      for (const element of section.querySelectorAll<HTMLElement>(
        ".focus-tree-scroll, .focus-tree-canvas, .focus-tree-node"
      )) this.#observer.observe(element);
    }
    this.scheduleRefresh();
  }

  /** Public refresh point for future node movement and editor interactions. */
  refresh(): void {
    for (const section of this.#sections) refreshFocusTreeConnections(section);
  }

  scheduleRefresh(): void {
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = null;
      this.refresh();
    });
  }

  disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame !== null) cancelAnimationFrame(this.#frame);
    this.#frame = null;
    this.#sections = [];
  }
}

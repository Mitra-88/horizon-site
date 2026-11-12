// Geometry of the small timeline the filter bar draws: where a capture's health series and marks sit, and what a pointer position means.
export interface TimelinePoint {
  x: number;
  y: number;
}

/** The finite points of a series in a `width`×`height` box, time on x across `seconds`, the largest value at the top. */
export function timelinePoints(
  t: readonly number[],
  values: readonly (number | null)[],
  seconds: number,
  width: number,
  height: number,
): TimelinePoint[] {
  const seen = values.flatMap((value, index) => (typeof value === "number" && Number.isFinite(value) ? [{ t: t[index], value }] : []));
  if (seen.length === 0 || seconds <= 0) return [];
  const top = Math.max(...seen.map((point) => point.value), 0);
  const scale = top > 0 ? top : 1;
  return seen.map((point) => ({
    x: Math.min(width, Math.max(0, (point.t / seconds) * width)),
    y: height - (point.value / scale) * height,
  }));
}

/** An SVG path that fills under the points down to the baseline; empty without points. */
export function areaPath(points: readonly TimelinePoint[], height: number): string {
  if (points.length === 0) return "";
  const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L ");
  const first = points[0];
  const last = points[points.length - 1];
  return `M ${first.x.toFixed(1)},${height} L ${line} L ${last.x.toFixed(1)},${height} Z`;
}

/** A pointer's position across the timeline as 0 to 1. */
export function fraction(clientX: number, left: number, width: number): number {
  if (width <= 0) return 0;
  return Math.min(1, Math.max(0, (clientX - left) / width));
}

/** An SVG path along the points; empty without points. */
export function linePath(points: readonly TimelinePoint[]): string {
  if (points.length === 0) return "";
  return `M ${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L ")}`;
}

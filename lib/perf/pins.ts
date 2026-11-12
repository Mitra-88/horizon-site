// Fields pinned to the time chart: `series` takes `h:` health fields, `span:` spans and `x:` counters.
const NICE_STEPS_S: readonly number[] = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

/** Points a chart aims for across its window. */
const TARGET_POINTS = 150;

/** The reader refuses more points than this in one series. */
export const MAX_POINTS = 2000;

/** The steps a person can pick instead of the automatic one. */
export const EVERY_CHOICES: readonly number[] = [0.5, 1, 5, 10, 30, 60, 300];

/** A round step that gives about `TARGET_POINTS` across `windowSeconds`. */
export function autoEvery(windowSeconds: number): number {
  const fit = NICE_STEPS_S.find((step) => windowSeconds / step <= TARGET_POINTS);
  return fit ?? NICE_STEPS_S[NICE_STEPS_S.length - 1];
}

/** Whether the reader will answer a series of this step over this window. */
export function everyFits(every: number, windowSeconds: number): boolean {
  return every > 0 && windowSeconds / every <= MAX_POINTS;
}

export type FieldKind = "health" | "span" | "counter";

export function fieldKind(field: string): FieldKind {
  if (field.startsWith("h:")) return "health";
  if (field.startsWith("x:")) return "counter";
  return "span";
}

export const healthField = (name: string) => `h:${name}`;
export const spanField = (name: string) => `span:${name}`;

/** What a person types for a counter: `name` or `name{k=v}`, with or without the `x:`. */
export function counterField(text: string): string | null {
  const name = text.trim().replace(/^x:/, "");
  return name === "" ? null : `x:${name}`;
}

/** The name a field is shown under: without its prefix. */
export function fieldName(field: string): string {
  return field.replace(/^(h|x|span|s):/, "");
}

export function togglePin(pinned: readonly string[], field: string): string[] {
  return pinned.includes(field) ? pinned.filter((item) => item !== field) : [...pinned, field];
}

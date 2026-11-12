"use client";

import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { rangeFromDrag } from "@/lib/perf/filters";
import type { MarkPoint, TimeRange } from "@/lib/perf/filters";
import { t } from "@/lib/perf/i18n";
import { areaPath, fraction, timelinePoints } from "@/lib/perf/timeline";
import type { SeriesRow } from "@/lib/perf/types";
import styles from "./filters.module.css";

const WIDTH = 1000;
const HEIGHT = 48;

/** How near a mark, as a share of the timeline, a drag end must be to land on it. */
const SNAP = 0.012;

interface Props {
  seconds: number;
  series: SeriesRow | null;
  marks: readonly MarkPoint[];
  /** The selected range in seconds, when there is one. */
  selected: [number, number] | null;
  onRange: (range: TimeRange) => void;
}

/** The capture's health series with its marks: drag across it to pick a range. */
export function Timeline({ seconds, series, marks, selected, onRange }: Props) {
  const box = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const shape = series ? areaPath(timelinePoints(series.t, series.values, seconds, WIDTH, HEIGHT), HEIGHT) : "";

  const at = (event: PointerEvent) => {
    const rect = box.current?.getBoundingClientRect();
    return rect ? fraction(event.clientX, rect.left, rect.width) : 0;
  };
  const shown = drag ? ([Math.min(...drag), Math.max(...drag)] as [number, number]) : selected ? [selected[0] / seconds, selected[1] / seconds] : null;

  return (
    <svg
      ref={box}
      className={styles.timeline}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={t("filters.timeline")}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const start = at(event);
        setDrag([start, start]);
      }}
      onPointerMove={(event) => {
        if (drag) setDrag([drag[0], at(event)]);
      }}
      onPointerUp={(event) => {
        if (!drag) return;
        const range = rangeFromDrag(drag[0], at(event), seconds, marks, SNAP);
        setDrag(null);
        if (range) onRange(range);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <path className={styles.timelineArea} d={shape} />
      {marks.map((mark) => (
        <line key={mark.name} className={styles.timelineMark} x1={(mark.t / seconds) * WIDTH} x2={(mark.t / seconds) * WIDTH} y1={0} y2={HEIGHT}>
          <title>{mark.name}</title>
        </line>
      ))}
      {shown ? <rect className={styles.timelineRange} x={shown[0] * WIDTH} width={Math.max(2, (shown[1] - shown[0]) * WIDTH)} y={0} height={HEIGHT} /> : null}
    </svg>
  );
}

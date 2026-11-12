"use client";

import { useMemo, useState } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { at, num } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import { spanId } from "@/lib/perf/info";
import { culprits, stepLines, tickFlame, usualTimes } from "@/lib/perf/slow-analysis";
import type { SpanRow, TickRow, TreeRow } from "@/lib/perf/types";
import { amountKind } from "@/lib/perf/units";
import { FlameGraph } from "./flame-graph";
import { Icons } from "./icons";
import { RowTools } from "./row-tools";
import { Segmented } from "./segmented";
import { ShowAll } from "./show-all";
import { TREE_SHAPE } from "./tree-state";
import { useRows, useWholeRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";
import tree from "./tree.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

/** Spans shorter than this are noise in a tick's tree. */
const VISIBLE_MS = 0.005;

/** A server tick over 50 ms misses the 20 ticks per second budget; the same line marks a frame under 20 FPS. */
const OVER_MS = 50;

/** Enough to reach past the pre-capture ring, whose unrecorded frames are left out of the list. */
const ALL_KEPT = 1000;

const LISTED = 30;

const CULPRITS = 6;

/** A step this far over its usual time is worth colouring. */
const OVER_USUAL_MS = 1;

function visibleSpans(tick: TickRow) {
  return tick.spans.filter(([, , wall]) => wall >= VISIBLE_MS);
}

function SlowTickLine({ tick, worst, opens }: { tick: TickRow; worst: number; opens: boolean }) {
  return (
    <>
      <span className={styles.tickMs} data-over={tick.wall_ms > OVER_MS}>
        {num(tick.wall_ms, 1)} ms
      </span>
      <span className={styles.tickAt}>
        {tick.before_capture ? t("ticks.before") : t("summary.at", { time: at(tick.t) })}
      </span>
      <span className={styles.meterTrack} aria-hidden="true">
        <span className={styles.meterFill} style={{ width: `${(tick.wall_ms / worst) * 100}%` }} />
      </span>
      <span className={styles.tickChevron} aria-hidden="true">
        {opens ? <Icons.chevronDown /> : null}
      </span>
    </>
  );
}

const NO_MODS: ReadonlySet<string> = new Set();

function signed(value: number): string {
  if (Math.abs(value) < 0.005) return "0.00 ms";
  return `${value > 0 ? "+" : ""}${num(value, 2)} ms`;
}

function SlowTickSteps({ tick, usual }: { tick: TickRow; usual: ReadonlyMap<string, number> }) {
  const lines = stepLines(tick, usual).filter((line) => line.wall >= VISIBLE_MS);
  return (
    <>
      <div className={styles.tickSpan} aria-hidden="true">
        <span className={styles.tickSpanName}>{t("spans.name")}</span>
        <span className={styles.tickSpanMs}>{t("ticks.wall")}</span>
        <span className={styles.tickSpanMs}>{t("ticks.usual")}</span>
        <span className={styles.tickSpanMs}>{t("ticks.extra")}</span>
        <span className={styles.tickSpanMs}>{t("ticks.cpu")}</span>
      </div>
      {lines.map((line, index) => (
        <div key={`${line.name}-${index}`} className={styles.tickSpan}>
          <span className={styles.tickSpanName} style={{ paddingLeft: line.depth * 12 }}>
            <span className={styles.nameText}>{line.name}</span>
            <RowTools id={spanId(line.name)} name={line.name} />
          </span>
          <span className={styles.tickSpanMs}>{num(line.wall, 2)} ms</span>
          <span className={styles.tickSpanMs}>{line.usual === null ? "—" : `${num(line.usual, 2)} ms`}</span>
          <span className={styles.tickSpanMs} data-over={line.extra !== null && line.extra >= OVER_USUAL_MS}>
            {line.extra === null ? "—" : signed(line.extra)}
          </span>
          <span className={styles.tickSpanMs}>{num(line.cpu, 2)} ms</span>
        </div>
      ))}
    </>
  );
}

type TickView = "steps" | "flame" | "samples";

/** What opening a tick asks the reader: the tick by id, and the stack samples inside its time. */
function TickBody({ reader, capture, tick, usual }: Props & { tick: TickRow; usual: ReadonlyMap<string, number> }) {
  const [view, setView] = useState<TickView>("steps");
  const detail = useRows<TickRow>(reader, capture, "tick", {}, true, [tick.id]);
  const shown = detail.rows[0] ?? tick;
  // A tick's `t` is not stated as its start or its end, so the window reaches one tick's length each way.
  const span = shown.wall_ms / 1000;
  const samples = useWholeRows<TreeRow>(
    reader,
    capture,
    "tree",
    { ...TREE_SHAPE, from: Math.max(0, shown.t - span), to: shown.t + span },
    !shown.before_capture,
  );
  const sampled = samples.rows.length > 0;
  const current: TickView = view === "samples" && !sampled ? "steps" : view;
  const options: { id: TickView; text: string }[] = [
    { id: "steps", text: t("ticks.viewSteps") },
    { id: "flame", text: t("ticks.viewFlame") },
    ...(sampled ? [{ id: "samples" as const, text: t("ticks.viewSamples") }] : []),
  ];
  return (
    <div className={styles.tickBody}>
      <div className={styles.tickBodyBar}>
        <Segmented label={t("ticks.view")} options={options} value={current} onChange={setView} />
      </div>
      {detail.error ? <p className={styles.error}>{detail.error}</p> : null}
      {!shown.complete ? <p className={styles.cardNote}>{t("ticks.partial")}</p> : null}
      {current === "steps" ? <SlowTickSteps tick={shown} usual={usual} /> : null}
      {current === "flame" ? <FlameGraph rows={tickFlame(shown)} mods={NO_MODS} kind="time" query="" /> : null}
      {current === "samples" ? (
        <FlameGraph rows={samples.rows} mods={NO_MODS} kind={amountKind(samples.reply?.unit)} query="" />
      ) : null}
    </div>
  );
}

function SlowTick({ reader, capture, tick, worst, usual }: Props & { tick: TickRow; worst: number; usual: ReadonlyMap<string, number> }) {
  const [open, setOpen] = useState(false);
  const opens = visibleSpans(tick).length > 0;
  return (
    <div className={styles.tickRow}>
      {!opens ? (
        <div className={styles.tickHead} data-static="true">
          <SlowTickLine tick={tick} worst={worst} opens={false} />
        </div>
      ) : (
        <details className={styles.tick} onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary className={styles.tickHead}>
            <SlowTickLine tick={tick} worst={worst} opens />
          </summary>
          {open ? <TickBody reader={reader} capture={capture} tick={tick} usual={usual} /> : null}
        </details>
      )}
      <span className={styles.tickTools}>
        <RowTools id={tick.id} name={at(tick.t)} />
      </span>
    </div>
  );
}

function Culprits({ ticks, usual, frames }: { ticks: readonly TickRow[]; usual: ReadonlyMap<string, number>; frames: boolean }) {
  const found = culprits(ticks, usual, CULPRITS);
  if (found.length === 0) return null;
  const most = found[0].extra || 1;
  return (
    <section>
      <h3 className={styles.cardTitle}>{t("ticks.culprits")}</h3>
      <p className={styles.cardNote}>{t(frames ? "ticks.culpritsNoteFrames" : "ticks.culpritsNoteTicks")}</p>
      <div className={styles.meterList}>
        <div className={styles.meterHead}>
          <span>{t("spans.name")}</span>
          <span />
          <span>{t("ticks.extra")}</span>
          <span>{t("ticks.largestIn")}</span>
        </div>
        {found.map((culprit) => (
          <div key={`${culprit.parent}>${culprit.name}`} className={styles.meterRow}>
            <span className={styles.meterName}>
              <span className={styles.nameText}>{culprit.name}</span>
              <RowTools id={spanId(culprit.name)} name={culprit.name} />
            </span>
            <span className={styles.meterTrack} aria-hidden="true">
              <span className={styles.meterFill} data-tone="warn" style={{ width: `${(culprit.extra / most) * 100}%` }} />
            </span>
            <span className={styles.meterValue}>{signed(culprit.extra)}</span>
            <span className={styles.meterExtra}>
              {t("ticks.largestInValue", { count: culprit.largestIn, total: ticks.length })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The slowest ticks (or frames) the capture kept, each opening into the spans that made it slow. */
export function TicksPanel({ reader, capture }: Props) {
  const [over, setOver] = useState("");
  const [everything, setEverything] = useState(false);
  const threshold = Number.parseFloat(over);
  const { rows, error } = useRows<TickRow>(reader, capture, "ticks", {
    worst: ALL_KEPT,
    ...(Number.isFinite(threshold) ? { over: threshold } : {}),
  });
  const average = useWholeRows<SpanRow>(reader, capture, "spans", { limit: 400 });
  const usual = useMemo(() => usualTimes(average.rows), [average.rows]);

  if (error) return <p className={styles.error}>{error}</p>;
  const unrecorded = rows.filter((tick) => tick.before_capture && visibleSpans(tick).length === 0);
  const kept = rows.filter((tick) => !unrecorded.includes(tick));
  const shown = everything ? kept : kept.slice(0, LISTED);
  const frames = capture.side === "client";
  const skipped = unrecorded.length > 0 ? (
    <p className={styles.cardNote}>
      {t(frames ? "ticks.skippedFrames" : "ticks.skippedTicks", { count: unrecorded.length })}
    </p>
  ) : null;
  const overBox = (
    <label className={tree.control}>
      <span className={tree.controlLabel}>{t(frames ? "ticks.overFrames" : "ticks.overTicks")}</span>
      <input
        type="number"
        min={0}
        className={tree.search}
        value={over}
        placeholder={t("ticks.overHint", { ms: OVER_MS })}
        onChange={(event) => setOver(event.target.value)}
      />
    </label>
  );
  if (shown.length === 0) {
    return (
      <div className={styles.summary}>
        {overBox}
        {skipped ?? <p className={styles.empty}>{t("meta.empty")}</p>}
      </div>
    );
  }
  const worst = shown[0].wall_ms || 1;
  const opens = shown.some((tick) => visibleSpans(tick).length > 0);
  const note = frames ? (opens ? "ticks.noteFrames" : "ticks.noteFramesPlain") : "ticks.note";
  return (
    <div className={styles.summary}>
      <header>
        <h3 className={styles.cardTitle}>
          {t(frames ? "ticks.headingFrames" : "ticks.headingTicks", { count: shown.length })}
        </h3>
        <p className={styles.cardNote}>{t(note)}</p>
        {skipped}
        {overBox}
      </header>
      <Culprits ticks={shown.filter((tick) => visibleSpans(tick).length > 0)} usual={usual} frames={frames} />
      <div className={styles.ticks}>
        {shown.map((tick) => (
          <SlowTick key={tick.id} reader={reader} capture={capture} tick={tick} worst={worst} usual={usual} />
        ))}
      </div>
      {!everything && kept.length > LISTED ? <ShowAll count={LISTED} onClick={() => setEverything(true)} /> : null}
    </div>
  );
}

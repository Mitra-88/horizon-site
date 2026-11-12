"use client";

import { Fragment, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { grouped, num } from "@/lib/perf/format";
import { gpuBusy, gpuReport, nearestFrame, niceCeil, passMs, stackFrames, stackPaths, typical } from "@/lib/perf/gpu";
import type { GpuCounts, GpuFrame, GpuPass, GpuReport, GpuRow, MsStats } from "@/lib/perf/gpu";
import { t } from "@/lib/perf/i18n";
import type { MarkRow } from "@/lib/perf/types";
import { Icons } from "./icons";
import { RowTools } from "./row-tools";
import { useRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

const LAYERS = 5;
const CHART_W = 1000;
const CHART_H = 220;

const layerStyle = (layer: number | string) => ({ "--layer": `var(--layer-${layer})` }) as CSSProperties;
const ms = (value: number | null | undefined) => (value == null ? num(value) : `${num(value, 3)} ms`);
const pct = (share: number | null | undefined) => (share == null ? num(share) : `${num(share * 100, 1)}%`);

export function GpuPanel({ reader, capture }: Props) {
  const gpu = useRows<GpuRow>(reader, capture, "gpu");
  const frames = useRows<GpuFrame>(reader, capture, "gpu_frames");
  const marks = useRows<MarkRow>(reader, capture, "marks");
  const report = useMemo(() => gpuReport(gpu.rows), [gpu.rows]);
  const order = useMemo(() => report.passes.map((p) => p.name), [report]);

  if (gpu.error) return <p className={styles.error}>{gpu.error}</p>;
  return (
    <div className={styles.summary}>
      <Verdict report={report} />
      {frames.rows.length > 0 ? (
        <GpuChart frames={frames.rows} order={order} marks={marks.rows} />
      ) : null}
      <PassTable report={report} />
      <Counters passes={report.passes} />
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardHeading}>
          <h3 className={styles.cardTitle}>{title}</h3>
          {note ? <p className={styles.cardNote}>{note}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function Verdict({ report }: { report: GpuReport }) {
  const { device, summary } = report;
  const bound = summary?.bound ?? null;
  const busy = gpuBusy(summary);
  const gpu = summary?.gpu_frame;
  const cpu = summary?.cpu_frame;
  const timed = (gpu?.samples ?? 0) > 0;
  const deviceLine = device
    ? [device.adapter, t(`gpu.backend.${device.backend}`), device.driver, t(`gpu.split.${device.pass_split}`)].filter(Boolean).join(" · ")
    : null;
  return (
    <section className={styles.gpuVerdict} data-bound={bound ?? "none"}>
      <div className={styles.gpuVerdictHead}>
        <p className={styles.gpuEyebrow}>{t("gpu.verdict")}</p>
        <h2 className={styles.gpuBound}>{t(bound ? `gpu.bound.${bound}` : timed ? "gpu.bound.unknown" : "gpu.bound.untimed")}</h2>
        <p className={styles.gpuExplain}>
          {bound
            ? t(`gpu.rule.${bound}`, { gpu: ms(gpu?.p50), cpu: ms(cpu?.p50) })
            : t(timed ? "gpu.rule.unknown" : "gpu.rule.untimed")}
        </p>
        {busy != null ? <p className={styles.gpuBusy}>{t("gpu.busy", { pct: num(busy * 100, 0) })}</p> : null}
      </div>
      {timed ? (
        <div className={styles.gpuFrames}>
          <FrameStats label={t("gpu.gpuFrame")} stats={gpu} keys={["p50", "p95", "p99", "max"]} />
          <FrameStats label={t("gpu.cpuFrame")} stats={cpu} keys={["p50", "p95", "p99"]} />
        </div>
      ) : null}
      {deviceLine ? <p className={styles.gpuDevice}>{deviceLine}</p> : null}
    </section>
  );
}

function FrameStats({ label, stats, keys }: { label: string; stats?: MsStats; keys: (keyof Omit<MsStats, "samples">)[] }) {
  return (
    <div className={styles.gpuFrameStats}>
      <p className={styles.statTitle}>
        {label} <span className={styles.gpuSamples}>{t("gpu.frames", { count: grouped(stats?.samples ?? 0) })}</span>
      </p>
      <dl>
        {keys.map((key) => (
          <div key={key}>
            <dt>{t(`gpu.${key}`)}</dt>
            <dd>{num(stats?.[key], 3)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PassTable({ report }: { report: GpuReport }) {
  const { passes, device } = report;
  const [open, setOpen] = useState<Set<string>>(() => new Set(passes[0]?.parts.length ? [passes[0].id] : []));
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const old = passes.length > 0 && passes.every((p) => p.samples === 0);
  const note =
    device?.pass_split === "passes_only" ? t("gpu.passesOnly") : old ? t("gpu.oldCapture") : t("gpu.passesNote");

  return (
    <Card title={t("gpu.passes")} note={note}>
      {passes.length === 0 ? (
        <p className={styles.empty}>{t("gpu.noPasses")}</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={`${styles.table} ${styles.gpuTable}`}>
            <thead>
              <tr>
                <th>{t("table.pass")}</th>
                <th aria-label={t("table.share")} />
                <th>{old ? t("gpu.median") : t("gpu.p50")}</th>
                <th>{t("gpu.p95")}</th>
                <th>{t("gpu.p99")}</th>
                <th>{t("gpu.max")}</th>
                <th>{t("table.share")}</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => {
                const expanded = open.has(pass.id);
                return (
                  <Fragment key={pass.id}>
                    <tr data-strong="true">
                      <td>
                        <span className={styles.tableName}>
                          {pass.parts.length > 0 ? (
                            <button
                              type="button"
                              className={styles.disclosure}
                              aria-expanded={expanded}
                              aria-label={t(expanded ? "gpu.collapse" : "gpu.expand", { name: pass.name })}
                              onClick={() => toggle(pass.id)}
                            >
                              {expanded ? <Icons.chevronDown width={14} height={14} /> : <Icons.chevronRight width={14} height={14} />}
                            </button>
                          ) : (
                            <span className={styles.disclosureSpace} />
                          )}
                          <span title={t(`gpu.source.${pass.source}`)}>{pass.name}</span>
                          <RowTools id={pass.id} name={pass.name} />
                        </span>
                      </td>
                      <ShareBar share={pass.share} />
                      <td>{num(typical(pass), 3)}</td>
                      <td>{num(pass.p95, 3)}</td>
                      <td>{num(pass.p99, 3)}</td>
                      <td>{num(pass.max, 3)}</td>
                      <td>{pct(pass.share)}</td>
                    </tr>
                    {expanded
                      ? pass.parts.map((part) => (
                          <tr key={`${pass.id}/${part.name}`} data-part="true">
                            <td>
                              <span className={styles.tableName}>
                                <span className={styles.disclosureSpace} />
                                {part.name}
                                {part.samples < pass.samples ? (
                                  <span className={styles.gpuSamples}>{t("gpu.someFrames", { count: grouped(part.samples) })}</span>
                                ) : null}
                              </span>
                            </td>
                            <ShareBar share={part.share} />
                            <td>{num(part.p50 ?? part.ms, 3)}</td>
                            <td>{num(part.p95, 3)}</td>
                            <td>{num(part.p99, 3)}</td>
                            <td>{num(part.max, 3)}</td>
                            <td>{pct(part.share)}</td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ShareBar({ share }: { share: number | null }) {
  return (
    <td className={styles.gpuBarCell} aria-hidden="true">
      <span className={styles.meterTrack}>
        <span className={styles.meterFill} style={{ width: `${Math.min(1, Math.max(0, share ?? 0)) * 100}%` }} />
      </span>
    </td>
  );
}

function GpuChart({ frames, order, marks }: { frames: GpuFrame[]; order: string[]; marks: MarkRow[] }) {
  const { layers, stacks } = useMemo(() => stackFrames(frames, order, LAYERS), [frames, order]);
  const top = useMemo(() => niceCeil(Math.max(...stacks.map((s) => s.total))), [stacks]);
  const paths = useMemo(() => stackPaths(stacks, CHART_W, CHART_H, top), [stacks, top]);
  const [picked, setPicked] = useState<number | null>(null);
  const first = stacks[0].t;
  const last = stacks[stacks.length - 1].t;
  const span = last - first || 1;
  const at = (time: number) => ((time - first) / span) * 100;
  const slow = stacks.filter((s) => s.slow);
  const inside = marks.filter((m) => m.t >= first && m.t <= last);
  const frame = picked == null ? null : frames[picked];
  const layerName = (name: string | null) => name ?? t("gpu.other");

  const pointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setPicked(nearestFrame(stacks, first + fraction * span));
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, (i: number) => number> = {
      ArrowLeft: (i) => i - step,
      ArrowRight: (i) => i + step,
      Home: () => 0,
      End: () => stacks.length - 1,
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setPicked((i) => Math.min(stacks.length - 1, Math.max(0, move(i ?? 0))));
    } else if (event.key === "Escape") setPicked(null);
  };

  return (
    <Card title={t("gpu.chart")} note={t("gpu.chartNote", { frames: grouped(frames.length), slow: grouped(slow.length) })}>
      <ul className={styles.gpuLegend}>
        {layers.map((name, i) => (
          <li key={name ?? "other"}>
            <span className={styles.gpuSwatch} style={layerStyle(i === layers.length - 1 ? "other" : i)} />
            {layerName(name)}
          </li>
        ))}
        {slow.length > 0 ? (
          <li>
            <span className={styles.gpuSwatch} style={layerStyle("slow")} />
            {t("gpu.slowFrame")}
          </li>
        ) : null}
      </ul>
      <div className={styles.gpuPlot}>
        <span className={styles.gpuAxisTop}>{`${num(top, 3)} ms`}</span>
        <span className={styles.gpuAxisZero}>0</span>
        <div
          className={styles.gpuChart}
          tabIndex={0}
          role="img"
          aria-label={t("gpu.chartLabel")}
          onPointerMove={pointer}
          onPointerDown={pointer}
          onPointerLeave={() => setPicked(null)}
          onKeyDown={key}
          onBlur={() => setPicked(null)}
        >
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} className={styles.gpuGrid} x1={0} x2={CHART_W} y1={CHART_H * f} y2={CHART_H * f} />
            ))}
            {paths.map((d, i) => (
              <path key={i} d={d} className={styles.gpuArea} style={layerStyle(i === paths.length - 1 ? "other" : i)} />
            ))}
            {slow.map((s) => (
              <line key={s.t} className={styles.gpuSlow} x1={(at(s.t) / 100) * CHART_W} x2={(at(s.t) / 100) * CHART_W} y1={0} y2={CHART_H} />
            ))}
          </svg>
          {inside.map((m) => (
            <span key={`${m.t}-${m.name}`} className={styles.gpuMark} style={{ left: `${at(m.t)}%` }} title={m.name}>
              <span>{m.name}</span>
            </span>
          ))}
          {frame && picked != null ? (
            <>
              <span className={styles.gpuGuide} style={{ left: `${at(stacks[picked].t)}%` }} />
              <FrameTip frame={frame} side={at(stacks[picked].t) > 55 ? "left" : "right"} x={at(stacks[picked].t)} />
            </>
          ) : null}
        </div>
        <span className={styles.gpuAxisStart}>{`${num(first, 1)} s`}</span>
        <span className={styles.gpuAxisEnd}>{`${num(last, 1)} s`}</span>
      </div>
    </Card>
  );
}

function FrameTip({ frame, side, x }: { frame: GpuFrame; side: "left" | "right"; x: number }) {
  const passes = [...frame.passes].sort((a, b) => passMs(b) - passMs(a));
  const place = side === "right" ? { left: `calc(${x}% + 12px)` } : { right: `calc(${100 - x}% + 12px)` };
  return (
    <div className={styles.gpuTip} style={place} role="status" aria-live="polite">
      <p className={styles.gpuTipHead}>
        <span>{t("gpu.frameAt", { time: `${num(frame.t, 2)} s` })}</span>
        <strong>{ms(frame.total_ms)}</strong>
      </p>
      {frame.slow ? (
        <p className={styles.gpuTipSlow}>
          {frame.slow_wall_ms != null ? t("gpu.slowWall", { ms: num(frame.slow_wall_ms, 1) }) : t("gpu.slowFrame")}
        </p>
      ) : null}
      <dl>
        {passes.map((pass) => (
          <Fragment key={pass.name}>
            <div>
              <dt>{pass.name}</dt>
              <dd>{num(passMs(pass), 3)}</dd>
            </div>
            {[...pass.parts]
              .sort((a, b) => b.ms - a.ms)
              .slice(0, 3)
              .map((part) => (
                <div key={part.name} data-part="true">
                  <dt>{part.name}</dt>
                  <dd>{num(part.ms, 3)}</dd>
                </div>
              ))}
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

const COUNTS: [keyof GpuCounts, string][] = [
  ["vertex_shader_invocations", "gpu.count.vertices"],
  ["clipper_primitives_out", "gpu.count.primitives"],
  ["fragment_shader_invocations", "gpu.count.fragments"],
];

function Counters({ passes }: { passes: GpuPass[] }) {
  const counted = passes.filter((p) => p.counters);
  if (counted.length === 0) return null;
  return (
    <Card title={t("gpu.counters")} note={t("gpu.countersNote")}>
      <div className={styles.tableScroll}>
        <table className={`${styles.table} ${styles.gpuTable}`}>
          <thead>
            <tr>
              <th>{t("table.pass")}</th>
              {COUNTS.map(([, label]) => (
                <th key={label}>{t(label)}</th>
              ))}
              <th>{t("gpu.count.overdraw")}</th>
            </tr>
          </thead>
          <tbody>
            {counted.map((pass) => (
              <Fragment key={pass.id}>
                <tr data-strong="true">
                  <td>{pass.name}</td>
                  {COUNTS.map(([field]) => (
                    <td key={field}>{grouped(pass.counters!.total[field])}</td>
                  ))}
                  <td>{num(pass.counters!.fragments_per_pixel, 2)}</td>
                </tr>
                {pass.counters!.parts.map((part) => (
                  <tr key={part.name} data-part="true">
                    <td>
                      <span className={styles.gpuIndent}>{part.name}</span>
                    </td>
                    {COUNTS.map(([field]) => (
                      <td key={field}>{grouped(part.counts[field])}</td>
                    ))}
                    <td />
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

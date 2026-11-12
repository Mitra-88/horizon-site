"use client";

import { useMemo, useState } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { mergeFilters, windowSeconds, wireFilters } from "@/lib/perf/filters";
import { num } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import { EVERY_CHOICES, autoEvery, counterField, everyFits, fieldName } from "@/lib/perf/pins";
import { QUERY_FILE } from "@/lib/perf/query-text";
import { linePath, timelinePoints } from "@/lib/perf/timeline";
import type { Envelope, QueryRequest, SeriesRow } from "@/lib/perf/types";
import { useFilters } from "./filters-context";
import { Icons } from "./icons";
import { usePins } from "./pins-context";
import { useLogQueries } from "./query-log";
import type { LoggedQuery } from "./query-log";
import { replyError } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./chart.module.css";
import page from "./page.module.css";

const WIDTH = 1000;
const HEIGHT = 140;

/** Room above and below so a line at an extreme is not cut by the plot's edge. */
const PAD = 5;
const COLORS = 6;

interface Pinned {
  field: string;
  request: QueryRequest;
  reply: Envelope<SeriesRow> | null;
  row: SeriesRow | null;
  error: string | null;
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Legend({ item, color, onRemove }: { item: Pinned; color: number; onRemove: () => void }) {
  const stats = item.row?.stats;
  return (
    <li className={styles.legend} data-color={color}>
      <span className={styles.swatch} aria-hidden="true" />
      <span className={styles.name}>{fieldName(item.field)}</span>
      {item.row ? <span className={styles.unit}>{item.row.unit}</span> : null}
      {item.error ? <span className={styles.problem}>{item.error}</span> : null}
      {stats ? (
        <dl className={styles.stats}>
          {(["min", "mean", "p95", "max", "last"] as const).map((key) => (
            <div key={key}>
              <dt>{t(`chart.stat.${key}`)}</dt>
              <dd>{num(stats[key], 2)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <button type="button" className={styles.remove} aria-label={t("chart.unpin", { name: fieldName(item.field) })} onClick={onRemove}>
        <Icons.close width={12} height={12} />
      </button>
    </li>
  );
}

function AddCounter() {
  const pins = usePins();
  const [text, setText] = useState("");
  return (
    <form
      className={styles.add}
      onSubmit={(event) => {
        event.preventDefault();
        const field = counterField(text);
        if (field && !pins.has(field)) pins.toggle(field);
        setText("");
      }}
    >
      <input className={styles.input} aria-label={t("chart.counter")} placeholder={t("chart.counterHint")} value={text} onChange={(event) => setText(event.target.value)} />
      <button type="submit" className={page.buttonSmall} disabled={counterField(text) === null}>
        {t("chart.counterAdd")}
      </button>
    </form>
  );
}

/** The fields pinned from any view as lines over time, each scaled to its own highest point; the time range narrows it. */
export function PinnedChart({ reader, capture }: { reader: HorizonPerf; capture: LoadedCapture }) {
  const pins = usePins();
  const { filters, marks, seconds } = useFilters();
  const window = windowSeconds(filters.range, seconds, marks);
  const every = pins.every ?? autoEvery(window);
  const fits = everyFits(every, window);

  const items = useMemo((): Pinned[] => {
    return pins.fields.map((field) => {
      const request: QueryRequest = {
        op: "series",
        args: [field],
        file: QUERY_FILE,
        filters: mergeFilters({ side: capture.side, ...wireFilters(filters, "series") }, { every, stats: true }),
      };
      if (!fits) return { field, request, reply: null, row: null, error: t("chart.tooMany") };
      try {
        const reply = reader.query<SeriesRow>(capture.handle, request);
        return reply.ok
          ? { field, request, reply, row: reply.rows[0] ?? null, error: null }
          : { field, request, reply, row: null, error: replyError(reply.error) };
      } catch (problem) {
        return { field, request, reply: null, row: null, error: failure(problem) };
      }
    });
  }, [pins.fields, reader, capture.handle, capture.side, filters, every, fits]);

  const logged = useMemo((): LoggedQuery[] => items.map((item) => ({ request: item.request, reply: item.reply as Envelope<unknown> | null })), [items]);
  useLogQueries(logged);

  const first = items.find((item) => item.reply?.selection)?.reply?.selection;
  const from = first?.from ?? 0;
  const to = first?.to ?? seconds;
  const span = to - from;

  if (pins.fields.length === 0) return null;
  return (
    <section className={styles.chart} aria-label={t("chart.title")}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t("chart.title")}</h2>
        <span className={styles.window}>{t("chart.window", { from: num(from, 1), to: num(to, 1) })}</span>
        <label className={styles.every}>
          <span>{t("chart.every")}</span>
          <select
            className={page.select}
            value={pins.every === null ? "" : String(pins.every)}
            onChange={(event) => pins.setEvery(event.target.value === "" ? null : Number(event.target.value))}
          >
            <option value="">{t("chart.everyAuto", { seconds: every })}</option>
            {EVERY_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {t("chart.everyValue", { seconds: choice })}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={page.buttonSmall} onClick={pins.clear}>
          {t("chart.clear")}
        </button>
      </header>
      <svg className={styles.plot} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={t("chart.title")}>
        {items.map((item, at) =>
          item.row ? (
            <path
              key={item.field}
              className={styles.line}
              data-color={at % COLORS}
              transform={`translate(0 ${PAD})`}
              d={linePath(timelinePoints(item.row.t.map((time) => time - from), item.row.values, span, WIDTH, HEIGHT - 2 * PAD))}
            />
          ) : null,
        )}
      </svg>
      <ul className={styles.legends}>
        {items.map((item, at) => (
          <Legend key={item.field} item={item} color={at % COLORS} onRemove={() => pins.toggle(item.field)} />
        ))}
      </ul>
      <p className={styles.note}>{t("chart.note")}</p>
      <AddCounter />
    </section>
  );
}

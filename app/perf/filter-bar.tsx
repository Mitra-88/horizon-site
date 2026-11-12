"use client";

import { useState } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { CONTEXT_FILTER_KEYS, chipsOf, contextLabel, isDefault, rangeBetweenMarks, rangeSeconds, withContext, withoutChip } from "@/lib/perf/filters";
import type { Bound, CaptureFilters, Chip, TimeRange } from "@/lib/perf/filters";
import { at, num } from "@/lib/perf/format";
import { stepFor } from "@/lib/perf/health";
import { t } from "@/lib/perf/i18n";
import type { ContextKey, GroupRow, SeriesRow } from "@/lib/perf/types";
import { useFilters } from "./filters-context";
import { Icons } from "./icons";
import { Timeline } from "./timeline";
import { useWholeRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./filters.module.css";
import page from "./page.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

const MARK_NONE = "";

function boundText(bound: Bound): string {
  return bound.kind === "mark" ? bound.name : at(bound.seconds);
}

function chipText(chip: Chip, filters: CaptureFilters): string {
  switch (chip.key) {
    case "range":
      return filters.range ? t("filters.chip.range", { from: boundText(filters.range.from), to: boundText(filters.range.to) }) : "";
    case "thread":
      return t("filters.chip.thread", { name: filters.thread ?? "" });
    case "select":
      return t("filters.chip.select", { kind: t(`filters.kind.${filters.select}`) });
    case "slow":
      return t("filters.chip.slow");
    default:
      return t("filters.chip.context", { key: t(`filters.key.${chip.key}`), value: contextLabel(chip.value ?? "") });
  }
}

function ContextAdd({ reader, capture }: Props) {
  const { setFilters } = useFilters();
  const [key, setKey] = useState<ContextKey>("entity");
  const [value, setValue] = useState("");
  const listed = useWholeRows<GroupRow>(reader, capture, "group", { by: key, limit: 100 });
  const names = listed.rows.filter((row) => row.key !== null);
  const add = () => {
    setFilters((current) => withContext(current, key, value));
    setValue("");
  };
  return (
    <form
      className={styles.contextAdd}
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <label className={styles.control}>
        <span className={styles.controlLabel}>{t("filters.context")}</span>
        <span className={styles.contextRow}>
          <select className={page.select} aria-label={t("filters.contextKey")} value={key} onChange={(event) => setKey(event.target.value as ContextKey)}>
            {CONTEXT_FILTER_KEYS.map((id) => (
              <option key={id} value={id}>
                {t(`filters.key.${id}`)}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            list={`filter-values-${key}`}
            aria-label={t("filters.contextValue")}
            placeholder={t("filters.contextHint")}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <datalist id={`filter-values-${key}`}>
            {names.map((row) => (
              <option key={row.key} value={row.key ?? ""} label={row.label} />
            ))}
          </datalist>
          <button type="submit" className={page.buttonSmall} disabled={value.trim() === ""}>
            {t("filters.add")}
          </button>
        </span>
      </label>
    </form>
  );
}

function RangeControls() {
  const { filters, setFilters, marks, seconds } = useFilters();
  const ends = filters.range ? rangeSeconds(filters.range, marks) : null;
  const [fromMark, setFromMark] = useState(MARK_NONE);
  const [toMark, setToMark] = useState(MARK_NONE);
  const find = (name: string) => marks.find((mark) => mark.name === name);

  const pick = (nextFrom: string, nextTo: string) => {
    const [a, b] = [find(nextFrom), find(nextTo)];
    if (!a || !b) return;
    const range = rangeBetweenMarks(a, b);
    if (range) setFilters((current) => ({ ...current, range }));
  };
  const edit = (index: 0 | 1, text: string) => {
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) return;
    const current = ends ?? [0, seconds];
    const next: [number, number] = index === 0 ? [value, current[1]] : [current[0], value];
    if (next[1] - next[0] <= 0) return;
    const range: TimeRange = {
      from: { kind: "seconds", seconds: Math.max(0, next[0]) },
      to: { kind: "seconds", seconds: Math.min(seconds, next[1]) },
    };
    setFilters((now) => ({ ...now, range }));
  };

  return (
    <div className={styles.rangeControls}>
      <label className={styles.control}>
        <span className={styles.controlLabel}>{t("filters.from")}</span>
        <input
          className={styles.number}
          type="number"
          min={0}
          max={seconds}
          step={0.1}
          value={ends ? Number(ends[0].toFixed(3)) : 0}
          onChange={(event) => edit(0, event.target.value)}
        />
      </label>
      <label className={styles.control}>
        <span className={styles.controlLabel}>{t("filters.to")}</span>
        <input
          className={styles.number}
          type="number"
          min={0}
          max={seconds}
          step={0.1}
          value={ends ? Number(ends[1].toFixed(3)) : Number(seconds.toFixed(3))}
          onChange={(event) => edit(1, event.target.value)}
        />
      </label>
      {marks.length >= 2 ? (
        <>
          <label className={styles.control}>
            <span className={styles.controlLabel}>{t("filters.fromMark")}</span>
            <select
              className={page.select}
              value={fromMark}
              onChange={(event) => {
                setFromMark(event.target.value);
                pick(event.target.value, toMark);
              }}
            >
              <option value={MARK_NONE}>{t("filters.noMark")}</option>
              {marks.map((mark) => (
                <option key={mark.name} value={mark.name}>
                  {mark.name} · {at(mark.t)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.control}>
            <span className={styles.controlLabel}>{t("filters.toMark")}</span>
            <select
              className={page.select}
              value={toMark}
              onChange={(event) => {
                setToMark(event.target.value);
                pick(fromMark, event.target.value);
              }}
            >
              <option value={MARK_NONE}>{t("filters.noMark")}</option>
              {marks.map((mark) => (
                <option key={mark.name} value={mark.name}>
                  {mark.name} · {at(mark.t)}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
    </div>
  );
}

/** The filters every view of the capture shares: a time range, the thread, the sample kind, slow-only and contexts. */
export function FilterBar({ reader, capture }: Props) {
  const { filters, setFilters, options, marks, seconds } = useFilters();
  const field = capture.side === "client" ? "h:frame_ms_p95" : "h:mspt_p95";
  const line = useWholeRows<SeriesRow>(reader, capture, "series", { every: stepFor(seconds) }, seconds > 0, [field]);
  const ends = filters.range ? rangeSeconds(filters.range, marks) : null;
  const chips = chipsOf(filters);
  const threads = options.threads;
  const thread = filters.thread ?? options.thread ?? "";

  return (
    <section className={styles.bar} aria-label={t("filters.title")}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t("filters.title")}</h2>
        <span className={styles.rangeText}>
          {ends
            ? t("filters.rangeOf", { from: at(ends[0]), to: at(ends[1]), total: num(seconds, 1) })
            : t("filters.wholeCapture", { total: num(seconds, 1) })}
        </span>
        <button type="button" className={page.buttonSmall} disabled={isDefault(filters)} onClick={() => setFilters((current) => ({ ...current, range: null, thread: null, select: "cpu", slow: false, where: {} }))}>
          {t("filters.reset")}
        </button>
      </header>
      {seconds > 0 ? (
        <Timeline
          seconds={seconds}
          series={line.rows[0] ?? null}
          marks={marks}
          selected={ends}
          onRange={(range) => setFilters((current) => ({ ...current, range }))}
        />
      ) : null}
      <p className={styles.hint}>{t("filters.timelineHint")}</p>
      <div className={styles.controls}>
        {seconds > 0 ? <RangeControls /> : null}
        {threads.length > 1 ? (
          <label className={styles.control}>
            <span className={styles.controlLabel}>{t("filters.thread")}</span>
            <select
              className={page.select}
              value={thread}
              onChange={(event) => {
                const picked = event.target.value;
                setFilters((current) => ({ ...current, thread: picked === options.thread ? null : picked }));
              }}
            >
              {threads.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {options.kinds.length > 1 ? (
          <label className={styles.control}>
            <span className={styles.controlLabel}>{t("filters.kindLabel")}</span>
            <select
              className={page.select}
              value={filters.select}
              onChange={(event) => {
                const next = options.kinds.find((kind) => kind === event.target.value);
                if (next) setFilters((current) => ({ ...current, select: next }));
              }}
            >
              {options.kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`filters.kind.${kind}`)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {options.slow ? (
          <div className={styles.control}>
            <span className={styles.controlLabel}>{t(capture.side === "client" ? "filters.slowFrames" : "filters.slowTicks")}</span>
            <button
              type="button"
              className={page.buttonSmall}
              aria-pressed={filters.slow}
              onClick={() => setFilters((current) => ({ ...current, slow: !current.slow }))}
            >
              {t("filters.slowOnly")}
            </button>
          </div>
        ) : null}
        {options.kinds.length > 0 ? <ContextAdd reader={reader} capture={capture} /> : null}
      </div>
      {chips.length > 0 ? (
        <ul className={styles.chips} aria-label={t("filters.active")}>
          {chips.map((chip) => (
            <li key={chip.id} className={styles.chip}>
              <span>{chipText(chip, filters)}</span>
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={t("filters.remove", { name: chipText(chip, filters) })}
                onClick={() => setFilters((current) => withoutChip(current, chip))}
              >
                <Icons.close width={12} height={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

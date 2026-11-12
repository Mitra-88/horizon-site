"use client";

import { useState } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { grouped, num } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import { phaseTree, type PhaseNode } from "@/lib/perf/overview";
import { spanField } from "@/lib/perf/pins";
import type { SpanRow } from "@/lib/perf/types";
import { useChanges } from "./comparison";
import { Delta, NewRows } from "./delta";
import { Icons } from "./icons";
import { RowTools } from "./row-tools";
import { PinButton } from "./pin-button";
import { ShowAll, useLimit } from "./show-all";
import { useRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";
import tree from "./tree.module.css";

const VISIBLE_MS = 0.005;

const SPAN_LIMIT = 200;

/** How deep the tree starts open: enough to read the phases, not every small step. */
const OPEN_DEPTH = 2;

/** Waiting worth pointing at: a thread that lost a tenth of a span's time to something else. */
const WAITING_SHARE = 0.1;

type Opening = "default" | "all" | "none";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

interface RowContext {
  max: number;
  total: number;
  isOpen: (node: PhaseNode, depth: number) => boolean;
  toggle: (id: string) => void;
  changes: ReturnType<typeof useChanges>;
}

function SpanLine({ node, depth, context }: { node: PhaseNode; depth: number; context: RowContext }) {
  const open = context.isOpen(node, depth);
  const waiting = node.waited >= node.ms * WAITING_SHARE && node.waited >= VISIBLE_MS;
  const worked = Math.max(0, node.ms - node.waited);
  return (
    <>
      <div className={styles.spanRow}>
        <span className={styles.meterName} title={node.name} style={{ paddingLeft: depth * 14 }}>
          {node.children.length > 0 ? (
            <button
              type="button"
              className={styles.disclosure}
              aria-expanded={open}
              aria-label={t(open ? "tree.collapse" : "tree.expand", { name: node.name })}
              onClick={() => context.toggle(node.id)}
            >
              {open ? <Icons.chevronDown /> : <Icons.chevronRight />}
            </button>
          ) : (
            <span className={styles.disclosureSpace} />
          )}
          <span className={styles.nameText}>{node.name}</span>
          <RowTools id={node.id} name={node.name} />
          <PinButton field={spanField(node.name)} />
        </span>
        <span className={styles.spanTrack} aria-hidden="true">
          <span className={styles.meterFill} style={{ width: `${(worked / context.max) * 100}%` }} />
          <span
            className={styles.meterFill}
            data-tone="warn"
            style={{ width: `${(node.waited / context.max) * 100}%` }}
          />
        </span>
        <span className={styles.meterValue}>{num(node.ms, 2)} ms</span>
        {context.changes ? <Delta row={context.changes.changes.get(node.id)} /> : null}
        <span className={styles.meterExtra}>{num(node.cpu, 2)} ms</span>
        <span className={styles.meterExtra} data-waiting={waiting}>
          {num(node.waited, 2)} ms
        </span>
        <span className={styles.meterExtra}>{num(node.pct, 1)}%</span>
        <span className={styles.spanRan}>
          {t("spans.ranInValue", { seen: grouped(node.seen), total: grouped(context.total) })}
        </span>
      </div>
      {open
        ? node.children.map((child) => (
            <SpanLine key={child.id} node={child} depth={depth + 1} context={context} />
          ))
        : null}
    </>
  );
}

/** Every timed step as a tree: measured on every tick or frame, so waiting and rare steps show here. */
export function SpansPanel({ reader, capture }: Props) {
  const [opening, setOpening] = useState<Opening>("default");
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  const [names, setNames] = useState("");
  const cap = useLimit(SPAN_LIMIT);
  const wanted = names.split(",").map((name) => name.trim()).filter((name) => name !== "");
  const { rows, error, reply } = useRows<SpanRow>(reader, capture, "spans", {
    limit: cap.limit,
    ...(wanted.length > 0 ? { names: wanted } : {}),
  });
  const compare = useChanges();
  const frames = capture.side === "client";

  const namesBox = (
    <label className={tree.control}>
      <span className={tree.controlLabel}>{t("spans.only")}</span>
      <input
        type="search"
        className={tree.search}
        value={names}
        placeholder={t("spans.onlyHint")}
        onChange={(event) => setNames(event.target.value)}
      />
    </label>
  );
  if (error) {
    return (
      <div className={styles.summary}>
        {namesBox}
        <p className={styles.error}>{error}</p>
        {reply?.candidates?.length ? (
          <p className={styles.note}>{t("spans.candidates", { list: reply.candidates.map((item) => item.name).join(", ") })}</p>
        ) : null}
      </div>
    );
  }
  if (rows.length === 0 && wanted.length === 0) return <p className={styles.empty}>{t("meta.empty")}</p>;

  const shown = rows.filter((row) => (row.values[0] ?? 0) >= VISIBLE_MS);
  const roots = phaseTree(shown);
  const max = roots.reduce((m, node) => Math.max(m, node.ms), 0) || 1;
  const counted = reply?.selection?.ticks;
  const total = typeof counted === "number" ? counted : Math.max(...roots.map((node) => node.seen), 0);

  const isOpen = (node: PhaseNode, depth: number) => {
    const starts = opening === "all" || (opening === "default" && depth < OPEN_DEPTH);
    return toggled.has(node.id) ? !starts : starts;
  };
  const toggle = (id: string) =>
    setToggled((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const openAll = (value: Opening) => {
    setOpening(value);
    setToggled(new Set());
  };
  const context: RowContext = { max, total, isOpen, toggle, changes: compare };

  return (
    <div className={styles.summary}>
      <header className={styles.summaryHead}>
        <p className={styles.cardNote}>{t(frames ? "spans.noteFrames" : "spans.noteTicks")}</p>
        <div className={styles.actions}>
          {namesBox}
          <button type="button" className={styles.buttonSmall} onClick={() => openAll("all")}>
            {t("spans.expandAll")}
          </button>
          <button type="button" className={styles.buttonSmall} onClick={() => openAll("none")}>
            {t("tree.collapseAll")}
          </button>
        </div>
      </header>
      <div>
        <div className={styles.spanHead} data-delta={compare ? "value" : undefined}>
          <span>{t("spans.name")}</span>
          <span />
          <span>{t(frames ? "summary.msPerFrame" : "summary.msPerTick")}</span>
          {compare ? <span>{t("compare.columnChange")}</span> : null}
          <span>{t("spans.cpu")}</span>
          <span>{t("spans.waited")}</span>
          <span>{t("spans.share")}</span>
          <span>{t("spans.ranIn")}</span>
        </div>
        <div className={styles.spanList} data-delta={compare ? "value" : undefined}>
          {roots.map((node) => (
            <SpanLine key={node.id} node={node} depth={0} context={context} />
          ))}
        </div>
        {cap.capped(rows.length) ? <ShowAll count={rows.length} onClick={cap.show} /> : null}
        {rows.length > shown.length ? (
          <p className={styles.note}>{t("spans.hidden", { count: rows.length - shown.length })}</p>
        ) : null}
      </div>
      {compare ? <NewRows rows={compare.rows} prefix="s:" shown={new Set(rows.map((row) => row.id))} /> : null}
    </div>
  );
}

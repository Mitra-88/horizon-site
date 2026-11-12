"use client";

import { useState } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { num, grouped } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import { UNKNOWN_LABEL, changeTone, snapshotLabels } from "@/lib/perf/memory";
import type { MemoryChange, MemoryDiffRow, MemoryRow } from "@/lib/perf/types";
import { ShowAll, useLimit } from "./show-all";
import { useRows, useWholeRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";
import tree from "./tree.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

const MEMORY_LIMIT = 25;

function signed(value: number, digits: number): string {
  return `${value > 0 ? "+" : ""}${num(value, digits)}`;
}

function Changes({ title, rows, unit }: { title: string; rows: readonly MemoryChange[]; unit: "mb" | "count" }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h3 className={styles.cardTitle}>{title}</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("meta.path")}</th>
            <th>{t("memory.before")}</th>
            <th>{t("memory.after")}</th>
            <th>{t("memory.change")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} data-tone={changeTone(row)}>
              <td>{row[0]}</td>
              <td>{unit === "mb" ? num(row[1], 1) : grouped(row[1])}</td>
              <td>{unit === "mb" ? num(row[2], 1) : grouped(row[2])}</td>
              <td>{unit === "mb" ? signed(row[3], 1) : `${row[3] > 0 ? "+" : ""}${grouped(row[3])}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Only({ title, paths }: { title: string; paths: readonly string[] }) {
  if (paths.length === 0) return null;
  return (
    <section>
      <h3 className={styles.cardTitle}>{title}</h3>
      <ul className={styles.chips}>
        {paths.map((path) => (
          <li key={path} className={styles.chip}>
            {path}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Diff({ diff }: { diff: MemoryDiffRow }) {
  return (
    <div className={styles.summary}>
      <p className={styles.cardNote}>{t("memory.between", { from: diff.from, to: diff.to, seconds: num(diff.seconds, 1) })}</p>
      {diff.resident_mb ? (
        <p className={styles.cardNote}>
          {t("memory.resident", { before: num(diff.resident_mb[0], 1), after: num(diff.resident_mb[1], 1), change: signed(diff.resident_mb[2], 1) })}
        </p>
      ) : null}
      <Changes title={t("memory.grew")} rows={diff.grew_mb} unit="mb" />
      <Changes title={t("memory.shrank")} rows={diff.shrank_mb} unit="mb" />
      <Changes title={t("memory.counts")} rows={diff.counts} unit="count" />
      <Only title={t("memory.onlyBefore", { label: diff.from })} paths={diff.only_in_a} />
      <Only title={t("memory.onlyAfter", { label: diff.to })} paths={diff.only_in_b} />
    </div>
  );
}

export function MemoryPanel({ reader, capture }: Props) {
  const labels = snapshotLabels(useWholeRows<MemoryRow>(reader, capture, "memory", {}, true, [UNKNOWN_LABEL]).reply ?? { ok: false, op: "memory", rows: [], warnings: [] });
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [minMb, setMinMb] = useState("");
  const cap = useLimit(MEMORY_LIMIT);
  const min = Number.parseFloat(minMb);
  const shownFirst = first || labels[labels.length - 1] || "";
  const comparing = second !== "" && second !== shownFirst;
  const args = comparing ? [shownFirst, second] : first ? [first] : [];
  const request = {
    limit: cap.limit,
    ...(Number.isFinite(min) ? { min_mb: min } : {}),
    ...(comparing ? { diff: true } : {}),
  };
  const { rows, error, reply } = useRows<MemoryRow | MemoryDiffRow>(reader, capture, "memory", request, true, args);

  if (error && !/memory snapshots/i.test(error) && labels.length === 0) return <p className={styles.error}>{error}</p>;
  if (labels.length === 0 && rows.length === 0) return <p className={styles.empty}>{t("meta.noMemory")}</p>;

  const controls = (
    <div className={tree.controls}>
      {labels.length > 1 ? (
        <>
          <label className={tree.control}>
            <span className={tree.controlLabel}>{t("memory.snapshot")}</span>
            <select className={styles.select} value={shownFirst} onChange={(event) => setFirst(event.target.value)}>
              {labels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={tree.control}>
            <span className={tree.controlLabel}>{t("memory.compareWith")}</span>
            <select className={styles.select} value={second} onChange={(event) => setSecond(event.target.value)}>
              <option value="">{t("memory.noDiff")}</option>
              {labels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <label className={tree.control}>
        <span className={tree.controlLabel}>{t("memory.minMb")}</span>
        <input type="number" min={0} step={0.5} className={tree.search} value={minMb} placeholder={t("memory.minMbHint")} onChange={(event) => setMinMb(event.target.value)} />
      </label>
    </div>
  );

  if (error) {
    return (
      <div className={styles.summary}>
        {controls}
        <p className={styles.error}>{error}</p>
      </div>
    );
  }
  const diff = comparing ? (rows[0] as MemoryDiffRow | undefined) : undefined;
  return (
    <div className={styles.summary}>
      {controls}
      {diff ? (
        <Diff diff={diff} />
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("meta.path")}</th>
                <th>{t("meta.value")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as MemoryRow[]).map((row) => (
                <tr key={row.id}>
                  <td>{row.path}</td>
                  <td>{row.unit === "mb" ? `${num(row.value, 1)} MiB` : grouped(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cap.capped(rows.length) && reply ? <ShowAll count={rows.length} onClick={cap.show} /> : null}
        </>
      )}
    </div>
  );
}

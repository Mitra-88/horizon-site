"use client";

import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { num } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import type { MarkRow } from "@/lib/perf/types";
import { ShowAll, useLimit } from "./show-all";
import { useRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

const READER_DEFAULT_LIMIT = 25;

export function MarksPanel({ reader, capture }: Props) {
  const cap = useLimit(READER_DEFAULT_LIMIT);
  const { rows, error } = useRows<MarkRow>(reader, capture, "marks", { limit: cap.limit });
  if (error) return <p className={styles.error}>{error}</p>;
  if (rows.length === 0) return <p className={styles.empty}>{t("meta.empty")}</p>;
  return (
    <>
      <div className={styles.meterList}>
        {rows.map((row) => (
          <div key={`${row.t}-${row.name}`} className={styles.meterRow}>
            <span className={styles.meterName}>{row.name}</span>
            <span />
            <span className={styles.meterValue}>{t("summary.at", { time: `${num(row.t, 1)} s` })}</span>
            <span />
          </div>
        ))}
      </div>
      {cap.capped(rows.length) ? <ShowAll count={rows.length} onClick={cap.show} /> : null}
    </>
  );
}

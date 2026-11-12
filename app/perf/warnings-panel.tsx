"use client";

import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { num } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import type { WarningRow } from "@/lib/perf/types";
import { ShowAll, useLimit } from "./show-all";
import { useRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

const READER_DEFAULT_LIMIT = 25;

export function WarningsPanel({ reader, capture }: Props) {
  const cap = useLimit(READER_DEFAULT_LIMIT);
  const { rows, error } = useRows<WarningRow>(reader, capture, "warnings", { limit: cap.limit });
  if (error) return <p className={styles.error}>{error}</p>;
  if (rows.length === 0) return <p className={styles.empty}>{t("meta.empty")}</p>;
  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("table.time")}</th>
            <th>{t("table.warning")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.t}-${index}`}>
              <td>{num(row.t, 1)} s</td>
              <td>{t(`${row.code}`, { seconds: num(row.args[0] ?? 0, 0), mib: num((row.args[1] ?? 0) / (1024 * 1024), 1) })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cap.capped(rows.length) ? <ShowAll count={rows.length} onClick={cap.show} /> : null}
    </>
  );
}

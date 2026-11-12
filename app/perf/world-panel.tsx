"use client";

import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { grouped, shortId } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import type { DimensionRow } from "@/lib/perf/types";
import { RowTools } from "./row-tools";
import { ShowAll, useLimit } from "./show-all";
import { useRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

const READER_DEFAULT_LIMIT = 25;

export function WorldPanel({ reader, capture }: Props) {
  const cap = useLimit(READER_DEFAULT_LIMIT);
  const { rows, error } = useRows<DimensionRow>(reader, capture, "world", { limit: cap.limit });
  if (error) return <p className={styles.error}>{error}</p>;
  if (rows.length === 0) return <p className={styles.empty}>{t("meta.noWorld")}</p>;
  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("meta.dimension")}</th>
            <th>{t("meta.chunks")}</th>
            <th>{t("meta.entities")}</th>
            <th>{t("meta.blockEntities")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td title={row.name}>
                <span className={styles.tableName}>
                  {shortId(row.name)}
                  <RowTools id={row.id} name={row.name} />
                </span>
              </td>
              <td>{grouped(row.chunks)}</td>
              <td>{grouped(row.entities)}</td>
              <td>{grouped(row.block_entities)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cap.capped(rows.length) ? <ShowAll count={rows.length} onClick={cap.show} /> : null}
    </>
  );
}

"use client";

import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { grouped, num } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import type { NetPlayerRow, NetTotalRow } from "@/lib/perf/types";
import { RowTools } from "./row-tools";
import { PinButton } from "./pin-button";
import { ShowAll, useLimit } from "./show-all";
import { useRows } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

const READER_DEFAULT_LIMIT = 25;

/** The player's own name; captures from before names were kept only have the join order. */
function playerName(row: NetPlayerRow): string {
  return row.name || t("net.playerN", { n: row.index });
}

export function NetworkPanel({ reader, capture }: Props) {
  const cap = useLimit(READER_DEFAULT_LIMIT);
  const { rows, error } = useRows<NetTotalRow | NetPlayerRow>(reader, capture, "net", { limit: cap.limit });

  if (error) return <p className={styles.error}>{error}</p>;
  const total = rows.find((row): row is NetTotalRow => "players" in row);
  const players = rows.filter((row): row is NetPlayerRow => "index" in row);
  if (!total) return <p className={styles.empty}>{t("meta.noNetwork")}</p>;
  const packets = players.some((row) => row.packets_out + row.packets_in > 0);
  const clients = players.some((row) => Boolean(row.brand) || Boolean(row.view_distance));
  return (
    <div className={styles.metadata}>
      <p className={styles.cardNote}>{t("net.note")}</p>
      <dl className={styles.kv}>
        <div className={styles.kvRow}>
          <dt>{t("net.out")}</dt>
          <dd>{num(total.out_kib_s)} KiB/s</dd>
        </div>
        <div className={styles.kvRow}>
          <dt>{t("net.in")}</dt>
          <dd>{num(total.in_kib_s)} KiB/s</dd>
        </div>
        <div className={styles.kvRow}>
          <dt>{t("net.players")}</dt>
          <dd>
            {total.players}
            <PinButton field="h:players" />
          </dd>
        </div>
      </dl>
      {players.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("net.player")}</th>
              {clients ? <th>{t("net.client")}</th> : null}
              {clients ? <th>{t("net.viewDistance")}</th> : null}
              <th>{t("net.out")}</th>
              <th>{t("net.in")}</th>
              <th>{t("net.peakOut")}</th>
              {packets ? <th>{t("net.packetsOut")}</th> : null}
              {packets ? <th>{t("net.packetsIn")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {players.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className={styles.tableName}>
                    {playerName(row)}
                    <RowTools id={row.id} name={playerName(row)} />
                  </span>
                </td>
                {clients ? <td>{row.brand || "–"}</td> : null}
                {clients ? <td>{row.view_distance ? row.view_distance : "–"}</td> : null}
                <td>{num(row.out_kib_s)} KiB/s</td>
                <td>{num(row.in_kib_s)} KiB/s</td>
                <td>{num(row.peak_out_kib_s)} KiB/s</td>
                {packets ? <td>{grouped(row.packets_out)}</td> : null}
                {packets ? <td>{grouped(row.packets_in)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {cap.capped(players.length) ? <ShowAll count={players.length} onClick={cap.show} /> : null}
    </div>
  );
}

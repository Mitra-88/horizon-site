"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { grouped, mib, num, shortId, withUnit } from "@/lib/perf/format";
import { byField } from "@/lib/perf/health";
import { t } from "@/lib/perf/i18n";
import {
  attributed,
  flatPhases,
  largest,
  loadOverview,
  phaseTree,
  share,
} from "@/lib/perf/overview";
import { windowsWithin } from "@/lib/perf/trailing";
import type { Overview, PhaseNode } from "@/lib/perf/overview";
import type { CostRow, GroupRow, HotRow, SeriesStats } from "@/lib/perf/types";
import type { Changes } from "@/lib/perf/compare";
import { useChanges } from "./comparison";
import { Delta } from "./delta";
import { RowTools } from "./row-tools";
import { Segmented } from "./segmented";
import { Spark } from "./spark";
import { useFilters } from "./filters-context";
import { PinButton } from "./pin-button";
import { useLogQueries } from "./query-log";
import { QUERY_FILE } from "./use-capture";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
}

type HotBy = "self" | "total";

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A line of a tile; `field` is the `series` field that draws it over time. */
type TileRow = [label: string, text: string, field?: string];

function Tile({
  title,
  value,
  unit,
  rows,
  note,
  field,
  children,
}: {
  title: string;
  value: string;
  unit?: string;
  rows: TileRow[];
  note?: string;
  /** The `series` field behind the tile's number, to pin to the time chart. */
  field?: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.stat}>
      <h3 className={styles.statTitle}>
        {title}
        {field ? <PinButton field={field} /> : null}
      </h3>
      <p className={styles.statValue}>
        {value}
        {unit ? <span className={styles.statUnit}>{unit}</span> : null}
      </p>
      {children}
      <dl className={styles.statRows}>
        {rows.map(([label, text, rowField]) => (
          <div key={label} className={styles.statRow}>
            <dt>{label}</dt>
            <dd>
              {text}
              {rowField ? <PinButton field={rowField} /> : null}
            </dd>
          </div>
        ))}
      </dl>
      {note ? <p className={styles.cardNote}>{note}</p> : null}
    </section>
  );
}

function Card({
  title,
  note,
  actions,
  children,
}: {
  title: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardHeading}>
          <h3 className={styles.cardTitle}>{title}</h3>
          {note ? <p className={styles.cardNote}>{note}</p> : null}
        </div>
        {actions ? <div className={styles.cardActions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** A row of a meter list: a name, a bar, a value and a second value. */
function Meter({
  id,
  name,
  title,
  indent = 0,
  width,
  tone = "accent",
  value,
  extra,
  extraColor,
  strong = false,
  delta,
  deltaFirst = false,
}: {
  id?: string;
  name: string;
  title?: string;
  indent?: number;
  width: number;
  tone?: "accent" | "good" | "warn";
  value: string;
  extra?: string;
  extraColor?: string;
  strong?: boolean;
  /** The change of this row, once a second capture is compared. */
  delta?: ReactNode;
  /** Whether the change sits after the value rather than after the extra. */
  deltaFirst?: boolean;
}) {
  return (
    <div className={strong ? styles.meterRowStrong : styles.meterRow} title={title}>
      <span className={styles.meterName} style={indent ? { paddingLeft: indent } : undefined}>
        <span className={styles.nameText}>{name}</span>
        <RowTools id={id} name={name} />
      </span>
      <span className={styles.meterTrack} aria-hidden="true">
        <span
          className={styles.meterFill}
          data-tone={tone}
          style={{ width: `${width}%`, minWidth: width > 0 ? 2 : 0 }}
        />
      </span>
      <span className={styles.meterValue}>{value}</span>
      {deltaFirst ? delta : null}
      <span className={styles.meterExtra} style={extraColor ? { color: extraColor } : undefined}>
        {extra}
      </span>
      {deltaFirst ? null : delta}
    </div>
  );
}

function MeterHead({ name, value, extra, change, changeFirst = false }: { name: string; value: string; extra?: string; change?: string; changeFirst?: boolean }) {
  return (
    <div className={styles.meterHead} aria-hidden="true">
      <span>{name}</span>
      <span />
      <span>{value}</span>
      {change && changeFirst ? <span>{change}</span> : null}
      <span>{extra}</span>
      {change && !changeFirst ? <span>{change}</span> : null}
    </div>
  );
}

/** A phase of the tick, drawn as a row of the span tree `query spans` describes. */
function Phase({ node, depth, max, changes }: { node: PhaseNode; depth: number; max: number; changes: Changes | null }) {
  const pct = node.pct;
  const extraColor =
    pct >= 30 ? "var(--ink)" : pct >= 10 ? "var(--ink-soft)" : "var(--muted)";
  return (
    <Meter
      id={node.id}
      name={node.name}
      title={node.name}
      indent={Math.min(depth * 8, 32)}
      width={share(node.ms, max)}
      value={num(node.ms, 2)}
      extra={`${num(node.pct, 1)}%`}
      extraColor={extraColor}
      strong={depth === 0}
      deltaFirst
      delta={changes ? <Delta row={changes.get(node.id)} /> : undefined}
    />
  );
}

export interface ViewProps {
  capture: LoadedCapture;
  data: Overview;
  /** `horizon-perf summary`'s text, for the copy button. */
  text: string;
}

/** The summary's drawing (§7.2, UI1): tiles, the tick's span tree and the lists under it. */
export function SummaryView({ capture, data, text }: ViewProps) {
  const [hotBy, setHotBy] = useState<HotBy>("self");
  const compare = useChanges();
  const changes = compare ? compare.changes : null;
  const [copied, setCopied] = useState(false);
  const ranged = useFilters().filters.range !== null;

  const fields = useMemo(() => byField(data.series), [data]);
  const phases = useMemo(() => flatPhases(phaseTree(data.spans)).filter(([, depth]) => depth <= 1), [data]);
  const phaseMax = useMemo(() => largest(phases.map(([node]) => node.ms)), [phases]);

  const get = (name: string): SeriesStats | null => fields.get(name)?.stats ?? null;
  const side = capture.side;
  const meta = capture.meta.rows.find((row) => row.side === side);

  const timing = meta?.timing;
  const lowRows: [string, string][] = [
    [t("health.low1"), withUnit(timing?.low_1pct, t(side === "server" ? "health.unitTps" : "health.unitFps"))],
    [t("health.low01"), withUnit(timing?.low_01pct, t(side === "server" ? "health.unitTps" : "health.unitFps"))],
  ];
  const tailRows: [string, string][] = [
    [t("health.tail1"), withUnit(timing?.slowest_1pct_ms, "ms")],
    [t("health.tail01"), withUnit(timing?.slowest_01pct_ms, "ms")],
  ];
  const lowNote = timing
    ? t(side === "server" ? "health.tickLowsNote" : "health.frameLowsNote", { count: grouped(timing.count) })
    : t("health.lowsUnavailable");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const tps = get("h:tps");
  const mspt = get("h:mspt_avg");
  const worstSecond = get("h:mspt_p95");
  const peak = get("h:mspt_max");
  const fps = get("h:fps");
  const frame = get("h:frame_ms_p95");
  const frameP50 = get("h:frame_ms_p50");
  const frameP99 = get("h:frame_ms_p99");
  const frameMax = get("h:frame_ms_max");
  const cpu = get("h:cpu_process_cores");
  const system = get("h:cpu_system_cores");
  const rss = get("h:rss_mb");
  const physical = get("h:physical_used_mb");
  const swap = get("h:swap_used_mb");
  const players = get("h:players");
  const chunks = get("h:chunks");
  const entities = get("h:entities");

  const resident = fields.get("h:rss_mb")?.values ?? [];
  const firstResident = resident.find((value): value is number => typeof value === "number");
  const grew =
    firstResident !== undefined && rss?.last !== undefined ? rss.last - firstResident : null;

  const header = [
    t(`side.${side}`),
    meta ? `${num(meta.seconds, 1)} s` : null,
    meta?.build ? `${t("summary.build")} ${meta.build.version} ${meta.build.profile}` : null,
    meta?.machine ? `${meta.machine.os} ${meta.machine.arch}` : null,
    meta?.machine ? t("summary.threads", { count: meta.machine.cpu_threads }) : null,
  ].filter((part): part is string => Boolean(part));


  const hotMax = largest(data.hot.map((row) => (hotBy === "self" ? row.self : row.total)));
  const entityRows = attributed(data.entities);
  const blockRows = attributed(data.blocks);
  const entityMax = largest(entityRows.map((row) => row.value));
  const blockMax = largest(blockRows.map((row) => row.value));
  const costMax = largest(data.costs.map((row) => row.ms_per_tick));

  const hasSide = entityRows.length > 0 || blockRows.length > 0 || data.costs.length > 0;
  const frameCpu = get("h:frame_cpu_ms_p50");
  const frameGpu = get("h:frame_gpu_ms_p50");
  const allocs = get("h:allocs_per_s");
  const allocRate = get("h:alloc_mib_per_s");
  const commit = get("h:allocator_commit_mb");

  return (
    <div className={styles.summary}>
      <header className={styles.summaryHead}>
        <div>
          <p className={styles.summaryMeta}>{header.join(" · ")}</p>
        </div>
        {text ? (
          <div className={styles.actions}>
            {ranged ? <span className={styles.muted}>{t("summary.reportWhole")}</span> : null}
            <button type="button" className={styles.buttonSmall} title={t("summary.copyHint")} onClick={() => void copy()}>
              {copied ? t("summary.copied") : t("summary.copy")}
            </button>
          </div>
        ) : null}
      </header>

      <div className={styles.cards}>
        {side === "server" ? (
          <Tile
            title={t("health.tps")}
            field="h:tps"
            value={num(tps?.mean ?? null, 1)}
            unit={t("health.unitTps")}
            note={lowNote}
            rows={[...lowRows, ...windowsWithin(data.seconds).map((window, index): [string, string] => [
              t(window.label),
              withUnit(data.trailing[index], t("health.unitTps")),
            ])]}
          >
            <Spark values={fields.get("h:tps")?.values ?? []} label={t("health.tps")} />
          </Tile>
        ) : (
          <Tile
            title={t("health.fps")}
            field="h:fps"
            value={num(fps?.mean ?? null, 1)}
            unit={t("health.unitFps")}
            note={lowNote}
            rows={[
              ...lowRows,
              [t("health.min"), withUnit(fps?.min, t("health.unitFps"))],
              [t("health.median"), withUnit(fps?.median, t("health.unitFps"))],
              [t("health.max"), withUnit(fps?.max, t("health.unitFps"))],
            ]}
          >
            <Spark values={fields.get("h:fps")?.values ?? []} label={t("health.fps")} />
          </Tile>
        )}

        {side === "server" ? (
          <Tile
            title={t("health.mspt")}
            field="h:mspt_avg"
            value={num(mspt?.mean ?? null, 1)}
            unit={t("health.unitMs")}
            rows={[
              [t("health.min"), withUnit(mspt?.min, "ms")],
              [t("health.median"), withUnit(mspt?.median, "ms")],
              [t("health.worstP95"), withUnit(worstSecond?.max, "ms"), "h:mspt_p95"],
              ...tailRows,
              [t("health.max"), withUnit(peak?.max, "ms"), "h:mspt_max"],
            ]}
          >
            <Spark values={fields.get("h:mspt_p95")?.values ?? []} label={t("health.mspt")} />
          </Tile>
        ) : (
          <Tile
            title={t("health.frame")}
            field="h:frame_ms_p95"
            value={num(frame?.median ?? null, 1)}
            unit={t("health.unitMs")}
            rows={[
              [t("health.p50"), withUnit(frameP50?.median, "ms"), "h:frame_ms_p50"],
              [t("health.p99"), withUnit(frameP99?.median, "ms"), "h:frame_ms_p99"],
              ...tailRows,
              [t("health.max"), withUnit(frameMax?.max, "ms"), "h:frame_ms_max"],
              ...(frameCpu ? ([[t("health.cpu"), withUnit(frameCpu.median, "ms"), "h:frame_cpu_ms_p50"]] as TileRow[]) : []),
              ...(frameGpu ? ([[t("health.gpu"), withUnit(frameGpu.median, "ms"), "h:frame_gpu_ms_p50"]] as TileRow[]) : []),
            ]}
          >
            <Spark values={fields.get("h:frame_ms_p95")?.values ?? []} label={t("health.frame")} />
          </Tile>
        )}

        <Tile
          title={t("health.cpuTitle")}
          field="h:cpu_process_cores"
          value={num(cpu?.mean ?? null, 2)}
          unit={t("health.unitCores")}
          rows={[
            [
              t("health.system"),
              meta?.machine
                ? t("health.systemOf", { used: num(system?.mean ?? null, 2), total: meta.machine.cpu_threads })
                : withUnit(system?.mean, t("health.unitCores"), 2),
              "h:cpu_system_cores",
            ],
          ]}
        >
          <Spark
            values={fields.get("h:cpu_process_cores")?.values ?? []}
            label={t("health.cpuTitle")}
          />
        </Tile>

        <Tile
          title={t("health.memory")}
          field="h:rss_mb"
          value={mib(rss?.last)}
          rows={[
            [t("health.physical"), mib(physical?.last), "h:physical_used_mb"],
            [t("health.swap"), mib(swap?.last), "h:swap_used_mb"],
            [t("summary.change"), grew === null ? "—" : `${grew > 0 ? "+" : ""}${withUnit(grew, "MiB", 0)}`],
          ]}
        >
          <Spark values={resident} label={t("health.memory")} />
        </Tile>

        {allocs || allocRate ? (
          <Tile
            title={t("health.allocations")}
            field="h:allocs_per_s"
            value={withUnit(allocs?.mean, t("health.unitPerS"), 0)}
            rows={[
              [t("health.allocated"), withUnit(allocRate?.mean, t("health.unitMibPerS"), 2), "h:alloc_mib_per_s"],
              [t("health.commit"), mib(commit?.last), "h:allocator_commit_mb"],
            ]}
          />
        ) : null}

        {meta && meta.world_fs_total_mb > 0 ? (
          <Tile
            title={t("health.disk")}
            value={mib(meta.world_fs_used_mb)}
            unit={t("health.diskUsed")}
            rows={[[t("health.diskTotal"), mib(meta.world_fs_total_mb)]]}
          />
        ) : null}

        {side === "server" ? (
          <Tile
            title={t("health.world")}
            field="h:players"
            value={num(players?.last ?? null, 0)}
            unit={players?.last === 1 ? t("health.player") : t("health.players")}
            rows={[
              [t("health.chunks"), num(chunks?.last ?? null, 0), "h:chunks"],
              [t("health.entities"), num(entities?.last ?? null, 0), "h:entities"],
            ]}
          />
        ) : chunks ? (
          <Tile
            title={t("health.world")}
            field="h:chunks"
            value={num(chunks.last, 0)}
            unit={t("health.chunks")}
            rows={[[t("health.entities"), num(entities?.last ?? null, 0), "h:entities"]]}
          />
        ) : null}
      </div>

      {phases.length > 0 ? (
      <Card
        title={t("summary.phases")}
        note={t("summary.phasesNote")}
        actions={
          data.ticks === null ? undefined : (
            <span className={styles.cardCount}>
              {t(side === "client" ? "summary.frames" : "summary.ticks", {
                count: grouped(data.ticks),
              })}
            </span>
          )
        }
      >
        <div className={styles.meterList} data-delta={changes ? "value" : undefined}>
          <MeterHead
            name={t("summary.phase")}
            value={t(side === "client" ? "summary.msPerFrame" : "summary.msPerTick")}
            extra={t(side === "client" ? "summary.pctOfFrame" : "summary.pctOfTick")}
            change={changes ? t("compare.columnChange") : undefined}
            changeFirst
          />
          {phases.map(([node, depth]) => (
            <Phase key={node.id} node={node} depth={depth} max={phaseMax} changes={changes} />
          ))}
        </div>
      </Card>
      ) : null}

      <div className={hasSide ? styles.split : styles.stack}>
        <div className={styles.stack}>
          {data.hot.length > 0 ? (
            <Card
              title={t("summary.hot")}
              note={t("summary.hotNote", { samples: grouped(data.samples ?? 0) })}
              actions={
                <Segmented
                  label={t("summary.hot")}
                  options={(["self", "total"] as const).map((id) => ({ id, text: t(`summary.${id}`) }))}
                  value={hotBy}
                  onChange={setHotBy}
                />
              }
            >
              <div className={styles.meterList} data-delta={changes ? "last" : undefined}>
                <MeterHead
                  name={t("summary.function")}
                  value={t("summary.selfMs")}
                  extra={t("summary.totalMs")}
                  change={changes ? t("compare.columnTotalChange") : undefined}
                />
                {data.hot.map((row: HotRow) => (
                  <Meter
                    key={row.id}
                    id={row.id}
                    name={row.name}
                    title={row.full}
                    width={share(hotBy === "self" ? row.self : row.total, hotMax)}
                    tone="good"
                    value={num(row.self, 2)}
                    extra={num(row.total, 2)}
                    delta={changes ? <Delta row={changes.get(row.id)} /> : undefined}
                  />
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className={styles.stack}>
          {entityRows.length > 0 ? (
            <Card title={t("summary.entities")} note={t("summary.entitiesNote")}>
              <div className={styles.meterList}>
                <MeterHead
                  name={t("summary.type")}
                  value={t(side === "client" ? "summary.msPerFrame" : "summary.msPerTick")}
                  extra={t("summary.share")}
                />
                {entityRows.map((row: GroupRow) => (
                  <Meter
                    key={row.key}
                    id={row.key ?? undefined}
                    name={shortId(row.label)}
                    title={row.key ?? undefined}
                    width={share(row.value, entityMax)}
                    value={num(row.value, 2)}
                    extra={`${num(row.pct, 1)}%`}
                  />
                ))}
              </div>
            </Card>
          ) : null}

          {blockRows.length > 0 ? (
            <Card title={t("summary.blocks")} note={t("summary.blocksNote")}>
              <div className={styles.meterList}>
                <MeterHead
                  name={t("summary.type")}
                  value={t(side === "client" ? "summary.msPerFrame" : "summary.msPerTick")}
                  extra={t("summary.share")}
                />
                {blockRows.map((row: GroupRow) => (
                  <Meter
                    key={row.key}
                    id={row.key ?? undefined}
                    name={shortId(row.label)}
                    title={row.key ?? undefined}
                    width={share(row.value, blockMax)}
                    value={num(row.value, 2)}
                    extra={`${num(row.pct, 1)}%`}
                  />
                ))}
              </div>
            </Card>
          ) : null}

          {data.costs.length > 0 ? (
            <Card title={t("summary.mobs")} note={t("summary.mobsNote")}>
              <div className={styles.meterList}>
                <MeterHead
                  name={t("summary.type")}
                  value={t(side === "client" ? "summary.msPerFrame" : "summary.msPerTick")}
                  extra={t("summary.usPerMob")}
                />
                {data.costs.map((row: CostRow) => (
                  <Meter
                    key={row.id}
                    id={row.id}
                    name={shortId(row.name)}
                    title={row.name}
                    width={share(row.ms_per_tick, costMax)}
                    tone="warn"
                    value={num(row.ms_per_tick, 2)}
                    extra={num(row.us_per_mob, 1)}
                  />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The Summary tab: loads what the view draws, then draws it. */
export function SummaryPanel({ reader, capture }: Props) {
  const { filters, marks } = useFilters();
  const { data, error, text } = useMemo(() => {
    let data: Overview;
    try {
      data = loadOverview(reader, capture.handle, QUERY_FILE, capture.side, capture.meta, filters, marks);
    } catch (failure) {
      return { data: null, error: message(failure), text: "" };
    }
    try {
      const report = reader.summary(capture.handle, {
        file: QUERY_FILE,
        side: capture.side,
        ...(filters.thread !== null ? { thread: filters.thread } : {}),
        ...(filters.slow ? { slow: true } : {}),
      });
      const lead = `${QUERY_FILE}: `;
      return { data, error: null, text: report.startsWith(lead) ? report.slice(lead.length) : report };
    } catch {
      return { data, error: null, text: "" };
    }
  }, [reader, capture, filters, marks]);
  const queries = useMemo(() => data?.queries ?? [], [data]);
  useLogQueries(queries);

  if (error) return <p className={styles.error}>{error}</p>;
  if (!data) return null;
  return <SummaryView capture={capture} data={data} text={text} />;
}

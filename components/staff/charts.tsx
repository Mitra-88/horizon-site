"use client";

import type { ReactNode } from "react";
import { GHOST_SM, SECONDARY_SM } from "@/components/staff/ui";

export const fmt = (n?: number | null) =>
  n == null ? "–" : Number.isInteger(n) ? n.toLocaleString("en") : n.toLocaleString("en", { maximumFractionDigits: 1 });

export const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });

const COLORS = ["#a98fff", "#8be0b4"];

function niceMax(v: number) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v) ?? v;
}

export type Series = { name: string; values: (number | null | undefined)[] };

export function BarChart({ title, weeks, series, unit = "" }: { title: string; weeks: string[]; series: Series[]; unit?: string }) {
  const W = 640;
  const H = 200;
  const left = 40;
  const bottom = 24;
  const top = 8;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const slot = (W - left) / Math.max(1, weeks.length);
  const bar = Math.max(2, Math.min(18, (slot - 8 - 2 * (series.length - 1)) / series.length));
  return (
    <figure className="rounded-2xl bg-[#18112c] p-4 sm:p-5">
      <figcaption className="text-sm font-medium text-white">{title}</figcaption>
      {series.length > 1 && (
        <p className="mt-2 flex flex-wrap gap-4 text-xs text-white/60">
          {series.map((s, k) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-[3px]" style={{ background: COLORS[k] }} />
              {s.name}
            </span>
          ))}
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="mt-3 w-full">
        <g className="text-white/40" fill="currentColor" stroke="currentColor">
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={left} x2={W} y1={y(v)} y2={y(v)} strokeOpacity={0.25} />
              <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} stroke="none">
                {fmt(v)}
              </text>
            </g>
          ))}
        </g>
        {weeks.map((w, i) => {
          const x0 = left + i * slot + (slot - (bar * series.length + 2 * (series.length - 1))) / 2;
          const tip = `Week of ${weekLabel(w)}: ${series.map((s) => `${s.name} ${fmt(s.values[i])}${unit}`).join(", ")}`;
          return (
            <g key={w}>
              <title>{tip}</title>
              <rect x={left + i * slot} y={top} width={slot} height={H - top - bottom} fill="transparent" />
              {series.map((s, k) => {
                const v = s.values[i];
                if (v == null || v === 0) return null;
                const h = Math.max(2, y(0) - y(v));
                return <rect key={s.name} x={x0 + k * (bar + 2)} y={y(0) - h} width={bar} height={h} rx={2} fill={COLORS[k]} />;
              })}
              {i % 2 === weeks.length % 2 ? null : (
                <text x={left + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={11} className="fill-white/45">
                  {weekLabel(w)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-white/50 hover:text-white">Table</summary>
        <Table
          cols={["Week of", ...series.map((s) => s.name)]}
          rows={weeks.map((w, i) => [weekLabel(w), ...series.map((s) => fmt(s.values[i]))])}
        />
      </details>
    </figure>
  );
}

export function RankChart({ title, entries }: { title: string; entries: [string, number][] }) {
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <figure className="rounded-2xl bg-[#18112c] p-4 sm:p-5">
      <figcaption className="text-sm font-medium text-white">{title}</figcaption>
      {entries.length ? (
        <ul className="mt-3 space-y-2 text-[13px]">
          {entries.map(([name, v]) => (
            <li key={name} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3">
              <span className="truncate text-white/70">{name}</span>
              <span className="h-2.5 rounded-[3px] bg-white/[0.06]">
                <i className="block h-full rounded-[3px] bg-[#a98fff]" style={{ width: `${Math.round((v / max) * 100)}%` }} />
              </span>
              <span className="text-right text-white/80 tabular-nums">{fmt(v)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/50">None.</p>
      )}
    </figure>
  );
}

export function Tile({ value, label, note }: { value: ReactNode; label: string; note?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#18112c] p-4 sm:p-5">
      <span className="block font-display text-[1.75rem] leading-none font-semibold text-white tabular-nums">{value}</span>
      <span className="mt-2 block text-sm text-white/70">{label}</span>
      {note ? <span className="mt-1 block text-xs text-white/45">{note}</span> : null}
    </div>
  );
}

export function Table({ cols, rows }: { cols: string[]; rows: (string | number | null | undefined)[][] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl bg-white/[0.03]">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="text-white/50">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white/[0.02]">
              {r.map((v, k) => (
                <td key={k} className="px-3 py-2 align-top text-white/80">
                  {v == null ? "" : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type Row = Record<string, string | number | null | undefined>;

const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: Row[]) =>
  rows.length ? [Object.keys(rows[0]), ...rows.map((r) => Object.values(r))].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n" : "";

export function download(file: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: file });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataSet({ id, title, rows, file }: { id: string; title: string; rows: Row[]; file: string }) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const stamp = () => new Date().toISOString().slice(0, 10);
  return (
    <section id={`data-${id}`} className="scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">
          {title} <span className="text-sm font-normal text-white/45 tabular-nums">{rows.length}</span>
        </h2>
        <p className="flex gap-1.5">
          <button type="button" className={SECONDARY_SM} onClick={() => download(`${file}-${stamp()}.csv`, toCsv(rows), "text/csv")}>
            CSV
          </button>
          <button type="button" className={GHOST_SM} onClick={() => download(`${file}-${stamp()}.json`, JSON.stringify(rows, null, 2), "application/json")}>
            JSON
          </button>
        </p>
      </div>
      {rows.length ? <Table cols={cols} rows={rows.map((r) => cols.map((c) => r[c]))} /> : <p className="mt-3 text-sm text-white/50">Nothing yet.</p>}
    </section>
  );
}

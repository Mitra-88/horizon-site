"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Applications } from "@/components/staff/applications";
import { Cases } from "@/components/staff/cases";
import { api, type Application, type People, type Who } from "@/components/staff/api";
import { BarChart, DataSet, Tile, fmt, type Row } from "@/components/staff/charts";
import { selectTab, tabFromHash, useHash, useScrollToHash } from "@/components/staff/hash";
import { Inbox, inboxCount, inboxGroups } from "@/components/staff/inbox";
import { Guard, Panel, Tabs } from "@/components/staff/ui";

const IDS = ["inbox", "cases", "applications", "stats"];
const LABELS: Record<string, string> = {
  reports: "Reports",
  modmail: "Mod-mail threads",
  warns: "Warnings",
  timeouts: "Timeouts",
  kicks: "Kicks",
  bans: "Bans",
  automod: "AutoMod actions",
  joins: "Joins",
  leaves: "Leaves",
};

type Counts = Record<string, number>;
type ModStats = {
  countingSince?: string;
  last7: Counts;
  last30: Counts;
  applications: { open: { mod: number; support: number }; accepted30: number; declined30: number };
  weeks: ({ week: string } & Counts)[];
};

const longDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function Stats({ s }: { s: ModStats }) {
  const w = s.weeks.map((x) => x.week);
  const col = (k: string) => s.weeks.map((x) => x[k]);
  const rows: Row[] = s.weeks.map((x) => ({ week: x.week, ...Object.fromEntries(Object.keys(LABELS).map((k) => [k, x[k]])) }));
  const a = s.applications;
  return (
    <div className="space-y-6">
      <p className="text-[15px] text-white/60">
        Kira&apos;s daily counters: counts only, nothing of what was said.{" "}
        {s.countingSince ? `Counting since ${longDay(s.countingSince)}.` : "Counting starts with the next event."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile value={fmt(s.last7.reports)} label="reports, last 7 days" note={`${fmt(s.last30.reports)} in 30 days`} />
        <Tile value={fmt(s.last7.modmail)} label="mod-mail threads, last 7 days" note={`${fmt(s.last30.modmail)} in 30 days`} />
        <Tile
          value={`${fmt(s.last7.warns)} / ${fmt(s.last7.timeouts)}`}
          label="warnings / timeouts, last 7 days"
          note={`${fmt(s.last30.warns)} / ${fmt(s.last30.timeouts)} in 30 days`}
        />
        <Tile value={`${fmt(s.last7.kicks)} / ${fmt(s.last7.bans)}`} label="kicks / bans, last 7 days" note={`${fmt(s.last30.kicks)} / ${fmt(s.last30.bans)} in 30 days`} />
        <Tile value={fmt(s.last7.automod)} label="AutoMod actions, last 7 days" note={`${fmt(s.last30.automod)} in 30 days`} />
        <Tile
          value={`${fmt(a.open.mod)} / ${fmt(a.open.support)}`}
          label="Mod / Support applications waiting"
          note={`${fmt(a.accepted30)} accepted, ${fmt(a.declined30)} declined in 30 days`}
        />
      </div>
      <p className="text-xs text-white/45">Counts only: Kira stores no list of who or what.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart title="Reports and mod-mail per week" weeks={w} series={[{ name: "Reports", values: col("reports") }, { name: "Mod-mail", values: col("modmail") }]} />
        <BarChart title="Warnings and timeouts per week" weeks={w} series={[{ name: "Warnings", values: col("warns") }, { name: "Timeouts", values: col("timeouts") }]} />
        <BarChart title="Kicks and bans per week" weeks={w} series={[{ name: "Kicks", values: col("kicks") }, { name: "Bans", values: col("bans") }]} />
        <BarChart title="AutoMod actions per week" weeks={w} series={[{ name: "AutoMod", values: col("automod") }]} />
        <BarChart title="Joins and leaves per week" weeks={w} series={[{ name: "Joins", values: col("joins") }, { name: "Leaves", values: col("leaves") }]} />
      </div>
      <DataSet id="moderation-weeks" title="Weekly numbers" rows={rows} file="horizon-moderation" />
    </div>
  );
}

const fetchApplications = () => api<{ applications: Application[]; people?: People }>("GET", "mod/applications");

export function ModDashboard({ who }: { who: Who }) {
  const hash = useHash();
  const tab = tabFromHash(hash, IDS);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [people, setPeople] = useState<People>({});
  const [error, setError] = useState("");
  const [stats, setStats] = useState<ModStats | null>(null);
  const [statsError, setStatsError] = useState("");

  const show = useCallback((res: { applications: Application[]; people?: People }) => {
    setApps(res.applications ?? []);
    setPeople((p) => ({ ...p, ...res.people }));
  }, []);

  const load = useCallback(async () => show(await fetchApplications()), [show]);

  useEffect(() => {
    fetchApplications().then(show, (e: Error) => setError(e.message));
  }, [show]);

  useEffect(() => {
    if (tab !== "stats" || stats || statsError) return;
    api<ModStats>("GET", "mod/stats").then(setStats, (e: Error) => setStatsError(e.message));
  }, [tab, stats, statsError]);

  useScrollToHash(apps !== null);

  const count = apps ? inboxCount(inboxGroups({ apps, me: who.user, names: [], act: () => {} }).groups) : 0;
  const tabs = [
    { id: "inbox", label: "Inbox", count },
    { id: "cases", label: "Cases" },
    { id: "applications", label: "Applications" },
    { id: "stats", label: "Stats" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} active={tab} onSelect={selectTab} label="Moderation dashboard" />
        <Link href="/hub/staff-help" className="text-sm text-white/55 hover:text-white">
          How this works
        </Link>
      </div>
      {error ? (
        <p role="alert" className="mt-6 text-[15px] text-white/70">
          {error}
        </p>
      ) : !apps ? (
        <p className="mt-6 text-sm text-white/50">Loading…</p>
      ) : (
        <>
          <Panel id="inbox" active={tab}>
            <Guard what="The Inbox">
              <Inbox dashboard="mod" apps={apps} me={who.user} names={[]} onDone={load} />
            </Guard>
          </Panel>
          <Panel id="cases" active={tab}>
            <Guard what="The cases">{tab === "cases" ? <Cases /> : null}</Guard>
          </Panel>
          <Panel id="applications" active={tab}>
            <Applications apps={apps} people={people} dashboard="mod" onDone={load} />
          </Panel>
          <Panel id="stats" active={tab}>
            {statsError ? (
              <p className="text-[15px] text-white/70">{statsError}</p>
            ) : stats ? (
              <Guard what="The moderation numbers">
                <Stats s={stats} />
              </Guard>
            ) : (
              <p className="text-sm text-white/50">Loading…</p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { getMessages, type Locale } from "@/components/i18n";

const DIR = join(process.cwd(), "content", "benchmarks");

export const BUCKET_EDGES = [0, 1, 2, 3, 4.17, 5, 6, 7, 8.33, 10, 12, 14, 16.67, 20, 25, 33.33, 40, 50, 66.67, 100, 150, 250, 500, 1000];
const HITCH_FROM = BUCKET_EDGES.indexOf(16.67);
const STUTTER_FROM = BUCKET_EDGES.indexOf(33.33);
const SMOOTH_UNTIL = BUCKET_EDGES.indexOf(8.33);

export type Medians = {
  avg_fps: number;
  low_1pct_fps: number;
  p95_ms: number;
  world_ms: number;
  chunk_load_ms: number;
  rss_peak_mb: number;
  rss_steady_mb: number;
  cpu_p50_ms: number | null;
  gpu_p50_ms: number | null;
};

export type SummaryRow = {
  gpu: string;
  cpu: string;
  render_distance: number;
  game: "horizon" | "vanilla";
  machine: string;
  measured: string;
  version: string;
  backend: string;
  os: string;
  capped_fps?: number;
  note?: string;
  medians: Medians;
  scenes: Record<string, { avg_fps: number; low_1pct_fps: number; chunk_load_ms: number }>;
};

export type GameRun = {
  version: string;
  backend: string;
  capped: number | null;
  avgFps: number;
  low1: number;
  p95: number;
  worldMs: number;
  chunkMs: number;
  ramSteady: number;
  ramPeak: number;
  shares: { smooth: number; fine: number; slow: number; stutter: number };
  hitchesPerMin: number;
  stuttersPerMin: number;
  histogram: number[];
  scenes: { id: string; avgFps: number; low1: number; chunkMs: number }[];
};

export type Distance = "12" | "32";
export type MachineId = "thinkpad" | "macmini" | "desktop";

export type BenchMachine = {
  id: MachineId;
  name: string;
  /** The name inside a sentence ("On the …"), which some languages write in lower case. */
  inSentence: string;
  kind: string;
  year: string;
  measured: string;
  image: { src: string; width: number; height: number; alt: string; caption?: string };
  specs: { label: string; value: string; thumb?: ChipThumb }[];
  buy: { label: string; href: string; primary?: boolean }[];
  note: string | null;
  runs: Record<Distance, { horizon: GameRun; vanilla: GameRun } | null>;
  missing: Partial<Record<Distance, string>>;
};

export type ChipThumb = { src: string; credit?: { text: string; href: string } };

type Chip = "kabyLake" | "appleSilicon" | "raptorLake" | "rtx4080";
const CHIPS: Record<Chip, { src: string; credit?: { href: string } }> = {
  kabyLake: { src: "/media/bench/chips/kaby-lake-u.webp", credit: { href: "https://commons.wikimedia.org/wiki/File:Intel_core_i5-7200u_sr342.jpg" } },
  appleSilicon: { src: "/media/bench/chips/apple-silicon.webp", credit: { href: "https://commons.wikimedia.org/wiki/File:Apple_M1.jpg" } },
  rtx4080: { src: "/media/bench/chips/rtx-4080.webp" },
  raptorLake: { src: "/media/bench/chips/i7-13700k.webp", credit: { href: "https://commons.wikimedia.org/wiki/File:Intel_Core_i7_13700K.jpg" } },
};

// What isn't words: the words for each machine are in messages/<locale>.json (benchmarks.machines), spec by spec and link by link.
const MACHINES: { id: MachineId; year: string; image: { src: string; width: number; height: number }; thumbs: (Chip | null)[]; buy: { href: string; primary?: boolean }[] }[] = [
  {
    id: "thinkpad",
    year: "2016",
    image: { src: "/media/bench/thinkpad.webp", width: 919, height: 407 },
    thumbs: ["kabyLake", "kabyLake", null, null],
    buy: [{ href: "https://www.ebay.com/sch/i.html?_nkw=thinkpad+t470+i7-7500u", primary: true }, { href: "https://psref.lenovo.com/Product/ThinkPad_T470" }],
  },
  {
    id: "macmini",
    year: "2024",
    image: { src: "/media/bench/mac-mini.webp", width: 457, height: 183 },
    thumbs: ["appleSilicon", null, null],
    buy: [{ href: "https://www.apple.com/shop/buy-mac/mac-mini", primary: true }, { href: "https://www.apple.com/mac-mini/specs/" }],
  },
  {
    id: "desktop",
    year: "2022",
    image: { src: "/media/bench/rtx-4080.webp", width: 1200, height: 572 },
    thumbs: ["rtx4080", "raptorLake", null, null],
    buy: [
      { href: "https://www.bestbuy.com/site/nvidia-geforce-rtx-4080-16gb-gddr6x-graphics-card-titanium-black/6521431.p?skuId=6521431", primary: true },
      { href: "https://www.amazon.com/s?k=Intel+Core+i7-13700KF" },
    ],
  },
];

function describe(locale: Locale, meta: (typeof MACHINES)[number]): Omit<BenchMachine, "runs" | "note" | "measured"> {
  const { machines, credits } = getMessages(locale).benchmarks;
  const t = machines[meta.id];
  const thumb = (chip: Chip | null): ChipThumb | undefined => {
    if (!chip) return undefined;
    const { src, credit } = CHIPS[chip];
    return credit ? { src, credit: { text: credits[chip as Exclude<Chip, "rtx4080">], href: credit.href } } : { src };
  };
  return {
    id: meta.id,
    name: t.name,
    inSentence: t.inSentence,
    kind: t.kind,
    year: meta.year,
    image: { ...meta.image, alt: t.alt, ...(t.caption ? { caption: t.caption } : {}) },
    specs: t.specs.map((s, i) => ({ ...s, ...(meta.thumbs[i] ? { thumb: thumb(meta.thumbs[i]) } : {}) })),
    buy: meta.buy.map((b, i) => ({ label: t.buy[i], ...b })),
    missing: t.missing32 ? { "32": t.missing32 } : {},
  };
}

const SUMMARY_MACHINE: Record<MachineId, string> = {
  thinkpad: "ThinkPad (i7-7500U, HD Graphics 620)",
  macmini: "Mac mini (M4 Pro)",
  desktop: "Desktop (RTX 4080, i7-13700KF)",
};

type Report = {
  app: { name: string };
  conditions: { render_distance: number };
  frames: { seconds: number; frames: number; histogram: number[] }[];
};
type FleetEntry = { machine: string; reports: string[]; note?: string };

const readJson = async <T,>(path: string): Promise<T> => JSON.parse(await readFile(join(DIR, path), "utf8"));

function run(row: SummaryRow, histogram: number[], seconds: number): GameRun {
  const total = histogram.reduce((a, b) => a + b, 0) || 1;
  const sum = (from: number, to: number) => histogram.slice(from, to).reduce((a, b) => a + b, 0);
  const hitches = sum(HITCH_FROM, histogram.length);
  const stutters = sum(STUTTER_FROM, histogram.length);
  const minutes = seconds / 60 || 1;
  const m = row.medians;
  return {
    version: row.version,
    backend: row.backend,
    capped: row.capped_fps ?? null,
    avgFps: m.avg_fps,
    low1: m.low_1pct_fps,
    p95: m.p95_ms,
    worldMs: m.world_ms,
    chunkMs: m.chunk_load_ms,
    ramSteady: m.rss_steady_mb,
    ramPeak: m.rss_peak_mb,
    shares: {
      smooth: sum(0, SMOOTH_UNTIL) / total,
      fine: sum(SMOOTH_UNTIL, HITCH_FROM) / total,
      slow: sum(HITCH_FROM, STUTTER_FROM) / total,
      stutter: stutters / total,
    },
    hitchesPerMin: hitches / minutes,
    stuttersPerMin: stutters / minutes,
    histogram,
    scenes: Object.entries(row.scenes).map(([id, s]) => ({ id, avgFps: s.avg_fps, low1: s.low_1pct_fps, chunkMs: s.chunk_load_ms })),
  };
}

export async function getBenchmarks(locale: Locale = "en") {
  "use cache";
  cacheLife("days");
  const [summary, fleet] = await Promise.all([readJson<{ generated: string; groups: SummaryRow[] }>("summary.json"), readJson<FleetEntry[]>("fleet.json")]);
  const histograms = new Map<string, { histogram: number[]; seconds: number }>();
  for (const entry of fleet) {
    let key = "";
    const histogram = new Array<number>(BUCKET_EDGES.length).fill(0);
    let seconds = 0;
    for (const path of entry.reports) {
      const report = await readJson<Report>(path);
      key = `${entry.machine}|${report.app.name === "horizon-client" ? "horizon" : "vanilla"}|${report.conditions.render_distance}`;
      for (const f of report.frames) {
        f.histogram.forEach((count, i) => (histogram[i] += count));
        seconds += f.seconds;
      }
    }
    histograms.set(key, { histogram, seconds });
  }

  const rows = summary.groups;
  const machines: BenchMachine[] = MACHINES.map((meta) => {
    const text = describe(locale, meta);
    const name = SUMMARY_MACHINE[meta.id];
    const mine = rows.filter((r) => r.machine === name);
    const pair = (rd: Distance) => {
      const h = mine.find((r) => r.game === "horizon" && r.render_distance === Number(rd));
      const v = mine.find((r) => r.game === "vanilla" && r.render_distance === Number(rd));
      if (!h || !v) return null;
      const hh = histograms.get(`${name}|horizon|${rd}`);
      const vh = histograms.get(`${name}|vanilla|${rd}`);
      if (!hh || !vh) return null;
      return { horizon: run(h, hh.histogram, hh.seconds), vanilla: run(v, vh.histogram, vh.seconds) };
    };
    return {
      ...text,
      measured: mine[0]?.measured ?? "",
      note: fleet.find((f) => f.machine === name && f.note)?.note ?? null,
      runs: { "12": pair("12"), "32": pair("32") },
    };
  });

  return { generated: summary.generated, machines, rows };
}

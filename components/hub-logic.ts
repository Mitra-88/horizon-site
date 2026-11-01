import type { Release } from "@/components/github-releases";

export const REPO = "horizon-rust/horizon";
export const issueUrl = (n: number) => `https://github.com/${REPO}/issues/${n}`;
export const fileUrl = (path: string) => `https://github.com/${REPO}/blob/main/${path}`;

export type RoadmapItem = {
  id: string;
  title: string;
  status: string;
  area: string;
  plain: string;
  dev: string;
  links?: string[];
  focus?: boolean;
  ongoing?: boolean;
  shipped_in?: string;
};

export type Roadmap = {
  overview: { today_plain: string; today_dev: string; help_plain: string; help_dev: string };
  statuses: { id: string; name: string }[];
  areas: { id: string; name: string }[];
  items: RoadmapItem[];
  journal?: { week: string; date: string; title: string; plain: string; dev: string }[];
};

export type HubIssue = {
  n: number;
  title: string;
  kind: "issue" | "pr";
  state: "open" | "merged" | "closed" | "dropped";
  draft: boolean;
  user: string;
  labels: string[];
  assigned: boolean;
  fixes: number[];
  at: string;
  url: string;
};

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c]);

function linkTarget(url: string) {
  if (/^https?:\/\//.test(url) || url.startsWith("#")) return url;
  if (/^\/(docs|hub|releases|benchmarks)(\/|#|$)|^\/(#|$)/.test(url)) return url.replace(/^\/docs\/(?=#|$)/, "/docs");
  if (url.startsWith("/")) return `https://playhorizon.dev${url}`;
  if (/^[\w.-]+(\/[\w.-]+)*\/?$/.test(url)) return fileUrl(url);
  return null;
}

export function inline(text: string): string {
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  const links: [string, string][] = [];
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    links.push([label, url]);
    return `\u0001${links.length - 1}\u0001`;
  });
  out = escape(out)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  out = out.replace(/\u0001(\d+)\u0001/g, (_, i: string) => {
    const [label, url] = links[Number(i)];
    const target = linkTarget(url);
    const body = inline(label.replace(/\u0000(\d+)\u0000/g, (__, c: string) => `\`${codes[Number(c)]}\``));
    return target ? `<a href="${escape(target)}">${body}</a>` : body;
  });
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${escape(codes[Number(i)])}</code>`);
}

export const issueNumber = (link: string) => Number((/^#(\d+)$/.exec(link) ?? [])[1]) || null;

export function devMarkdown(item: RoadmapItem) {
  let text = item.dev.replace(/(^|[^\w[/`])#(\d+)\b/g, (_, before: string, n: string) => `${before}[#${n}](${issueUrl(Number(n))})`);
  for (const link of item.links ?? []) {
    if (!issueNumber(link) && !link.startsWith("https://")) text = text.replace(link, `[${link}](${fileUrl(link)})`);
  }
  return text;
}

export function fixesIn(text: string | null | undefined) {
  const out = new Set<number>();
  for (const m of String(text ?? "").matchAll(/\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\s*:?\s+((?:#\d+(?:\s*(?:,|and)\s*)?)+)/gi)) {
    for (const n of m[1].matchAll(/#(\d+)/g)) out.add(Number(n[1]));
  }
  return [...out].sort((a, b) => a - b);
}

type GitHubIssue = {
  number: number;
  title?: string;
  state: string;
  state_reason?: string | null;
  draft?: boolean;
  user?: { login?: string } | null;
  labels?: (string | { name?: string })[];
  assignees?: unknown[] | null;
  body?: string | null;
  pull_request?: { merged_at?: string | null } | null;
  closed_at?: string | null;
  updated_at?: string | null;
  html_url?: string;
};

export function slimIssue(raw: GitHubIssue): HubIssue {
  const merged = raw.pull_request?.merged_at;
  return {
    n: raw.number,
    title: String(raw.title ?? ""),
    kind: raw.pull_request ? "pr" : "issue",
    state: merged ? "merged" : raw.state === "open" ? "open" : raw.state_reason === "not_planned" ? "dropped" : "closed",
    draft: Boolean(raw.draft),
    user: raw.user?.login ?? "",
    labels: (raw.labels ?? []).map((l) => (typeof l === "string" ? l : (l.name ?? ""))).filter(Boolean),
    assigned: (raw.assignees ?? []).length > 0,
    fixes: raw.pull_request ? fixesIn(raw.body) : [],
    at: merged || raw.closed_at || raw.updated_at || "",
    url: raw.html_url || issueUrl(raw.number),
  };
}

export function linkState(issue: HubIssue | undefined) {
  if (!issue) return null;
  if (issue.kind === "pr") return issue.state === "open" ? (issue.draft ? "in progress" : "in review") : issue.state;
  return issue.state === "open" ? "open" : "closed";
}

export function progress(item: RoadmapItem, live: Map<number, HubIssue>) {
  const known = (item.links ?? []).map(issueNumber).flatMap((n) => (n && live.has(n) ? [live.get(n)!] : []));
  const pulls = known.filter((i) => i.kind === "pr");
  const review = pulls.filter((p) => p.state === "open" && !p.draft).length;
  const drafts = pulls.filter((p) => p.state === "open" && p.draft).length;
  const merged = pulls.filter((p) => p.state === "merged").length;
  const issues = known.filter((i) => i.kind === "issue" && i.state === "open").length;
  return [
    review && `${review} pull request${review === 1 ? "" : "s"} in review`,
    drafts && `${drafts} in progress`,
    merged && `${merged} merged`,
    issues && `${issues} issue${issues === 1 ? "" : "s"} open`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const areaName = (roadmap: Roadmap, id: string) => roadmap.areas.find((a) => a.id === id)?.name ?? id;

export const COLUMNS = [
  { id: "todo", name: "To do", about: "Open and free: pick one, and say so with /claim on Discord." },
  { id: "progress", name: "In progress", about: "Claimed, assigned, or a draft pull request." },
  { id: "review", name: "In review", about: "A pull request is ready for review." },
  { id: "done", name: "Done", about: "Closed or merged in the last seven days." },
] as const;

export type ColumnId = (typeof COLUMNS)[number]["id"];
export type BoardCard = { n: number; kind: "issue" | "pr"; title: string; user: string; url: string; item: string | null; prs: number[] };

export function itemOf(issue: HubIssue, roadmap: Roadmap) {
  const label = issue.labels.find((l) => l.startsWith("roadmap:"))?.slice(8);
  if (label && roadmap.items.some((i) => i.id === label)) return label;
  const linking = (n: number) => roadmap.items.find((i) => (i.links ?? []).includes(`#${n}`))?.id;
  return linking(issue.n) ?? issue.fixes.map(linking).find(Boolean) ?? null;
}

export function boardFrom(list: HubIssue[], roadmap: Roadmap, now = Date.now()) {
  const columns: Record<ColumnId, BoardCard[]> = { todo: [], progress: [], review: [], done: [] };
  const open = list.filter((i) => i.state === "open");
  const openIssues = new Set(open.filter((i) => i.kind === "issue").map((i) => i.n));
  const fixing = (n: number) => open.filter((p) => p.kind === "pr" && p.fixes.includes(n));
  const card = (i: HubIssue, prs: HubIssue[] = []): BoardCard => ({
    n: i.n,
    kind: i.kind,
    title: i.title,
    user: i.user,
    url: i.url,
    item: itemOf(i, roadmap) ?? prs.map((p) => itemOf(p, roadmap)).find(Boolean) ?? null,
    prs: prs.map((p) => p.n),
  });
  for (const i of open) {
    if (i.kind === "issue") {
      const prs = fixing(i.n);
      const claimed = i.assigned || i.labels.some((l) => /^(in progress|claimed)$/i.test(l));
      columns[prs.some((p) => !p.draft) ? "review" : prs.length || claimed ? "progress" : "todo"].push(card(i, prs));
    } else if (!i.fixes.some((n) => openIssues.has(n))) {
      columns[i.draft ? "progress" : "review"].push(card(i));
    }
  }
  const since = now - 7 * 864e5;
  const seen = new Set<number>();
  for (const i of list) {
    if (seen.has(i.n) || i.state === "open" || i.state === "dropped" || !(Date.parse(i.at) >= since)) continue;
    seen.add(i.n);
    columns.done.push(card(i));
  }
  columns.done.sort((a, b) => b.n - a.n);
  return columns;
}

export function sections(body: string) {
  const out: { title: string; items: string[] }[] = [];
  let current: { title: string; items: string[] } | null = null;
  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = /^#{2,3}\s+(.+?)\s*$/.exec(raw);
    if (heading) out.push((current = { title: heading[1], items: [] }));
    else if (current && /^[-*]\s+/.test(raw)) current.items.push(raw.replace(/^[-*]\s+/, "").trim());
  }
  return out;
}

export const plainItem = (item: string) =>
  item.replace(/\s*\((?:#\d+|fixes #\d+|[^()]*#\d+[^()]*)\)\s*/g, " ").replace(/\s+/g, " ").trim();

export type JournalChange = { section: "new" | "fixed" | "merged"; text: string; prs: number[]; item: string | null };
export type JournalEntry = {
  id: string;
  kind: "release" | "launcher" | "merged" | "week";
  date: string;
  title: string;
  url: string;
  plain?: string;
  dev?: string;
  changes: JournalChange[];
  shipped: string[];
};

const ENTRIES = 40;

export const journalAnchor = (e: JournalEntry) => (e.kind === "week" ? e.id : `journal-${e.id.replace(/[^\w.-]/g, "-")}`);

export function journalFrom(releases: Release[], list: HubIssue[], roadmap: Roadmap): JournalEntry[] {
  const prs = new Map(list.filter((i) => i.kind === "pr").map((i) => [i.n, i]));
  const placed = (numbers: number[]) => {
    for (const n of numbers) {
      const known = prs.get(n);
      const id = known ? itemOf(known, roadmap) : roadmap.items.find((i) => (i.links ?? []).includes(`#${n}`))?.id;
      if (id) return id;
    }
    return null;
  };
  const entries: JournalEntry[] = releases.map((r) => ({
    id: r.tag,
    kind: r.kind === "launcher" ? "launcher" : "release",
    date: r.published,
    title: r.title,
    url: r.url,
    changes: sections(r.notes)
      .filter((s) => /^(new|what's new|fixed)/i.test(s.title))
      .flatMap((s) => s.items.map((text) => ({ section: /^fixed/i.test(s.title) ? ("fixed" as const) : ("new" as const), text })))
      .map((c) => {
        const numbers = [...c.text.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
        return { ...c, text: plainItem(c.text), prs: numbers, item: placed(numbers) };
      }),
    shipped: roadmap.items.filter((i) => i.status === "shipped" && i.shipped_in === r.tag).map((i) => i.id),
  }));

  const games = releases.filter((r) => r.kind !== "launcher").map((r) => r.published).sort().reverse();
  const since = games[Math.min(4, games.length - 1)] ?? "";
  const noted = new Set(entries.flatMap((e) => e.changes.flatMap((c) => c.prs)));
  const pending = list
    .filter((i) => i.kind === "pr" && i.state === "merged" && i.at > since && !noted.has(i.n) && !i.labels.includes("skip-release"))
    .sort((a, b) => b.at.localeCompare(a.at));
  if (pending.length) {
    entries.push({
      id: "next-release",
      kind: "merged",
      date: pending[0].at,
      title: "Merged, in the next release",
      url: `https://github.com/${REPO}/pulls?q=is%3Apr+is%3Amerged`,
      plain: `${pending.length} change${pending.length === 1 ? "" : "s"} merged since the last release.`,
      changes: pending.map((p) => ({ section: "merged", text: p.title, prs: [p.n], item: itemOf(p, roadmap) })),
      shipped: [],
    });
  }

  for (const w of roadmap.journal ?? []) {
    entries.push({
      id: `week-${w.week}`,
      kind: "week",
      date: new Date(Date.parse(w.date) + 7 * 864e5 - 1).toISOString(),
      title: w.title,
      url: `#week-${w.week}`,
      plain: w.plain,
      dev: w.dev.replace(/(^|[^\w[/`])#(\d+)\b/g, (_, b: string, n: string) => `${b}[#${n}](${issueUrl(Number(n))})`),
      changes: [],
      shipped: [],
    });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, ENTRIES);
}

export type Dashboard = "team" | "mod";
export type Who = { name: string; user: string; dashboards: Dashboard[]; csrf: string };
export type People = Record<string, string>;
export type Stamp = number | string;
export type Choice = "for" | "against" | "abstain";
export type Tally = { for: number; against: number; abstain: number };
export type Role = "mod" | "support" | "team";
export type Status = "open" | "veto-window" | "stalled" | "owner" | "accepted" | "declined";

export type Application = {
  id: string;
  name?: string;
  role: Role;
  status: Status;
  owner?: boolean;
  vote: {
    cast: number;
    quorum: number;
    needed: number;
    closesAt: number;
    extended?: boolean;
    recused?: boolean;
    canVote?: boolean;
    mine?: { choice: Choice; comment?: string } | null;
    tally?: Tally | null;
    ballots?: { by: string; choice: Choice; comment?: string }[];
    againstComments?: string[];
  };
  veto?: { until: number } | null;
  tally?: Tally | null;
  decidedAt?: Stamp;
  revoked?: { at: Stamp; result?: { error?: string } } | null;
  result?: { granted?: boolean; dmSent?: boolean; error?: string } | null;
  githubManual?: boolean;
  contributor?: { login: string; verified?: boolean; merged?: number | null; prs?: { url: string; title: string; number: number }[] } | null;
  questions?: { id: string; label: string }[];
  answers?: Record<string, string>;
  audit?: { at: Stamp; by: string; action: string; choice?: Choice; note?: string }[];
  submittedAt?: Stamp;
};

export type Column = "todo" | "doing" | "done";
export type Card = { id: string; title: string; column: Column; owner?: string | null; note?: string; link?: string; updatedAt?: Stamp };
export type WorkCard = { kind?: string; number?: number | string; title: string; url?: string | null; people?: ({ name?: string; login?: string } | null)[] };
export type TeamItem = {
  id: string;
  title: string;
  status: string;
  area: string;
  owner?: string | null;
  note?: string;
  plain?: string;
  dev?: string;
  links?: string[];
  publishRequested?: { at: Stamp } | null;
};
export type PublicItem = { id: string; title: string; area: string; status: string; team?: { owner?: string | null; priority?: string; note?: string } | null };
export type Decision = {
  id: string;
  at: Stamp;
  by?: string;
  title: string;
  body?: string;
  link?: string;
  item?: string;
  status: "active" | "withdrawn";
  history?: { at: Stamp; by?: string; title: string }[];
};
export type Overview = {
  people: People;
  cards: Record<Column, Card[]>;
  board?: { columns?: { name: string; cards?: WorkCard[] }[] } | null;
  roadmap: { areas?: { id: string; name: string }[]; team?: TeamItem[]; public?: PublicItem[]; available?: boolean };
  decisions?: Decision[];
};

// Which dashboards this browser last signed in to, so the hub can show their tabs without asking Kira on every visit.
// Only a hint for links: every dashboard checks the session itself.
const STAFF_HINT = "hub:staff";
const hintListeners = new Set<() => void>();

export function rememberStaff(dashboards: Dashboard[]) {
  try {
    if (dashboards.length) localStorage.setItem(STAFF_HINT, dashboards.join(","));
    else localStorage.removeItem(STAFF_HINT);
  } catch {}
  hintListeners.forEach((onChange) => onChange());
}

export function subscribeStaffHint(onChange: () => void) {
  hintListeners.add(onChange);
  return () => {
    hintListeners.delete(onChange);
  };
}

export function readStaffHint() {
  try {
    return localStorage.getItem(STAFF_HINT) ?? "";
  } catch {
    return "";
  }
}

export const staffDashboards = (hint: string) => hint.split(",").filter((d): d is Dashboard => d === "team" || d === "mod");

let csrf = "";
export const setCsrf = (token?: string) => {
  csrf = token || "";
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/staff/api/${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(method === "POST" && csrf ? { "X-Staff-Csrf": csrf } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "The dashboards can't be reached right now. Try again in a minute.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    const closed = res.status === 404 || res.status === 502 || (res.status === 503 && !data.error);
    const message =
      data.error && !(res.status === 404 && data.error === "not found") ? data.error : closed ? "The dashboards are closed right now." : `Error ${res.status}.`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function when(value?: Stamp | null) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const month = d.toLocaleString("en", { month: "short" });
  return `${d.getDate()} ${month}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relative(value: Stamp, now = Date.now()) {
  const ms = new Date(value).getTime() - now;
  const abs = Math.abs(ms);
  const text = abs < 3_600_000 ? `${Math.max(1, Math.round(abs / 60_000))} min` : abs < 172_800_000 ? `${Math.round(abs / 3_600_000)} h` : `${Math.round(abs / 86_400_000)} d`;
  return ms >= 0 ? `in ${text}` : `${text} ago`;
}

export function left(ms: number, now = Date.now()) {
  const m = Math.max(0, Math.round((ms - now) / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
}

export function safeLink(link?: string | null): { href?: string; label: string } | null {
  const s = String(link || "").trim();
  if (!s) return null;
  if (/^#\d+$/.test(s)) return { href: `https://github.com/horizon-rust/horizon/issues/${s.slice(1)}`, label: s };
  if (/^https:\/\/(github\.com|playhorizon\.dev)\/[^\s"'<>]*$/.test(s)) return { href: s, label: s.replace(/^https:\/\//, "") };
  if (/^[A-Za-z0-9_./-]+$/.test(s) && !s.includes("..") && !s.startsWith("/")) return { href: `https://github.com/horizon-rust/horizon/blob/main/${s}`, label: s };
  return { label: s };
}

export const safeGithubUrl = (url?: string | null) => (typeof url === "string" && /^https:\/\/github\.com\/[^\s"'<>]+$/.test(url) ? url : undefined);

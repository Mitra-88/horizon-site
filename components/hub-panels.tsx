import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLinkIcon } from "@/components/icons";
import {
  areaName,
  COLUMNS,
  devMarkdown,
  fileUrl,
  inline,
  issueNumber,
  issueUrl,
  journalAnchor,
  linkState,
  progress,
  REPO,
  type BoardCard,
  type ColumnId,
  type HubIssue,
  type JournalEntry,
  type Roadmap,
  type RoadmapItem,
} from "@/components/hub-logic";
import { BoardFilter, BugReport, CopyCommand, JournalFilter } from "@/components/hub-tools";
import { DISCORD_URL } from "@/components/links";

type Live = Map<number, HubIssue>;

function Md({ text, className = "", links = true }: { text: string; className?: string; links?: boolean }) {
  const html = links ? inline(text) : inline(text).replace(/<a href="[^"]*">([\s\S]*?)<\/a>/g, "$1");
  return <span className={`hub-md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Detail({ plain, dev, className = "", links = true }: { plain: string; dev: string; className?: string; links?: boolean }) {
  return (
    <>
      <Md text={plain} links={links} className={`hub-plain block ${className}`} />
      <Md text={dev} links={links} className={`hub-dev block ${className}`} />
    </>
  );
}

function Panel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} data-panel={id} role="tabpanel" aria-labelledby={`tab-${id}`} className="scroll-mt-40">
      {children}
    </section>
  );
}

function Block({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-40 first:mt-0">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">{title}</h2>
      {children}
    </section>
  );
}

const CHIP = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";
const BUTTON_PRIMARY =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-[#6b4bff] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7a5dff]";
const SMALL_BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.07] px-3 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/[0.12] hover:text-white";
const BUTTON =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-white/[0.07] px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.12] hover:text-white";

function Out({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
      <ExternalLinkIcon className="size-3.5 opacity-60" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

const number2 = (i: number) => String(i + 1).padStart(2, "0");

function ItemRows({ items, meta, href }: { items: RoadmapItem[]; meta: (item: RoadmapItem) => string; href?: (item: RoadmapItem) => string }) {
  return (
    <ol className="mt-5 border-t border-white/[0.08]">
      {items.map((item, i) => (
        <li key={item.id} className="border-b border-white/[0.08]">
          <a
            href={href ? href(item) : `#${item.id}`}
            className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-md py-5 outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,14rem)]"
          >
            <span className="pt-0.5 text-xs font-medium text-white/35 tabular-nums">{number2(i)}</span>
            <span>
              <span className="block text-[16px] font-medium text-white transition-colors group-hover:text-[#c9bbff]">{item.title}</span>
              <Detail plain={item.plain} dev={item.dev} links={false} className="mt-1.5 text-[15px] leading-relaxed text-pretty text-white/60" />
            </span>
            <span className="col-start-2 text-sm text-white/45 sm:col-start-3 sm:text-right">{meta(item)}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function OverviewPanel({ roadmap, live }: { roadmap: Roadmap; live: Live }) {
  const o = roadmap.overview;
  const focus = roadmap.items.filter((i) => i.focus);
  const next = roadmap.items.filter((i) => i.status === "next");
  const shipped = roadmap.items.filter((i) => i.status === "shipped").slice(0, 3);
  return (
    <Panel id="overview">
      <Detail plain={o.today_plain} dev={o.today_dev} className="max-w-3xl text-xl leading-relaxed text-pretty text-white/80" />
      <div className="mt-14">
        <Block title="Being done now">
          <ItemRows items={focus} meta={(x) => progress(x, live)} />
        </Block>
        <Block title="Next">
          <ItemRows items={next} meta={(x) => areaName(roadmap, x.area)} />
        </Block>
        <Block title="Recently shipped">
          <ItemRows items={shipped} meta={(x) => (x.shipped_in ? `In ${x.shipped_in}` : "")} />
        </Block>
        <Block title="How to help">
          <Detail plain={o.help_plain} dev={o.help_dev} className="mt-4 max-w-3xl text-[15px] leading-relaxed text-pretty text-white/65" />
          <p className="mt-6 flex flex-wrap gap-2">
            <a href="#contribute" className={BUTTON_PRIMARY}>
              Contribute
            </a>
            <a href="#help-wanted" className={BUTTON}>
              Help wanted
            </a>
            <a href="#report" className={BUTTON}>
              Report a bug
            </a>
            <Out href={DISCORD_URL} className={BUTTON}>
              Suggest something
            </Out>
          </p>
        </Block>
      </div>
    </Panel>
  );
}

const SECTION_LEDE: Record<string, string> = {
  now: "Being worked on, with pull requests open or just merged.",
  next: "Decided, and up after what is being done now.",
  later: "Decided, further out.",
  "help-wanted": "Good first contributions: a clear vanilla behaviour, an issue with the steps, a place to start.",
  shipped: "Out in a release. The journal has every change.",
};

const LINK_TONE: Record<string, string> = {
  open: "bg-white/[0.07] text-white/75",
  "in review": "bg-[#6b4bff]/25 text-[#d4c9ff]",
  "in progress": "bg-amber-300/15 text-amber-100",
  merged: "bg-emerald-400/15 text-emerald-200",
  closed: "bg-white/[0.04] text-white/45",
  dropped: "bg-white/[0.04] text-white/35 line-through",
};

function LinkChip({ link, live }: { link: string; live: Live }) {
  const n = issueNumber(link);
  if (!n) {
    const url = link.startsWith("https://") ? link : fileUrl(link);
    return (
      <a href={url} className={`${CHIP} bg-white/[0.05] font-mono text-white/60 hover:text-white`}>
        {link.replace(/^https:\/\//, "")}
      </a>
    );
  }
  const issue = live.get(n);
  const state = linkState(issue);
  const title = issue ? `${issue.kind === "pr" ? "Pull request" : "Issue"} #${n}: ${issue.title}` : `#${n}`;
  return (
    <a href={issueUrl(n)} title={title} className={`${CHIP} gap-1.5 ${LINK_TONE[state ?? "open"]} hover:brightness-125`}>
      #{n}
      {state && <span className="font-normal opacity-75">{state}</span>}
    </a>
  );
}

function RoadmapCard({ item, roadmap, live }: { item: RoadmapItem; roadmap: Roadmap; live: Live }) {
  const done = item.status === "shipped";
  const state = done ? "" : progress(item, live);
  return (
    <article id={item.id} data-area-item={item.area} className="scroll-mt-40 rounded-xl bg-white/[0.04] p-5 target:ring-2 target:ring-[#a98fff]">
      <p className="flex flex-wrap items-center gap-2">
        <span className={`${CHIP} bg-white/10 text-white/75`}>{areaName(roadmap, item.area)}</span>
        {done && item.shipped_in && <span className={`${CHIP} bg-[#6b4bff]/25 text-[#d4c9ff]`}>{item.shipped_in}</span>}
        {item.ongoing && <span className="text-xs font-medium text-amber-200/80">Ongoing</span>}
      </p>
      <h3 className="mt-3 text-[17px] font-medium text-white">{item.title}</h3>
      <Detail plain={item.plain} dev={devMarkdown(item)} className="mt-2 text-[15px] leading-relaxed text-pretty text-white/65" />
      {state && <p className="mt-3 text-sm font-medium text-[#c9bbff]">{state}</p>}
      {(item.links?.length ?? 0) > 0 && (
        <p className="mt-4 flex flex-wrap gap-1.5">
          {[...new Set(item.links)].map((l) => (
            <LinkChip key={l} link={l} live={live} />
          ))}
        </p>
      )}
    </article>
  );
}

export function RoadmapPanel({ roadmap, live, liveKnown }: { roadmap: Roadmap; live: Live; liveKnown: boolean }) {
  const order = new Map(roadmap.areas.map((a, i) => [a.id, i]));
  return (
    <Panel id="roadmap">
      {roadmap.statuses.map(({ id, name }) => {
        const items = roadmap.items.filter((i) => i.status === id);
        if (!items.length) return null;
        if (id !== "shipped") items.sort((a, b) => (order.get(a.area) ?? 0) - (order.get(b.area) ?? 0));
        return (
          <section key={id} id={id} data-roadmap-section className="mt-14 scroll-mt-40 first:mt-0">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">{name}</h2>
              <p className="text-sm text-white/50">{SECTION_LEDE[id]}</p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <RoadmapCard key={item.id} item={item} roadmap={roadmap} live={live} />
              ))}
            </div>
          </section>
        );
      })}
      <p className="mt-12 max-w-3xl text-sm leading-relaxed text-white/45">
        The roadmap lives in the repository:{" "}
        <a href={fileUrl("ROADMAP.md")} className="text-white/70 underline underline-offset-4 hover:text-white">
          ROADMAP.md
        </a>
        , generated from{" "}
        <a href={fileUrl("roadmap/roadmap.toml")} className="text-white/70 underline underline-offset-4 hover:text-white">
          roadmap/roadmap.toml
        </a>
        . Pull requests carry the <code className="text-white/70">roadmap:&lt;id&gt;</code> label of their item.
        {!liveKnown && " GitHub couldn't be reached just now, so the links show without their state."}
      </p>
    </Panel>
  );
}

const SHOWN = 12;

function Card({ card, roadmap }: { card: BoardCard; roadmap: Roadmap }) {
  const item = card.item ? roadmap.items.find((i) => i.id === card.item) : null;
  const search = [card.n, card.title, card.user, item?.title ?? "", ...card.prs].join(" ").toLowerCase();
  return (
    <li data-board-card data-item={card.item ?? ""} data-search={search}>
      <a href={card.url} className="block rounded-lg bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08]">
        <span className="block text-xs text-white/45 tabular-nums">
          {card.kind === "pr" ? "PR" : "Issue"} #{card.n}
          {card.prs.length > 0 && ` · ${card.prs.map((n) => `PR #${n}`).join(", ")}`}
        </span>
        <span className="mt-1 block text-sm leading-snug [overflow-wrap:anywhere] text-white/85">{card.title}</span>
        {(item || card.user) && (
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
            {item && <span className={`${CHIP} bg-[#6b4bff]/20 px-1.5 text-[11px] text-[#d4c9ff]`}>{item.title}</span>}
            {card.user && <span>{card.user}</span>}
          </span>
        )}
      </a>
    </li>
  );
}

function boardItems(columns: Record<ColumnId, BoardCard[]>, roadmap: Roadmap) {
  const used = new Set(Object.values(columns).flatMap((cards) => cards.map((c) => c.item).filter(Boolean)));
  return roadmap.items.filter((i) => used.has(i.id)).map((i) => ({ id: i.id, title: i.title }));
}

export function BoardPanel({ columns, roadmap }: { columns: Record<ColumnId, BoardCard[]> | null; roadmap: Roadmap }) {
  return (
    <Panel id="board">
      <p className="max-w-3xl text-[15px] leading-relaxed text-white/60">
        Every open issue and pull request, placed by its state on GitHub, as on Kira&apos;s work board in Discord.
      </p>
      {columns ? (
        <>
        <BoardFilter items={boardItems(columns, roadmap)} />
        <div data-board className="mt-6 grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map(({ id, name, about }) => {
            const cards = columns[id];
            return (
              <section key={id} data-board-column aria-labelledby={`col-${id}`} className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06] ring-inset">
                <h3 id={`col-${id}`} className="flex items-center justify-between text-[15px] font-medium text-white">
                  {name}
                  <span data-col-count data-total={cards.length} className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/70 tabular-nums">
                    {cards.length}
                  </span>
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/45">{about}</p>
                <ol className="mt-4 space-y-2">
                  {cards.slice(0, SHOWN).map((c) => (
                    <Card key={c.n} card={c} roadmap={roadmap} />
                  ))}
                </ol>
                {cards.length > SHOWN && (
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none rounded-md py-2 text-sm font-medium text-[#a98fff] hover:text-[#c4b5ff] group-open:hidden [&::-webkit-details-marker]:hidden">
                      Show {cards.length - SHOWN} more
                    </summary>
                    <ol className="space-y-2">
                      {cards.slice(SHOWN).map((c) => (
                        <Card key={c.n} card={c} roadmap={roadmap} />
                      ))}
                    </ol>
                  </details>
                )}
              </section>
            );
          })}
        </div>
        </>
      ) : (
        <p className="mt-6 text-[15px] text-white/60">
          GitHub couldn&apos;t be reached just now; the{" "}
          <a href={`https://github.com/${REPO}/issues`} className="text-[#a98fff] underline underline-offset-4">
            issues
          </a>{" "}
          are all there.
        </p>
      )}
    </Panel>
  );
}

const KIND: Record<JournalEntry["kind"], { label: string; tone: string }> = {
  release: { label: "Game", tone: "bg-[#6b4bff]/25 text-[#d4c9ff]" },
  launcher: { label: "Launcher", tone: "bg-white/10 text-white/80" },
  merged: { label: "Merged", tone: "bg-emerald-400/15 text-emerald-200" },
  week: { label: "This week", tone: "bg-amber-300/15 text-amber-100" },
};

const refs = (prs: number[]) =>
  [...new Set(prs)].map((n) => (
    <a key={n} href={issueUrl(n)} className="ml-1.5 text-xs text-white/40 tabular-nums hover:text-white">
      #{n}
    </a>
  ));

function Changes({ entry, roadmap }: { entry: JournalEntry; roadmap: Roadmap }) {
  if (!entry.changes.length) return null;
  const added = entry.changes.filter((c) => c.section !== "fixed");
  const fixes = entry.changes.length - added.length;
  const groups = new Map<string, typeof entry.changes>();
  for (const c of entry.changes) groups.set(c.item ?? "", [...(groups.get(c.item ?? "") ?? []), c]);
  const order = [...groups.keys()].sort((a, b) => Number(a === "") - Number(b === ""));
  return (
    <>
      <div className="hub-plain mt-3">
        {added.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-white/65 marker:text-white/30">
            {added.map((c, i) => (
              <li key={i}>
                <Md text={c.text} className="inline" />
              </li>
            ))}
          </ul>
        )}
        {fixes > 0 && (
          <p className="mt-2 text-sm text-white/45">
            {added.length ? "And " : ""}
            {fixes} fix{fixes === 1 ? "" : "es"}.
          </p>
        )}
      </div>
      <div className="hub-dev mt-3 space-y-4">
        {order.map((id) => {
          const item = roadmap.items.find((i) => i.id === id);
          return (
            <div key={id || "other"}>
              <p className="text-sm font-medium text-white/80">
                {item ? (
                  <a href={`#${item.id}`} className="hover:text-[#c9bbff]">
                    {item.title}
                  </a>
                ) : (
                  "Other changes"
                )}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-white/65 marker:text-white/30">
                {groups.get(id)!.map((c, i) => (
                  <li key={i}>
                    <Md text={c.text} className="inline" />
                    {refs(c.prs)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function JournalPanel({ entries, roadmap }: { entries: JournalEntry[]; roadmap: Roadmap }) {
  return (
    <Panel id="journal">
      <p className="max-w-3xl text-[15px] leading-relaxed text-white/60">
        Every release with what it changed, grouped by roadmap item in Technical, and a summary of each week.
      </p>
      <JournalFilter present={[...new Set(entries.map((e) => e.kind))]} />
      <div data-journal className="mt-6 border-t border-white/[0.08]">
        {entries.map((e) => {
          const shipped = e.shipped.map((id) => roadmap.items.find((i) => i.id === id)).filter((i) => i !== undefined);
          const kind = KIND[e.kind];
          return (
            <article
              key={e.id}
              id={journalAnchor(e)}
              data-journal-kind={e.kind}
              className="scroll-mt-40 border-b border-white/[0.08] py-7"
            >
              <p className="flex items-center gap-3 text-sm">
                <span className={`${CHIP} ${kind.tone}`}>{kind.label}</span>
                <time dateTime={e.date} className="text-white/45 tabular-nums">
                  {e.date.slice(0, 10)}
                </time>
              </p>
              <h3 className="mt-2.5 text-[17px] font-medium text-white">
                <a href={e.url} className="hover:text-[#c9bbff]">
                  {e.title}
                </a>
              </h3>
              {e.kind === "week" && e.plain && e.dev && (
                <Detail plain={e.plain} dev={e.dev} className="mt-2 max-w-3xl text-[15px] leading-relaxed text-pretty text-white/65" />
              )}
              {e.kind === "merged" && e.plain && <p className="hub-plain mt-2 text-[15px] text-white/60">{e.plain}</p>}
              {shipped.length > 0 && (
                <p className="mt-2 text-sm text-white/60">
                  Shipped:{" "}
                  {shipped.map((i, k) => (
                    <span key={i.id}>
                      {k > 0 && ", "}
                      <a href={`#${i.id}`} className="text-[#c9bbff] hover:underline">
                        {i.title}
                      </a>
                    </span>
                  ))}
                </p>
              )}
              <Changes entry={e} roadmap={roadmap} />
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

type Contributor = { login: string; avatar: string; url: string; commits: number };

const WAYS = [
  {
    title: "Tell us what differs",
    body: "Something that doesn't play like vanilla is a bug. Say what you did, what happened and what vanilla does, with your Horizon version and system.",
    actions: [
      { label: "Report a bug", href: "#report" },
      { label: "Suggest something", href: DISCORD_URL },
    ],
  },
  {
    title: "Take a task",
    body: "Pick a good first task or an open issue. On Discord, /claim 1234 tells everyone you are on issue 1234, so nobody starts the same work; /unclaim frees it.",
    actions: [{ label: "Open issues", href: `https://github.com/${REPO}/issues` }],
  },
  {
    title: "Bring your AI agent",
    body: "On Discord, /agent connect gives your coding agent a personal token for Kira's MCP server: it reads the work board, claims tasks and posts its progress in your name.",
    actions: [{ label: "Join the Discord", href: DISCORD_URL }],
  },
  {
    title: "Benchmark your computer",
    body: "Run the built-in benchmark and share the report: every new machine makes the performance work more accurate. No coding needed.",
    actions: [{ label: "How to", href: "/docs/performance" }],
  },
];

const RULES = [
  ["Vanilla is the specification.", "Wherever Minecraft 26.3 has the feature, Horizon does exactly what it does: read vanilla's code, then match it."],
  ["Small pull requests, proven.", "One change each, under about 500 lines, with the block python3 tools/pr_ready.py prints: formatting, Clippy, tests and the harnesses your change can affect."],
  ["Say who wrote it.", "If an AI agent wrote or posts it, the pull request says so, and commits keep its co-author line."],
  ["Never commit Mojang's files.", "No game jars, assets, decompiled code or prepared resources, and nothing taken from other mods' code."],
];

function TaskRows({ items, live }: { items: RoadmapItem[]; live: Live }) {
  return (
    <ol className="mt-5 border-t border-white/[0.08]">
      {items.map((item, i) => {
        const first = (item.links ?? []).map(issueNumber).find(Boolean) ?? null;
        const issue = first ? live.get(first) : undefined;
        const taken = issue ? issue.assigned || issue.state !== "open" || issue.labels.some((l) => /^(in progress|claimed)$/i.test(l)) : false;
        return (
          <li key={item.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-white/[0.08] py-5 sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
            <span className="pt-0.5 text-xs font-medium text-white/35 tabular-nums">{number2(i)}</span>
            <a href={first ? issueUrl(first) : `#${item.id}`} className="group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]">
              <span className="block text-[16px] font-medium text-white transition-colors group-hover:text-[#c9bbff]">{item.title}</span>
              <Detail plain={item.plain} dev={item.dev} links={false} className="mt-1.5 text-[15px] leading-relaxed text-pretty text-white/60" />
            </a>
            <span className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3 sm:flex-col sm:items-end">
              {first && (
                <a href={issueUrl(first)} className="text-sm text-white/45 tabular-nums hover:text-white">
                  #{first}
                  {taken && <span className="ml-1.5 text-amber-200/80">{issue?.state === "open" ? "claimed" : "closed"}</span>}
                </a>
              )}
              {first && !taken && <CopyCommand command={`/claim ${first}`} label={`Copy /claim ${first} for Discord`} />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ContributePanel({
  roadmap,
  contributors,
  live,
  version,
}: {
  roadmap: Roadmap;
  contributors: Contributor[] | null;
  live: Live;
  version: string;
}) {
  const wanted = roadmap.items.filter((i) => i.status === "help-wanted");
  return (
    <Panel id="contribute">
      <Block title="Good first tasks">
        <p className="hub-plain mt-2 max-w-3xl text-[15px] text-white/60">
          Each one is a small difference from vanilla, with an issue that says how to see it. Found one you like? Copy its /claim command and send it
          on Discord, so nobody starts the same work.
        </p>
        <p className="hub-dev mt-2 max-w-3xl text-[15px] text-white/60">
          Each links its issue; the technical text says where in the code and in vanilla to start. /claim on Discord marks it as yours, /unclaim frees it.
        </p>
        <TaskRows items={wanted} live={live} />
      </Block>

      <Block title="Ways to help">
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {WAYS.map((w) => (
            <article key={w.title} className="flex flex-col rounded-xl bg-white/[0.04] p-5">
              <h3 className="text-[16px] font-medium text-white">{w.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-white/60">{w.body}</p>
              <p className="mt-4 flex flex-wrap gap-2">
                {w.actions.map((a) =>
                  a.href.startsWith("/") ? (
                    <Link key={a.label} href={a.href} className={SMALL_BUTTON}>
                      {a.label}
                    </Link>
                  ) : a.href.startsWith("#") ? (
                    <a key={a.label} href={a.href} className={SMALL_BUTTON}>
                      {a.label}
                    </a>
                  ) : (
                    <Out key={a.label} href={a.href} className={SMALL_BUTTON}>
                      {a.label}
                    </Out>
                  ),
                )}
              </p>
            </article>
          ))}
        </div>
      </Block>

      <Block title="Report a bug" id="report">
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-white/60">
          One bug per report: something that breaks, or doesn&apos;t play like vanilla. Fill this in and it opens as a ready issue on GitHub for you to
          check and send, with the steps in the order the maintainers need them.
        </p>
        <BugReport version={version} />
      </Block>

      <Block title="The rules">
        <ol className="mt-5 max-w-3xl list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-white/65 marker:text-white/35">
          {RULES.map(([lead, rest]) => (
            <li key={lead}>
              <strong className="font-medium text-white">{lead}</strong> {rest}
            </li>
          ))}
        </ol>
        <p className="mt-6 flex flex-wrap gap-2">
          <Link href="/docs/contributing" className={BUTTON_PRIMARY}>
            The contributing guide
          </Link>
          <Link href="/docs/how-horizon-is-built" className={BUTTON}>
            How Horizon is built
          </Link>
          <Out href={fileUrl("CONTRIBUTING.md")} className={BUTTON}>
            CONTRIBUTING.md
          </Out>
        </p>
      </Block>

      {contributors && contributors.length > 0 && (
        <Block title="Contributors" id="hub-contributors">
          <p className="mt-2 text-[15px] text-white/60">
            Everyone with commits in Horizon. On Discord, <code className="text-white/75">/link-github &lt;your login&gt; credit:True</code> adds
            your Discord name next to yours.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {contributors.map((c) => (
              <li key={c.login}>
                <a href={c.url} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.05]">
                  <Image src={c.avatar} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full bg-white/[0.06]" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{c.login}</span>
                    <span className="block text-xs text-white/45">
                      {c.commits.toLocaleString("en-US")} {c.commits === 1 ? "commit" : "commits"}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </Panel>
  );
}

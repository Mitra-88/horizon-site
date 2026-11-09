import Image from "next/image";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/components/github-fresh";
import { githubFetch } from "@/components/github-api";
import { format, getMessages, NUMBER_LOCALE, rich, type Locale } from "@/components/i18n";
import { ClaudeIcon, ExternalLinkIcon } from "@/components/icons";
import { GITHUB_URL } from "@/components/links";

const REPO = "horizon-rust/horizon";

const NOT_PEOPLE = new Set(["claude", "cursoragent", "noreply"]);

const TEAM = [{ name: "Anthony S", role: "webDeveloper" as const, avatar: "/media/anthony-s.webp", url: "https://dezerx.com" }];

const FEATURED = 6;

type GitHubContributor = { login: string; avatar_url: string; html_url: string; contributions: number; type: string };
type Contributor = { login: string; avatar: string; url: string; commits: number };
type Card = { name: string; detail: string; avatar: string; url: string };

export async function getContributors(): Promise<Contributor[] | null> {
  "use cache";
  cacheTag(TAGS.main);
  const all: GitHubContributor[] = [];
  try {
    for (let page = 1; page <= 5; page++) {
      const res = await githubFetch(`/repos/${REPO}/contributors?per_page=100&page=${page}`);
      if (!res.ok) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
      const batch: GitHubContributor[] = await res.json();
      all.push(...batch);
      if (batch.length < 100) break;
    }
  } catch (error) {
    console.error(`Couldn't load contributors for ${REPO}:`, error);
    cacheLife("minutes");
    return null;
  }

  cacheLife("hours");
  return all
    .filter((c) => c.type === "User" && !NOT_PEOPLE.has(c.login))
    .map((c) => ({ login: c.login, avatar: c.avatar_url, url: c.html_url, commits: c.contributions }));
}

export async function Contributors({ locale }: { locale: Locale }) {
  const { common, home } = getMessages(locale);
  const t = home.contributors;
  const commitCount = (n: number) => (n === 1 ? t.oneCommit : format(t.commits, { n: n.toLocaleString(NUMBER_LOCALE[locale]) }));
  const committerCard = (c: Contributor): Card => ({
    name: c.login,
    detail: commitCount(c.commits),
    avatar: c.avatar,
    url: c.url,
  });
  const contributors = await getContributors();
  const committers = FEATURED - TEAM.length;
  const cards: Card[] = [
    ...(contributors?.slice(0, 1).map(committerCard) ?? []),
    ...TEAM.map((m) => ({ name: m.name, detail: t[m.role], avatar: m.avatar, url: m.url })),
    ...(contributors?.slice(1, committers).map(committerCard) ?? []),
  ];
  const rest = contributors?.slice(committers) ?? [];

  return (
    <section id="contributors" aria-labelledby="contributors-title" className="scroll-mt-14 pb-8">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <div className="reveal flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">{t.eyebrow}</p>
            <h2
              id="contributors-title"
              className="group mt-5 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white"
            >
              {contributors ? (
                <span className="relative">
                  {format(t.title, { n: contributors.length + TEAM.length })}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-[0.2em] left-full ml-3 hidden translate-y-1 items-center gap-1.5 font-sans text-lg font-medium tracking-normal whitespace-nowrap text-[#d97757] opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
                  >
                    {rich(t.claude, {
                      claude: () => <ClaudeIcon className="size-[1.1em] transition-transform duration-700 group-hover:rotate-90" />,
                    })}
                  </span>
                </span>
              ) : (
                t.titleFallback
              )}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-pretty text-white/60">
              {format(t.lead, { repo: REPO })}
            </p>
          </div>
          <a
            href={`${GITHUB_URL}/graphs/contributors`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium text-[#a98fff] underline decoration-[#a98fff]/40 underline-offset-4 transition-colors hover:text-[#c4b5ff] hover:decoration-[#c4b5ff]"
          >
            {t.all}
            <ExternalLinkIcon className="size-4" />
            <span className="sr-only">{common.newTab}</span>
          </a>
        </div>

        <ul className="reveal mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li key={c.name} className="flex">
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center gap-4 rounded-xl bg-white/[0.04] p-4 transition-colors outline-none hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[#a98fff]"
              >
                <Image src={c.avatar} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-white">{c.name}</span>
                  <span className="block text-sm text-white/50">{c.detail}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        {rest.length > 0 && (
          <ul className="reveal mt-6 flex flex-wrap gap-2">
            {rest.map((c) => (
              <li key={c.login}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${c.login} · ${commitCount(c.commits)}`}
                  className="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]"
                >
                  <Image
                    src={c.avatar}
                    alt={c.login}
                    width={40}
                    height={40}
                    className="size-10 rounded-full bg-white/[0.06] transition-transform motion-safe:hover:-translate-y-0.5"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

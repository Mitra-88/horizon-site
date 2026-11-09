import { CheckIcon, ChevronDownIcon, ExternalLinkIcon } from "@/components/icons";
import { format, getMessages, rich, type Locale, type Messages } from "@/components/i18n";
import { GITHUB_URL } from "@/components/links";

const HARNESSES = 281;
const AUDITED = "2026-10-13";

const SCALE = [0, 0.25, 0.5, 0.75, 1] as const;
type Score = (typeof SCALE)[number];

type Subsystem = { key: keyof Messages["home"]["parity"]["subsystems"]; score: Score };

const SUBSYSTEMS = (
  [
  { key: "loop", score: 1 },
  { key: "assets", score: 1 },
  { key: "network", score: 1 },
  { key: "chunks", score: 1 },
  { key: "meshing", score: 1 },
  { key: "rendering", score: 1 },
  { key: "lighting", score: 1 },
  { key: "worldgen", score: 1 },
  { key: "saves", score: 1 },
  { key: "entities", score: 1 },
  { key: "inventory", score: 1 },
  { key: "menus", score: 1 },
  { key: "audio", score: 1 },
  { key: "blocks", score: 1 },
  ] satisfies Subsystem[]
).map((s, i) => ({ ...s, number: String(i + 1).padStart(2, "0") }));

const half = Math.ceil(SUBSYSTEMS.length / 2);

const status = (t: Messages["home"]["parity"], score: Score) =>
  score === 1 ? t.passed : format(t.scored, { score, label: t.scale[score] });

function Meter({ score }: { score: number }) {
  return (
    <span aria-hidden className="flex shrink-0 gap-0.5">
      {[0.25, 0.5, 0.75, 1].map((step) => (
        <span key={step} className={`h-3 w-1.5 rounded-[1px] ${score >= step ? "bg-[#a98fff]" : "bg-white/12"}`} />
      ))}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden className="mx-2 text-white/30">
      ·
    </span>
  );
}

const LINK =
  "text-white/75 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60";

export function Parity({ locale }: { locale: Locale }) {
  const { common, home } = getMessages(locale);
  const t = home.parity;
  return (
    <section id="parity" aria-labelledby="parity-title" className="scroll-mt-14 pb-24 sm:pb-32">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <p className="reveal text-sm font-medium text-white/60"></p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div className="reveal">
            <p className="text-accent font-display text-[clamp(6rem,18vw,11rem)] leading-[0.82] font-semibold tracking-[-0.05em] tabular-nums">
              {HARNESSES}
            </p>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-pretty text-white/70">
              {t.harnesses}
            </p>
          </div>

          <div className="reveal">
            <h2
              id="parity-title"
              className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white"
            >
              {t.title}
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-pretty text-white/60">
              {t.lead}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              {rich(t.audited, {
                date: () => <time dateTime={AUDITED}>{AUDITED}</time>,
                dot: () => <Dot />,
                link: (chunks) => (
                  <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 ${LINK}`}>
                    {chunks}
                    <ExternalLinkIcon className="size-3.5" />
                    <span className="sr-only">{common.newTab}</span>
                  </a>
                ),
              })}
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-x-12 lg:grid-cols-2">
          {[SUBSYSTEMS.slice(0, half), SUBSYSTEMS.slice(half)].map((column, c) => (
            <ul key={c} className={`reveal border-white/[0.08] ${c === 0 ? "border-t" : "lg:border-t"}`}>
              {column.map((s) => (
                <li key={s.number} className="border-b border-white/[0.08]">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-4 rounded-md py-4 outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] [&::-webkit-details-marker]:hidden">
                      <span className="w-6 shrink-0 text-xs font-medium text-white/35 tabular-nums">{s.number}</span>
                      <span className="min-w-0 flex-1 text-[15px] font-medium text-white">{t.subsystems[s.key].name}</span>
                      <Meter score={s.score} />
                      <span className="sr-only">{status(t, s.score)}</span>
                      <ChevronDownIcon className="size-4 shrink-0 text-white/40 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pr-8 pb-5 pl-10">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[#a98fff]">
                        <CheckIcon className="size-3.5" />
                        {status(t, s.score)}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-pretty text-white/60">{t.subsystems[s.key].detail}</p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ))}
        </div>

        <div className="reveal mt-10 text-sm leading-relaxed text-white/50">
          <p>{t.scaleTitle}</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {SCALE.map((score) => (
              <li key={score} className="flex items-center gap-2">
                <Meter score={score} />
                <span>
                  <span className="text-white/75 tabular-nums">{score}</span> {t.scale[score]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

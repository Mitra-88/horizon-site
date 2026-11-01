import { CheckIcon, ChevronDownIcon, ExternalLinkIcon } from "@/components/icons";
import { GITHUB_URL } from "@/components/links";

const HARNESSES = 281;
const AUDITED = "2026-10-13";

const SCALE = [
  { score: 0, label: "absent" },
  { score: 0.25, label: "started" },
  { score: 0.5, label: "playable, major features missing" },
  { score: 0.75, label: "mostly complete" },
  { score: 1, label: "complete and verified against vanilla by differential tests" },
];

const SUBSYSTEMS = [
  {
    name: "Window, input and game loop",
    score: 1,
    detail:
      "The game loop, options, camera, auto-jump, toggle sprint/sneak, local input and the frame limiter match vanilla.",
  },
  {
    name: "Assets and resources",
    score: 1,
    detail:
      "Item models match vanilla over 196,290 stacks and the client draws every item through them; the resource pack screen matches vanilla's drawing over 3,000 sessions of clicks, scrolling and searching, its incompatibility confirmation included.",
  },
  {
    name: "Network protocol and multiplayer",
    score: 1,
    detail:
      "Joins vanilla servers; the dedicated server (--dedicated) matches vanilla's files, status ping, login, configuration, play, chunks, chat, recipes, advancements and command tree, a client built from vanilla's packet code joins it, Horizon joins a vanilla server, and LAN discovery matches over 462 cases (offline mode only).",
  },
  {
    name: "Chunk storage and palettes",
    score: 1,
    detail: "Client and saves share paletted containers, identical to vanilla over 266 scenarios.",
  },
  {
    name: "Section meshing",
    score: 1,
    detail: "112 scenes and over a million quads identical to vanilla.",
  },
  {
    name: "Rendering",
    score: 1,
    detail:
      "Entity models, block entity renderers (407 cases, End portals, gateways and the loom's banner preview included) and their animations (296 cases, End gateway beams included), the HUD overlays (2,200 states), the recipe book (600 states), the player list, subtitles and the world border match vanilla.",
  },
  {
    name: "Lighting",
    score: 1,
    detail: "Saved and relit light matches vanilla, slabs and stairs included.",
  },
  {
    name: "World generation",
    score: 1,
    detail: "2,352 whole chunks over 225 structure sites, in all three dimensions, identical to vanilla.",
  },
  {
    name: "Region files and saves",
    score: 1,
    detail:
      "Saves round-trip with vanilla, and worlds from 1.8 to 26.2 upgrade as vanilla's DataFixers do, superflat worlds included; old options.txt and hotbar.nbt files are upgraded too.",
  },
  {
    name: "Entities and physics",
    score: 1,
    detail:
      "Attributes, dimensions, death loot, spawn rules, natural spawning (15,500 cases), raids and patrols (1,900 cases), spawned mobs' gear, enchantments and state (finalizeSpawn, 24,000 cases) and mob AI (92 scenarios: villager breeding and gossip, the warden, ghastlings and copper golems included) match vanilla.",
  },
  {
    name: "Interaction and inventory",
    score: 1,
    detail:
      "Menu clicks match over 8,000 click sequences, the loom and the crafter included; recipe book placement (6,000 cases), its buttons (1,200), the saved book (1,500) and the loom and crafter screens (1,600) match vanilla.",
  },
  {
    name: "Menus, HUD and chat",
    score: 1,
    detail:
      "Every command runs as vanilla (758 commands over 39,685 parsed inputs), scoreboards and teams match (81,000 operations), the player list matches over 872,000 draw calls with heads drawn from players' skins (authlib's textures, SkinManager's lookup, legacy skin conversion), and the chat matches focused and scrolled; the resource pack screen (selection over 4,000 cases, drawing and its incompatibility confirmation over 3,000 sessions) and the chat input with its command suggestions, usage lines, Tab completion and history (3,000 sessions on vanilla's client command tree) match vanilla.",
  },
  {
    name: "Audio",
    score: 1,
    detail: "The sound engine, sound events, music, situational music, ambience and subtitles match vanilla.",
  },
  {
    name: "Block behaviours and ticking",
    score: 1,
    detail:
      "Block updates, random ticks, redstone, dispensers (6,000 cases), crafters (4,000 crafts), block entity removal (containers spill, 4,000 cases), copper golem chest sorting and the sculk family (435 scenarios: shrieker warnings and warden summoning included) match vanilla.",
  },
].map((s, i) => ({ ...s, number: String(i + 1).padStart(2, "0") }));

const half = Math.ceil(SUBSYSTEMS.length / 2);

const status = (score: number) =>
  score === 1 ? "Passes its harnesses" : `Scores ${score}: ${SCALE.find((s) => s.score === score)?.label}`;

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

export function Parity() {
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
              differential harnesses drive the same inputs through Horizon and through the vanilla client and server,
              and compare what comes out.
            </p>
          </div>

          <div className="reveal">
            <h2
              id="parity-title"
              className="font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white"
            >
              Every subsystem passes the harnesses that compare it.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-pretty text-white/60">
              Below is the project&apos;s own audit of each subsystem. Every subsystem now matches vanilla in every
              harness that compares it.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              Last audited <time dateTime={AUDITED}>{AUDITED}</time>
              <Dot />
              players still find differences:{" "}
              <a
                href={`${GITHUB_URL}/issues`}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 ${LINK}`}
              >
                the open reports
                <ExternalLinkIcon className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
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
                      <span className="min-w-0 flex-1 text-[15px] font-medium text-white">{s.name}</span>
                      <Meter score={s.score} />
                      <span className="sr-only">{status(s.score)}</span>
                      <ChevronDownIcon className="size-4 shrink-0 text-white/40 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pr-8 pb-5 pl-10">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-[#a98fff]">
                        <CheckIcon className="size-3.5" />
                        {status(s.score)}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-pretty text-white/60">{s.detail}</p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ))}
        </div>

        <div className="reveal mt-10 text-sm leading-relaxed text-white/50">
          <p>Each subsystem scores</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {SCALE.map((s) => (
              <li key={s.score} className="flex items-center gap-2">
                <Meter score={s.score} />
                <span>
                  <span className="text-white/75 tabular-nums">{s.score}</span> {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

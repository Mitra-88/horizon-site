"use client";

import { Cancel01Icon, MinusSignIcon, PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { playerHead, type Instance } from "@/components/launcher/launcher-data";
import { Icon, ICON_BUTTON, PLAY, Toggle } from "@/components/launcher/launcher-ui";

export type ServerDraft = {
  name: string;
  world: { kind: "new"; seed: string } | { kind: "copy"; name: string; cover: string };
  mode: "Survival" | "Creative" | "Adventure";
  difficulty: "Peaceful" | "Easy" | "Normal" | "Hard";
  max: number;
  access: "friends" | "anyone";
  friends: string[];
  checkAccounts: boolean;
};

const MODES: { id: ServerDraft["mode"]; note: string }[] = [
  { id: "Survival", note: "Gather, build and stay alive" },
  { id: "Creative", note: "Fly and build with every block" },
  { id: "Adventure", note: "Play a map the way it was made" },
];
const DIFFICULTIES: ServerDraft["difficulty"][] = ["Peaceful", "Easy", "Normal", "Hard"];
const FIELD_LG = "h-12 w-full rounded-[12px] bg-white/[0.06] px-4 text-[15px] outline-none transition-colors placeholder:text-white/35 hover:bg-white/[0.08] focus:bg-white/[0.1]";
const chosen = (on: boolean) => (on ? "bg-white/[0.12]" : "bg-white/[0.04] hover:bg-white/[0.07]");
const COVERS: Record<string, string> = {
  Survival: "/media/bench/village.webp",
  Creative: "/media/underwater.webp",
  Adventure: "/media/nether.webp",
};

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h3 className="text-[13px] font-medium text-white/60">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function ServerModal({
  player,
  instances,
  onCreate,
  onClose,
  say,
}: {
  player: string;
  instances: Instance[];
  onCreate: (draft: ServerDraft) => void;
  onClose: () => void;
  say: (text: string) => void;
}) {
  const worlds = instances.flatMap((i) => i.worlds.map((w) => ({ ...w, instance: i.name, cover: i.shots[0]?.src ?? COVERS[w.mode] ?? COVERS.Survival })));
  const [name, setName] = useState("");
  const [worldKind, setWorldKind] = useState<"new" | "copy">("new");
  const [seed, setSeed] = useState("");
  const [copied, setCopied] = useState(worlds[0]?.name ?? "");
  const [mode, setMode] = useState<ServerDraft["mode"]>("Survival");
  const [difficulty, setDifficulty] = useState<ServerDraft["difficulty"]>("Normal");
  const [max, setMax] = useState(10);
  const [access, setAccess] = useState<ServerDraft["access"]>("friends");
  const [friends, setFriends] = useState<string[]>([player]);
  const [friend, setFriend] = useState("");
  const [checkAccounts, setCheckAccounts] = useState(false);
  const [eula, setEula] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => nameInput.current?.focus(), []);

  const title = name.trim() || "My server";
  const copy = worlds.find((w) => w.name === copied);
  const cover = worldKind === "copy" && copy ? copy.cover : COVERS[mode];
  const validFriend = /^[A-Za-z0-9_]{3,16}$/.test(friend) && !friends.includes(friend);

  const addFriend = () => {
    if (!validFriend) return;
    setFriends((list) => [...list, friend]);
    setFriend("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!eula) return;
    onCreate({
      name: title,
      world: worldKind === "copy" && copy ? { kind: "copy", name: copy.name, cover: copy.cover } : { kind: "new", seed: seed.trim() },
      mode,
      difficulty,
      max,
      access,
      friends,
      checkAccounts,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6">
      <div aria-hidden className="absolute inset-0 bg-[#07050f]/50 backdrop-blur-xl" onMouseDown={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="server-title"
        onSubmit={submit}
        className="hzl-glass hzl-pop relative flex h-full max-h-[840px] w-full max-w-[1180px] flex-col overflow-y-auto rounded-[28px] md:flex-row md:overflow-hidden"
      >
        <aside className="flex shrink-0 flex-col bg-white/[0.035] p-6 md:w-[360px] md:overflow-y-auto md:p-7">
          <p className="text-[13px] font-medium text-white/55">New server</p>
          <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-[18px]">
            <Image key={cover} src={cover} alt="" fill sizes="320px" className="hzl-pop object-cover" />
          </div>
          <p className="mt-5 truncate font-display text-[30px] leading-[1.05] font-semibold tracking-[-0.03em]">{title}</p>
          <p className="mt-2 text-[14px] leading-[1.5] text-white/65">
            {mode} · {difficulty} · up to {max} players · {access === "friends" ? "friends only" : "anyone with the address"}
          </p>
          <p className="mt-1 text-[14px] text-white/50">{worldKind === "copy" && copy ? `A copy of ${copy.name}` : seed.trim() ? `New world, seed ${seed.trim()}` : "A new world with a random seed"}</p>
          <p className="mt-auto pt-8 text-[13px] leading-[1.55] text-white/50">
            Everything has a default: tick the EULA and Create makes a friends-only survival world. You can change all of it later, from the server&apos;s Settings tab.
          </p>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 md:px-9 md:pt-8">
            <div className="min-w-0">
              <h2 id="server-title" className="font-display text-[clamp(1.6rem,2.4vw,2.1rem)] leading-tight font-semibold tracking-[-0.03em]">
                Create a server
              </h2>
              <p className="mt-1.5 text-[14px] text-white/60">The same program a VPS runs, started from here with buttons.</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className={ICON_BUTTON}>
              <Icon icon={Cancel01Icon} size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-9 px-6 pb-8 md:overflow-y-auto md:px-9">
            <Section title="Name">
              <input ref={nameInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="My server" aria-label="Server name" className={FIELD_LG} />
            </Section>

            <Section title="World">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  { id: "new" as const, title: "New world", note: "Generated the first time it starts" },
                  { id: "copy" as const, title: "Copy one of my worlds", note: worlds.length ? `${worlds.length} worlds to pick from` : "No worlds yet" },
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={o.id === "copy" && worlds.length === 0}
                    aria-pressed={worldKind === o.id}
                    onClick={() => setWorldKind(o.id)}
                    className={`rounded-[16px] p-4 text-left transition-colors disabled:opacity-40 ${chosen(worldKind === o.id)}`}
                  >
                    <span className="block text-[15px] font-semibold">{o.title}</span>
                    <span className="block text-[13px] text-white/55">{o.note}</span>
                  </button>
                ))}
              </div>
              {worldKind === "new" ? (
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Seed, optional: leave empty for a random world"
                  aria-label="Seed"
                  className={`${FIELD_LG} mt-2.5`}
                />
              ) : (
                <ul className="mt-2.5 max-h-[232px] overflow-y-auto rounded-[16px] bg-white/[0.04] p-1.5">
                  {worlds.map((w) => (
                    <li key={`${w.instance}-${w.name}`}>
                      <button
                        type="button"
                        aria-pressed={copied === w.name}
                        onClick={() => setCopied(w.name)}
                        className={`flex w-full items-center gap-3.5 rounded-[12px] p-2 pr-4 text-left transition-colors ${copied === w.name ? "bg-white/[0.11]" : "hover:bg-white/[0.05]"}`}
                      >
                        <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-[8px]">
                          <Image src={w.cover} alt="" fill sizes="64px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{w.name}</span>
                          <span className="block truncate text-[13px] text-white/55">
                            {w.instance} · {w.mode} · {w.size}
                          </span>
                        </span>
                        <span className="flex w-5 justify-center text-(--accent-soft)">{copied === w.name && <Icon icon={Tick02Icon} size={18} />}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Game mode">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {MODES.map((m) => (
                  <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)} className={`rounded-[16px] p-4 text-left transition-colors ${chosen(mode === m.id)}`}>
                    <span className="block text-[15px] font-semibold">{m.id}</span>
                    <span className="block text-[13px] leading-snug text-white/55">{m.note}</span>
                  </button>
                ))}
              </div>
            </Section>

            <div className="grid gap-9 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Section title="Difficulty">
                <div role="radiogroup" aria-label="Difficulty" className="inline-flex flex-wrap gap-1 rounded-[14px] bg-white/[0.04] p-1">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={difficulty === d}
                      onClick={() => setDifficulty(d)}
                      className={`h-10 rounded-[10px] px-4 text-[14px] transition-colors ${difficulty === d ? "bg-white/[0.14] font-medium text-white" : "text-white/65 hover:text-white"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Most players at once">
                <div className="inline-flex items-center gap-1 rounded-[14px] bg-white/[0.04] p-1">
                  <button type="button" aria-label="Fewer players" disabled={max <= 1} onClick={() => setMax((n) => Math.max(1, n - 1))} className="inline-flex size-10 items-center justify-center rounded-[10px] transition-colors hover:bg-white/[0.08] disabled:opacity-35">
                    <Icon icon={MinusSignIcon} size={17} />
                  </button>
                  <span className="w-12 text-center text-[17px] font-semibold tabular-nums">{max}</span>
                  <button type="button" aria-label="More players" disabled={max >= 100} onClick={() => setMax((n) => Math.min(100, n + 1))} className="inline-flex size-10 items-center justify-center rounded-[10px] transition-colors hover:bg-white/[0.08] disabled:opacity-35">
                    <Icon icon={PlusSignIcon} size={17} />
                  </button>
                </div>
              </Section>
            </div>

            <Section title="Who can join">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  { id: "friends" as const, title: "Friends only", note: "A whitelist of the names below" },
                  { id: "anyone" as const, title: "Anyone with the address", note: "Keep it on your network or Tailscale" },
                ].map((o) => (
                  <button key={o.id} type="button" aria-pressed={access === o.id} onClick={() => setAccess(o.id)} className={`rounded-[16px] p-4 text-left transition-colors ${chosen(access === o.id)}`}>
                    <span className="block text-[15px] font-semibold">{o.title}</span>
                    <span className="block text-[13px] text-white/55">{o.note}</span>
                  </button>
                ))}
              </div>
              {access === "friends" && (
                <>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {friends.map((f, i) => (
                      <li key={f} className="flex h-11 items-center rounded-[12px] bg-white/[0.06]">
                        <span className="flex items-center gap-2.5 pr-3 pl-1.5 text-[14px] font-medium">
                          <Image src={playerHead(f, 64)} alt="" width={30} height={30} unoptimized className="size-[30px] rounded-[8px] [image-rendering:pixelated]" />
                          {f}
                          {i === 0 && <span className="text-[12px] font-normal text-(--accent-soft)">Operator</span>}
                        </span>
                        {i > 0 && (
                          <button
                            type="button"
                            aria-label={`Remove ${f}`}
                            onClick={() => setFriends((list) => list.filter((x) => x !== f))}
                            className="mr-1.5 inline-flex size-7 items-center justify-center rounded-[8px] text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
                          >
                            <Icon icon={Cancel01Icon} size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                    <li className="flex h-11 items-center rounded-[12px] bg-white/[0.04] pr-1.5 focus-within:bg-white/[0.08]">
                      <input
                        value={friend}
                        onChange={(e) => setFriend(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addFriend();
                          }
                        }}
                        placeholder="Add a friend's name"
                        aria-label="Friend's name"
                        maxLength={16}
                        className="h-full w-[170px] bg-transparent px-3.5 text-[14px] outline-none placeholder:text-white/40"
                      />
                      <button type="button" disabled={!validFriend} onClick={addFriend} className="h-8 rounded-[9px] bg-white/[0.08] px-3 text-[13px] font-medium transition-colors hover:bg-white/[0.14] disabled:opacity-40">
                        Add
                      </button>
                    </li>
                  </ul>
                  <p className="mt-2.5 text-[13px] text-white/50">The first one becomes an operator. Add more later on the Players tab.</p>
                </>
              )}
            </Section>

            <div className="flex items-start justify-between gap-6 rounded-[16px] bg-white/[0.04] p-4">
              <div>
                <p className="text-[15px] font-semibold">Check Minecraft accounts</p>
                <p className="mt-0.5 max-w-[60ch] text-[13px] leading-[1.5] text-white/55">
                  Off for Horizon players, who can&apos;t sign in with Microsoft yet. Turn it on only if every player signs in.
                </p>
              </div>
              <Toggle on={checkAccounts} onChange={setCheckAccounts} label="Check Minecraft accounts" />
            </div>
          </div>

          <footer className="flex flex-col gap-4 bg-white/[0.03] px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-9">
            <label className="flex cursor-pointer items-center gap-3 text-[14px]">
              <input type="checkbox" checked={eula} onChange={(e) => setEula(e.target.checked)} className="peer sr-only" />
              <span
                aria-hidden
                className={`inline-flex size-[22px] shrink-0 items-center justify-center rounded-[7px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--accent-soft) ${
                  eula ? "bg-(--accent) text-(--on-accent)" : "bg-white/[0.1]"
                }`}
              >
                {eula && <Icon icon={Tick02Icon} size={15} />}
              </span>
              I agree to the Minecraft EULA
              <button type="button" onClick={() => say("Opened minecraft.net/eula in your browser")} className="font-medium text-(--accent-soft) hover:text-white">
                Read it
              </button>
            </label>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="h-12 rounded-[12px] px-5 text-[15px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={!eula} title={eula ? undefined : "Tick the EULA first"} className={`${PLAY} h-12 px-8 text-[15px]`}>
                Create server
              </button>
            </div>
          </footer>
        </section>
      </form>
    </div>
  );
}

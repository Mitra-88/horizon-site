"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { loadPaddle, type PaddleJs } from "@/components/shop/paddle-js";

// The founder claim, on the site: the buyer names the Minecraft account (the cosmetics service looks it up at Mojang and
// we show its skin's face to confirm), the service starts a free Paddle transaction bound to that account's UUID, and
// Paddle's overlay runs it here. Nothing here grants anything: Paddle's webhook tells the service, which gives the set to
// that account; the launcher's Wardrobe shows it. Nobody signs in on this site.

type Player = { uuid: string; name: string; skin: string | null; founderClaimed: boolean };

type State =
  | { at: "name" }
  | { at: "finding" }
  | { at: "found"; player: Player }
  | { at: "starting"; player: Player }
  | { at: "checkout"; player: Player; txn: string }
  | { at: "waiting"; player: Player; txn: string }
  | { at: "delivered"; player: Player; txn: string }
  | { at: "slow"; player: Player; txn: string }
  | { at: "closed"; player: Player }
  | { at: "error"; message: string; player?: Player };

const NAME = /^[A-Za-z0-9_]{1,16}$/;
const SKIN = /^https:\/\/textures\.minecraft\.net\/texture\/[0-9a-f]{1,128}$/;
const TXN = /^txn_[a-z0-9]{26}$/;
// After Paddle's "completed", how long to wait for the service to say the set is on the account.
const POLL_MS = 3000;
const POLL_FOR_MS = 120_000;

const BUTTON =
  "inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#6b4bff] px-5 text-[15px] font-medium text-white transition-colors outline-none hover:bg-[#7a5dff] focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-60";
const QUIET =
  "inline-flex h-12 items-center justify-center rounded-[10px] bg-white/[0.08] px-5 text-[15px] font-medium text-white transition-colors outline-none hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-60";
const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

const MESSAGES: Record<string, string> = {
  player: "No Minecraft: Java Edition account has that name. Check the spelling.",
  name: "A Minecraft name has 1 to 16 letters, digits or underscores.",
  claimed: "This account already has the founder set. It's in the launcher's Wardrobe.",
  claim_not_open: "The claim isn't open yet.",
  claim_closed: "The claim has ended: the founder set is retired for good.",
  sales_off: "The claim isn't open yet.",
  slow_down: "Too many tries in a row. Wait a minute, then try again.",
  busy: "The shop is busy. Try again in a moment.",
  mojang: "Mojang's profile service didn't answer. Try again in a moment.",
  paddle: "Paddle couldn't start the checkout. Nothing was charged; try again in a moment.",
};
const UNREACHABLE = "Horizon's shop couldn't be reached. Check your connection and try again.";

async function call(api: string, path: string, init?: RequestInit): Promise<{ ok: boolean; body: Record<string, unknown> }> {
  const res = await fetch(`${api}${path}`, { ...init, cache: "no-store", headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) } });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, body };
}

const errorText = (body: Record<string, unknown>) => (typeof body.error === "string" && MESSAGES[body.error]) || UNREACHABLE;

/** The skin's face and hat layer, drawn pixel for pixel from Mojang's texture; a plain tile without a skin. */
export function SkinFace({ skin, name, size = 56 }: { skin: string | null; name: string; size?: number }) {
  if (!skin || !SKIN.test(skin))
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#6b4bff]/25 font-display text-[22px] font-semibold text-[#d9ceff]"
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  const px = size / 8;
  const layer = (x: number) => ({
    backgroundImage: `url(${skin})`,
    backgroundSize: `${64 * px}px auto`,
    backgroundPosition: `-${x * px}px -${8 * px}px`,
  });
  return (
    <span aria-hidden style={{ width: size, height: size }} className="relative inline-block shrink-0 overflow-hidden rounded-lg bg-black/30 [image-rendering:pixelated]">
      <span className="absolute inset-0 [image-rendering:pixelated]" style={layer(8)} />
      <span className="absolute inset-0 [image-rendering:pixelated]" style={layer(40)} />
    </span>
  );
}

export function FounderClaim({ api, token, open, endsLabel }: { api: string; token: string | null; open: boolean; endsLabel: string | null }) {
  const [state, setState] = useState<State>({ at: "name" });
  const [name, setName] = useState("");
  const [preview, setPreview] = useState(false);
  const paddle = useRef<PaddleJs | null>(null);
  // The state as Paddle's events and the wait loop see it (they outlive a render): set with the state, at once, so
  // two of Paddle's events in a row (completed, then closed) see the first one's result.
  const current = useRef<State>(state);
  const go = (next: State) => {
    current.current = next;
    setState(next);
  };

  // A tester's link (?preview) shows the form before the claim opens; the service decides who may claim.
  useEffect(() => {
    const t = window.setTimeout(() => setPreview(new URLSearchParams(window.location.search).has("preview")), 0);
    return () => window.clearTimeout(t);
  }, []);

  // After Paddle's "completed": wait for the service to say the set is on the account.
  const txn = state.at === "waiting" ? state.txn : null;
  useEffect(() => {
    if (!txn) return;
    const until = Date.now() + POLL_FOR_MS;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try {
        const { ok, body } = await call(api, `/v1/web/checkout/${txn}`);
        const s = current.current;
        if (ok && body.state === "paid" && s.at === "waiting") return go({ at: "delivered", player: s.player, txn: s.txn });
      } catch {
        // The next try may work.
      }
      const s = current.current;
      if (Date.now() > until) {
        if (s.at === "waiting") go({ at: "slow", player: s.player, txn: s.txn });
        return;
      }
      window.setTimeout(tick, POLL_MS);
    };
    const first = window.setTimeout(tick, POLL_MS);
    return () => {
      stop = true;
      window.clearTimeout(first);
    };
  }, [txn, api]);

  if (!open && !preview)
    return (
      <Panel endsLabel={endsLabel}>
        <p className="font-display text-[22px] leading-tight font-semibold tracking-[-0.01em] text-white">The claim opens soon.</p>
        <p className="mt-2 text-[15px] leading-relaxed text-white/70">
          Come back here when it does: you&apos;ll type your Minecraft name, confirm it&apos;s your account, and claim the set for free.
        </p>
      </Panel>
    );

  const find = async (e: FormEvent) => {
    e.preventDefault();
    const wanted = name.trim();
    if (!NAME.test(wanted)) return go({ at: "error", message: MESSAGES.name });
    go({ at: "finding" });
    try {
      const { ok, body } = await call(api, `/v1/players/${encodeURIComponent(wanted)}`);
      if (!ok || typeof body.uuid !== "string" || typeof body.name !== "string") return go({ at: "error", message: errorText(body) });
      go({
        at: "found",
        player: { uuid: body.uuid, name: body.name, skin: typeof body.skin === "string" ? body.skin : null, founderClaimed: body.founder_claimed === true },
      });
    } catch {
      go({ at: "error", message: UNREACHABLE });
    }
  };

  const claim = async (player: Player) => {
    if (!token) return go({ at: "error", message: "Checkout isn't available right now. Nothing was charged.", player });
    go({ at: "starting", player });
    try {
      const js = paddle.current ?? (await loadPaddle(token, (e) => onPaddle(e.name)));
      paddle.current = js;
      const { ok, body } = await call(api, "/v1/web/checkout", { method: "POST", body: JSON.stringify({ name: player.name, item: "founder_set" }) });
      const id = typeof body.transaction_id === "string" && TXN.test(body.transaction_id) ? body.transaction_id : null;
      if (!ok || !id || body.uuid !== player.uuid) return go({ at: "error", message: errorText(body), player });
      go({ at: "checkout", player, txn: id });
      js.Checkout.open({ transactionId: id, settings: { displayMode: "overlay", theme: "dark", locale: "en", allowLogout: false } });
    } catch {
      go({ at: "error", message: "Paddle's checkout couldn't load. Turn off what blocks cdn.paddle.com, then try again.", player });
    }
  };

  // Paddle.js's events, for whichever checkout is open.
  function onPaddle(event: string | undefined) {
    const s = current.current;
    if (s.at !== "checkout") return;
    if (event === "checkout.completed") go({ at: "waiting", player: s.player, txn: s.txn });
    if (event === "checkout.closed") go({ at: "closed", player: s.player });
    if (event === "checkout.error") go({ at: "error", message: MESSAGES.paddle, player: s.player });
  }

  const reset = () => {
    go({ at: "name" });
  };

  switch (state.at) {
    case "name":
    case "finding":
    case "error":
      if (state.at === "error" && state.player)
        return (
          <Panel endsLabel={endsLabel}>
            <Account player={state.player} />
            <Note tone="warn">{state.message}</Note>
            <Row>
              <button type="button" className={BUTTON} onClick={() => claim(state.player!)}>
                Try again
              </button>
              <button type="button" className={QUIET} onClick={reset}>
                Another account
              </button>
            </Row>
          </Panel>
        );
      return (
        <Panel endsLabel={endsLabel}>
          <form onSubmit={find} noValidate>
            <label htmlFor="mc-name" className="font-display text-[19px] font-semibold text-white">
              Your Minecraft name
            </label>
            <p className="mt-1 text-[15px] text-white/60">The Java Edition name the set goes to. You confirm the account before anything else.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                id="mc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={16}
                placeholder="e.g. Notch"
                aria-invalid={state.at === "error"}
                aria-describedby={state.at === "error" ? "mc-name-error" : undefined}
                className="h-12 w-full rounded-[10px] bg-white/[0.08] px-4 text-[16px] text-white outline-none placeholder:text-white/35 focus:bg-white/[0.11] focus-visible:ring-2 focus-visible:ring-[#a98fff] sm:max-w-xs"
              />
              <button type="submit" className={BUTTON} disabled={state.at === "finding" || !name.trim()}>
                {state.at === "finding" ? "Looking it up…" : "Find my account"}
              </button>
            </div>
            {state.at === "error" && (
              <p id="mc-name-error" role="alert" className="mt-3 text-[15px] text-[#ffb4a8]">
                {state.message}
              </p>
            )}
          </form>
        </Panel>
      );
    case "found":
    case "starting":
      return (
        <Panel endsLabel={endsLabel}>
          <Account player={state.player} />
          {state.player.founderClaimed ? (
            <>
              <Note>{MESSAGES.claimed}</Note>
              <Row>
                <button type="button" className={QUIET} onClick={reset}>
                  Another account
                </button>
              </Row>
            </>
          ) : (
            <>
              <p className="mt-4 text-[15px] leading-relaxed text-white/70">
                Is this your account? The founder set goes to it, for good. Paddle&apos;s checkout asks for an email (for the receipt) and your country; the
                total is 0 CHF.
              </p>
              <Row>
                <button type="button" className={BUTTON} disabled={state.at === "starting"} onClick={() => claim(state.player)}>
                  {state.at === "starting" ? "Opening the checkout…" : `Claim for ${state.player.name}`}
                </button>
                <button type="button" className={QUIET} disabled={state.at === "starting"} onClick={reset}>
                  Not me
                </button>
              </Row>
            </>
          )}
        </Panel>
      );
    case "checkout":
      return (
        <Panel endsLabel={endsLabel}>
          <Account player={state.player} />
          <Note>Paddle&apos;s checkout is open over this page. Follow it to the end; it costs nothing.</Note>
        </Panel>
      );
    case "waiting":
      return (
        <Panel endsLabel={endsLabel}>
          <Account player={state.player} />
          <Note>Done, thank you. Putting the set on {state.player.name}&apos;s account…</Note>
          <Receipt txn={state.txn} />
        </Panel>
      );
    case "delivered":
    case "slow":
      return (
        <Panel endsLabel={endsLabel}>
          <Account player={state.player} />
          <p className="mt-4 font-display text-[22px] leading-tight font-semibold tracking-[-0.01em] text-white">
            {state.at === "delivered" ? "The founder set is yours." : "Claimed. The set is on its way."}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-white/70">
            {state.at === "delivered"
              ? `Your items are now in the launcher's Wardrobe. Sign in there as ${state.player.name} and wear what you like.`
              : `Paddle confirmed the claim; the set reaches ${state.player.name}'s Wardrobe in the launcher within a few minutes.`}
          </p>
          <Receipt txn={state.txn} />
        </Panel>
      );
    case "closed":
      return (
        <Panel endsLabel={endsLabel}>
          <Account player={state.player} />
          <Note>The checkout was closed before the end. Nothing was claimed, and nothing was charged.</Note>
          <Row>
            <button type="button" className={BUTTON} onClick={() => claim(state.player)}>
              Open the checkout again
            </button>
            <button type="button" className={QUIET} onClick={reset}>
              Another account
            </button>
          </Row>
        </Panel>
      );
  }

}

function Panel({ children, endsLabel }: { children: ReactNode; endsLabel: string | null }) {
  return (
    <div role="region" aria-label="Claim the founder set" aria-live="polite" className="rounded-2xl bg-white/[0.06] p-5 backdrop-blur-xl sm:p-6">
      {children}
      {endsLabel && <p className="mt-5 text-[13px] text-white/45">Free (0 CHF) until {endsLabel}. One claim per Minecraft account.</p>}
      {endsLabel && (
        <p className="mt-2 text-[13px] text-white/45">
          In a country Paddle doesn&apos;t serve, such as Russia or Belarus? Claim the set for free in the Horizon launcher&apos;s Wardrobe
          instead.
        </p>
      )}
    </div>
  );
}

function Account({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-4">
      <SkinFace skin={player.skin} name={player.name} />
      <div className="min-w-0">
        <p className="truncate font-display text-[22px] leading-tight font-semibold tracking-[-0.01em] text-white">{player.name}</p>
        <p className="mt-0.5 truncate font-mono text-[12px] text-white/45">{dashed(player.uuid)}</p>
      </div>
    </div>
  );
}

function Note({ children, tone }: { children: ReactNode; tone?: "warn" }) {
  return <p className={`mt-4 text-[15px] leading-relaxed ${tone === "warn" ? "text-[#ffb4a8]" : "text-white/70"}`}>{children}</p>;
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-col gap-2 sm:flex-row">{children}</div>;
}

function Receipt({ txn }: { txn: string }) {
  return (
    <p className="mt-4 text-[14px] leading-relaxed text-white/55">
      Order <span className="font-mono text-white/75">{txn}</span>. Paddle sends the receipt to the email you gave; you can find it again at{" "}
      <a href="https://paddle.net" target="_blank" rel="noreferrer" className={LINK}>
        paddle.net
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      .
    </p>
  );
}

const dashed = (u: string) => (u.length === 32 ? `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20)}` : u);

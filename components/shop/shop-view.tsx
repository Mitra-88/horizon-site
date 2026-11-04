"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ItemArt, ShopItem, ShopSlot } from "@/components/shop-data";
import { animate, bounds, ItemAlone, Player, playerSkin, pngUrl, PX, Stage, useTextures, type PartRefs, type Texture } from "@/components/shop/voxel";

export const SLOT_LABEL: Record<ShopSlot, string> = { head: "Head", torso: "Shirt", back: "Back", shoulder: "Shoulder pet", name_tag: "Name tag" };

const TAG_NAME = "Your name";

// ── when the window closes: a plain date, and the time left in whole days (hours, then minutes, on the last day) ──

const never = () => () => {};
const subscribeHalfMinute = (onChange: () => void) => {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
};

function lastDay(endsAt: number) {
  // The window ends at `endsAt`, excluded: a window that ends at midnight UTC ends on the day before.
  const end = new Date(endsAt * 1000);
  const midnight = end.getUTCHours() === 0 && end.getUTCMinutes() === 0;
  const day = new Date((midnight ? endsAt - 1 : endsAt) * 1000);
  const date = day.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return midnight ? date : `${date}, ${end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

export function ClaimDate({ endsAt }: { endsAt: number }) {
  return <>{lastDay(endsAt)}</>;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function Countdown({ endsAt }: { endsAt: number }) {
  const bucket = useSyncExternalStore(subscribeHalfMinute, () => Math.floor(Date.now() / 30_000), () => null);
  if (bucket === null) return <span className="invisible">0 days left</span>;
  const left = Math.max(0, endsAt - (bucket * 30_000) / 1000);
  if (left <= 0) return <span>The founder set isn&apos;t offered any more.</span>;
  const text =
    left >= 86_400 ? plural(Math.ceil(left / 86_400), "day") : left >= 3600 ? plural(Math.ceil(left / 3600), "hour") : plural(Math.max(1, Math.ceil(left / 60)), "minute");
  return <span className="tabular-nums">{text} left</span>;
}

// ── the name tag, as other Horizon players see it ──

function NameTag({ art, big = false }: { art?: ItemArt; big?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-[0.4em] bg-black/45 px-[0.5em] pt-[0.15em] pb-[0.2em] font-mono leading-none text-white ${big ? "text-[19px]" : "text-[13px]"}`}
      style={{ borderBottom: `${big ? 3 : 2}px solid ${art?.tagLine ?? "#a98fff"}` }}
    >
      {art && (
        // eslint-disable-next-line @next/next/no-img-element -- a data: URL of an 8×8 mark, drawn pixel for pixel
        <img src={pngUrl(art.texture)} alt="" className="size-[1em] [image-rendering:pixelated]" />
      )}
      {TAG_NAME}
    </span>
  );
}

// ── an item alone, for its card ──

const THUMB_TURN: Partial<Record<ShopSlot, number>> = { head: -32, torso: -32, shoulder: -32, back: 148 };
// Items that read better on a faint mannequin of the bones they ride, so their size and fit show.
const ON_MANNEQUIN = new Set<ShopSlot>(["head", "torso"]);

function ItemThumb({ item, art, textures }: { item: ShopItem; art?: ItemArt; textures: Map<string, Texture> | null }) {
  if (item.slot === "name_tag") {
    return (
      <div className="flex h-full items-center justify-center">
        <NameTag art={art} />
      </div>
    );
  }
  const tex = art && textures?.get(pngUrl(art.texture));
  if (!art || !tex) return null;
  const mannequin = ON_MANNEQUIN.has(item.slot);
  const { centre, size } = bounds(art, mannequin);
  const scale = 88 / (size * PX);
  const ry = THUMB_TURN[item.slot] ?? -32;
  return (
    <Stage className="h-full w-full">
      <div className="vx-rig" style={{ transform: `scale(${scale}) rotateX(-20deg) rotateY(${ry}deg) translate3d(${-centre[0] * PX}px, ${-centre[1] * PX}px, ${centre[2] * PX}px)` }}>
        <ItemAlone art={art} tex={tex} tint={mannequin ? "rgb(42 36 72 / 0.6)" : undefined} />
      </div>
    </Stage>
  );
}

// ── the player wearing the set, on a turntable ──

const FACING: Partial<Record<ShopSlot, number>> = { head: -28, torso: -24, shoulder: -62, name_tag: -18, back: 160 };
const DEFAULT_SKY = "radial-gradient(120% 90% at 50% 100%, rgb(107 75 255 / 0.22), transparent 60%), linear-gradient(rgb(255 255 255 / 0.02), rgb(255 255 255 / 0.05))";

function usePrefersStill() {
  return useSyncExternalStore(
    (onChange) => {
      const q = window.matchMedia("(prefers-reduced-motion: reduce)");
      q.addEventListener("change", onChange);
      return () => q.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

function Turntable({ art, textures, skin, angleRef, turning }: { art: ItemArt[]; textures: Map<string, Texture>; skin: Texture; angleRef: { current: number }; turning: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [refs] = useState<PartRefs>(() => new Map());
  const still = usePrefersStill();
  const tagArt = art.find((a) => a.tagLine !== undefined || a.parts.length === 0);
  const worn = art.filter((a) => a.parts.length > 0);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let scale = 1;
    let seen = true;
    let focused = document.hasFocus();
    let drag: { x: number; a: number; id: number } | null = null;
    let last = performance.now();
    let frame = 0;

    const apply = () => {
      const a = angleRef.current;
      if (rig.current) rig.current.style.transform = `translateY(${-4 * PX * scale}px) scale(${scale}) rotateX(-10deg) rotateY(${a}deg)`;
      if (tag.current) tag.current.style.transform = `translate3d(0, ${-12.5 * PX}px, 0) rotateY(${-a}deg) rotateX(10deg)`;
    };
    const resize = () => {
      scale = Math.min(el.clientHeight / (44 * PX), el.clientWidth / (30 * PX));
      apply();
    };
    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const moving = !still && seen && focused && !document.hidden;
      if (moving && turning && !drag) angleRef.current += dt * 18;
      if (moving) animate(worn, refs, now / 1000);
      apply();
      if (moving) frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, a: angleRef.current, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
      el.dataset.drag = "";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      angleRef.current = drag.a + (e.clientX - drag.x) * 0.6;
      apply();
    };
    const onUp = () => {
      drag = null;
      delete el.dataset.drag;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      angleRef.current += e.key === "ArrowLeft" ? -15 : 15;
      apply();
    };
    const onFocus = () => {
      focused = true;
      wake();
    };
    const onBlur = () => {
      focused = false;
    };
    const io = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      if (seen) wake();
    });
    const ro = new ResizeObserver(resize);
    io.observe(el);
    ro.observe(el);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("keydown", onKey);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", wake);
    resize();
    wake();
    const redraw = () => apply();
    window.addEventListener("shop:face", redraw);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("keydown", onKey);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("shop:face", redraw);
      document.removeEventListener("visibilitychange", wake);
    };
    // `worn` is derived from `art`; the loop reads the angle through its ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, still, turning, angleRef, refs]);

  return (
    <div
      ref={stage}
      tabIndex={0}
      role="group"
      aria-roledescription="3D preview"
      aria-label="A player wearing the founder set. Drag, or use the left and right arrow keys, to turn it."
      className="vx-stage vx-turntable relative h-full w-full cursor-grab touch-pan-y overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] data-[drag]:cursor-grabbing"
    >
      <div aria-hidden className="absolute inset-0" style={{ background: DEFAULT_SKY }} />
      <div className="vx-rig" ref={rig}>
        <Player skin={skin} items={worn} textures={textures} refs={refs} />
        {tagArt && (
          <div className="vx-bone" ref={tag}>
            <div className="absolute w-max -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
              <NameTag art={tagArt} big />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── the section: the turntable and the four cards ──

const BTN = "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors";

export function FounderSet({ items, art }: { items: ShopItem[]; art: ItemArt[] }) {
  const sources = useMemo(() => art.map((a) => pngUrl(a.texture)), [art]);
  const textures = useTextures(sources);
  const skinSources = useSyncExternalStore(never, () => "client", () => "server");
  const skinUrl = skinSources === "client" ? playerSkin() : "";
  const skinMap = useTextures(skinUrl ? [skinUrl] : []);
  const skin = skinUrl ? skinMap?.get(skinUrl) : undefined;
  const angle = useRef(-42);
  const [turning, setTurning] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const still = usePrefersStill();
  const artById = new Map(art.map((a) => [a.id, a]));

  const face = (deg: number) => {
    angle.current = deg;
    setTurning(false);
    window.dispatchEvent(new Event("shop:face"));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
      <div>
        <div className="relative aspect-[4/5] max-h-[560px] w-full rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08] sm:aspect-[5/5]">
          {textures && skin ? (
            <Turntable art={art} textures={textures} skin={skin} angleRef={angle} turning={turning && !still} />
          ) : (
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-white/[0.03] motion-reduce:animate-none" />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Turn the preview">
          {!still && (
            <button type="button" onClick={() => setTurning((t) => !t)} aria-pressed={!turning} className={`${BTN} bg-white/10 text-white hover:bg-white/15`}>
              {turning ? "Pause" : "Turn"}
            </button>
          )}
          {(
            [
              ["Front", 0],
              ["Side", -90],
              ["Back", 180],
            ] as const
          ).map(([label, deg]) => (
            <button key={label} type="button" onClick={() => face(deg)} className={`${BTN} text-white/70 hover:bg-white/[0.06] hover:text-white`}>
              {label}
            </button>
          ))}
          <span className="ml-auto hidden text-sm text-white/45 sm:inline">Drag to turn</span>
        </div>
      </div>

      <ul className="grid content-start gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const on = selected === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setSelected(on ? null : item.id);
                  const deg = FACING[item.slot];
                  if (!on && deg !== undefined) face(deg);
                }}
                className={`group flex h-full w-full flex-col rounded-2xl bg-white/[0.06] p-2 text-left backdrop-blur-xl transition-colors hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-[#a98fff] focus-visible:outline-none ${
                  on ? "ring-2 ring-[#a98fff]" : "ring-1 ring-white/[0.06]"
                }`}
              >
                <span className="relative block h-36 overflow-hidden rounded-xl bg-[#0b0718]/70">
                  <ItemThumb item={item} art={artById.get(item.id)} textures={textures} />
                </span>
                <span className="block px-2 pt-3">
                  <span className="block font-display text-[17px] leading-tight font-semibold tracking-[-0.01em] text-white">{item.name}</span>
                  <span className="mt-0.5 block text-sm text-white/55">{SLOT_LABEL[item.slot]} · {item.price}</span>
                </span>
                {item.line && <span className="block px-2 pt-2 pb-2 text-sm leading-relaxed text-white/65">{item.line}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

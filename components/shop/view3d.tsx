"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { ItemArt, ShopSlot, Vec3 } from "@/components/shop-data";
import { emoteStill, emoteWeight } from "@/components/shop/model";
import { fitBox, fitDistance, itemBounds, project, ShopGL, textureSizes, type Scene } from "@/components/shop/renderer";

// The shop's 3D: the big viewer (the shared canvas, live) and the cards' pictures (drawn once each by the same context,
// when a card scrolls into view). Animations run at the game's 20 ticks a second, only while the viewer is on screen,
// the tab is visible, and the visitor hasn't asked for reduced motion.

const noop = () => () => {};

/** The page's GL context (null where WebGL isn't there, or on the server). */
export function useShopGL() {
  return useSyncExternalStore(noop, () => ShopGL.get(), () => null);
}

export function usePrefersStill() {
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

// ── framing ──

export type Focus = "all" | ShopSlot;

type Camera = { yaw: number; pitch: number; target: Vec3; radius: number };

// Slightly from above (a negative pitch looks down), as the cards are.
const WHOLE: Camera = { yaw: -28, pitch: -8, target: [0, 0.32, 0], radius: 1.32 };
const FOCUS: Record<Focus, Camera> = {
  all: WHOLE,
  head: { yaw: -32, pitch: -12, target: [0, -0.4, 0], radius: 0.8 },
  torso: { yaw: -26, pitch: -8, target: [0, 0.25, 0], radius: 1.0 },
  back: { yaw: 155, pitch: -10, target: [0, 0.05, 0], radius: 1.2 },
  shoulder: { yaw: -48, pitch: -10, target: [0, -0.2, 0], radius: 1.0 },
  name_tag: { yaw: -20, pitch: -4, target: [0, -0.2, 0], radius: 1.0 },
  // A companion beside the head (`cameraFor` turns to its side), an aura round the feet and a trail from the side,
  // behind, both from higher.
  companion: { yaw: -30, pitch: -8, target: [0, -0.3, 0.3], radius: 1.35 },
  aura: { yaw: -28, pitch: -22, target: [0, 1.2, 0], radius: 1.1 },
  trail: { yaw: -115, pitch: -12, target: [0, 1.0, 1.1], radius: 1.7 },
  // The whole player from the front, with room for a hop or a spin.
  emote: { yaw: -22, pitch: -6, target: [0, 0.2, 0], radius: 1.65 },
};

/** `focus`'s camera for what is worn: a companion floats on one side or the other, so the view follows it. */
function cameraFor(focus: Focus, worn: ItemArt[]): Camera {
  const base: Camera = { ...FOCUS[focus], target: [...FOCUS[focus].target] };
  const pet = focus === "companion" || focus === "all" ? worn.find((a) => a.companion)?.companion : undefined;
  if (!pet) return base;
  const [x, y, z] = pet.anchor.map((v) => v / 16);
  if (focus === "all") return { ...base, target: [x / 2, base.target[1], 0], radius: base.radius + Math.abs(x) / 2 };
  // Between the head's middle and the companion, seen from its side.
  return { ...base, yaw: x > 0 ? -base.yaw : base.yaw, target: [x / 2, (y - 0.25) / 2, z / 2], radius: 0.75 + Math.hypot(x, y + 0.25, z) / 2 };
}

// The cards' framing, shared with the launcher's Shop (its CPU renderer draws the same): ~30° round from the front and
// ~15° from above (a negative pitch looks down). An aura is seen from higher, a back item from behind so its face
// shows, a trail from its side behind the player.
const THUMB_YAW: Partial<Record<ShopSlot, number>> = { head: -30, torso: -30, back: 150, shoulder: -40, companion: -30, aura: -30, trail: -115, emote: -24 };
const THUMB_PITCH: Partial<Record<ShopSlot, number>> = { aura: -35, trail: -20 };
const THUMB_PITCH_DEFAULT = -15;
/** A whole player (a look, an emote): the same angle, a little less from above. */
const WHOLE_YAW = -30;
const WHOLE_PITCH = -10;

/** A card's yaw: a companion on the wearer's left (+x) is seen from that side, so the head doesn't hide it. */
function thumbYaw(slot: ShopSlot, items: ItemArt[]) {
  const yaw = THUMB_YAW[slot] ?? -30;
  return slot === "companion" && (items[0]?.companion?.anchor[0] ?? 0) > 0 ? -yaw : yaw;
}

// ── the cards' pictures: one queue, one snapshot a frame ──

type Job = { canvas: HTMLCanvasElement; scene: () => Scene | null; done: () => void };
const queue: Job[] = [];
let pumping = 0;

function pump() {
  pumping = 0;
  const gl = ShopGL.get();
  const job = queue.shift();
  if (!gl || !job) return;
  const scene = job.scene();
  if (scene && gl.snapshot(scene, job.canvas)) job.done();
  if (queue.length) pumping = requestAnimationFrame(pump);
}

function enqueue(job: Job) {
  const at = queue.findIndex((j) => j.canvas === job.canvas);
  if (at >= 0) queue.splice(at, 1);
  queue.push(job);
  pumping ||= requestAnimationFrame(pump);
}

/** A card's picture: the player (your skin) wearing `items`, framed on them (or whole, for a set). */
export function Thumb({
  items,
  slot,
  skin,
  slim,
  whole = false,
  emote,
  className = "",
  raise = 0,
  label,
}: {
  items: ItemArt[];
  slot?: ShopSlot;
  skin: string | null;
  slim: boolean;
  whole?: boolean;
  /** An emote, shown still at its fullest move. */
  emote?: ItemArt;
  className?: string;
  /** How far up the subject sits, as a fraction of the picture's height (room for a label under it). */
  raise?: number;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gl = useShopGL();
  const key = `${skin}|${slim}|${whole}|${raise}|${items.map((i) => i.id).join(",")}|${emote?.id ?? ""}`;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !gl || !skin) return;
    let drawn = false;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      enqueue({
        canvas,
        scene: () => {
          const aspect = w / h;
          const full = whole || !!emote?.emote;
          // An emote's props may fly over the head: a taller frame for them.
          const props = !!emote?.parts.length;
          // A trail: the whole player from behind, the stream behind them.
          const trail = !full && slot === "trail";
          const framed = full
            ? { centre: emote ? ([0, props ? 0.15 : 0.35, 0] as Vec3) : ([0, 0.42, 0] as Vec3), radius: emote ? (props ? 1.5 : 1.3) : 1.2, top: -0.5 }
            : trail
              ? { centre: [0, 0.2, 0.6] as Vec3, radius: 1.4, top: -0.5 }
              : itemBounds(items, slim, textureSizes(gl, items));
          // A whole player (a look, an emote) fills most of the card's height, with room on each side for a companion;
          // an emote alone a little closer.
          const distance = full
            ? fitBox(1.1, whole ? (props ? 1.7 : 1.45) : props ? 1.55 : 1.3, aspect)
            : trail
              ? fitBox(1.3, 1.6, aspect)
              : fitDistance(framed.radius * 1.12, aspect);
          return {
            skin,
            slim,
            items,
            ticks: 0,
            yaw: whole ? WHOLE_YAW : thumbYaw(slot ?? "head", items),
            pitch: whole || emote ? WHOLE_PITCH : (THUMB_PITCH[slot ?? "head"] ?? THUMB_PITCH_DEFAULT),
            // Model y is down: looking lower moves the subject up the picture.
            target: [framed.centre[0], framed.centre[1] + raise * 2 * distance * Math.tan(Math.PI / 12), framed.centre[2]] as Vec3,
            distance,
            idle: false,
            ...(emote?.emote ? { emote: { art: emote, t: emoteStill(emote.emote), weight: 1 } } : {}),
          };
        },
        done: () => {
          drawn = true;
          canvas.dataset.drawn = "";
        },
      });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !drawn) draw();
      },
      { rootMargin: "200px" },
    );
    io.observe(canvas);
    // Drawn again at its new size when the card grows or shrinks (a window resized, a phone turned).
    let size = `${canvas.clientWidth}x${canvas.clientHeight}`;
    const ro = new ResizeObserver(() => {
      const now = `${canvas.clientWidth}x${canvas.clientHeight}`;
      if (now === size || !drawn) return;
      size = now;
      draw();
    });
    ro.observe(canvas);
    const undo = gl.onRestore(() => {
      drawn = false;
      draw();
    });
    return () => {
      io.disconnect();
      ro.disconnect();
      undo();
      const at = queue.findIndex((j) => j.canvas === canvas);
      if (at >= 0) queue.splice(at, 1);
    };
    // `key` names everything the picture shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, key]);
  return <canvas ref={ref} role="img" aria-label={label} className={`block h-full w-full opacity-0 transition-opacity duration-300 data-[drawn]:opacity-100 motion-reduce:transition-none ${className}`} />;
}

// ── the big viewer ──

export type ViewerProps = {
  skin: string | null;
  slim: boolean;
  worn: ItemArt[];
  /** The emote playing on a loop (a one-shot again after a short pause), or none. */
  emote?: ItemArt;
  focus: Focus;
  /** Bumped to frame `focus` again (a card tried twice). */
  focusKey: number;
  tag: ReactNode;
  label: string;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ticks a one-shot emote waits before it plays again. */
const EMOTE_PAUSE = 24;

export function Viewer({ skin, slim, worn, emote, focus, focusKey, tag, label }: ViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const gl = useShopGL();
  const still = usePrefersStill();
  // The name tag rides above the highest worn item, as the game lifts it (vanilla's height when nothing is taller).
  const tagY = useMemo(() => (gl ? Math.min(-0.86, itemBounds(worn, slim, textureSizes(gl, worn)).top - 0.16) : -0.86), [gl, worn, slim]);
  const props = useRef({ skin, slim, worn, emote, focus, tagY, since: 0 });
  const goal = useRef<Camera>(cameraFor(focus, worn));
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    // A new emote starts from its beginning.
    const since = emote?.id !== props.current.emote?.id ? (performance.now() / 1000) * 20 : props.current.since;
    props.current = { skin, slim, worn, emote, focus, tagY, since };
    wake.current();
  }, [skin, slim, worn, emote, focus, tagY]);

  useEffect(() => {
    goal.current = cameraFor(focus, worn);
    wake.current();
    // Framed again when a card is tried (the worn items change with it), not when one is taken off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, focusKey]);

  useEffect(() => {
    const el = host.current;
    if (!el || !gl) return;
    const detach = gl.attach(el);
    const cam: Camera = { ...goal.current, target: [...goal.current.target] };
    let frame = 0;
    let seen = true;
    let drag: { x: number; y: number; yaw: number; pitch: number; id: number } | null = null;
    let last = performance.now();

    const draw = (now: number) => {
      const p = props.current;
      if (!p.skin) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(el.clientWidth * dpr));
      const h = Math.max(1, Math.round(el.clientHeight * dpr));
      const ticks = (now / 1000) * 20;
      let played: Scene["emote"];
      const e = p.emote?.emote;
      if (e && p.emote) {
        if (still) played = { art: p.emote, t: emoteStill(e), weight: 1 };
        else {
          const age = ticks - p.since;
          const t = e.looping ? age : age % (e.length + EMOTE_PAUSE);
          played = { art: p.emote, t, weight: emoteWeight(e, t) };
        }
      }
      const scene: Scene = {
        skin: p.skin,
        slim: p.slim,
        items: p.worn,
        ...(played ? { emote: played } : {}),
        ticks: still ? 0 : ticks,
        yaw: cam.yaw,
        pitch: cam.pitch,
        target: cam.target,
        distance: fitDistance(cam.radius, w / h),
        idle: !still,
      };
      gl.render(scene, w, h);
      const t = tagRef.current;
      if (t) {
        const at = project(scene, w, h, [0, p.tagY, 0]);
        t.style.transform = at ? `translate3d(${at[0] / dpr}px, ${at[1] / dpr}px, 0) translate(-50%, -100%)` : "";
        t.style.visibility = at ? "" : "hidden";
      }
    };
    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const g = goal.current;
      const k = still ? 1 : 1 - Math.exp(-dt * 7);
      let moving = false;
      if (!drag) {
        // The short way round to the goal's yaw.
        const dy = ((((g.yaw - cam.yaw) % 360) + 540) % 360) - 180;
        cam.yaw += dy * k;
        cam.pitch = lerp(cam.pitch, g.pitch, k);
        moving ||= Math.abs(dy) > 0.05 || Math.abs(g.pitch - cam.pitch) > 0.05;
      }
      cam.radius = lerp(cam.radius, g.radius, k);
      for (let i = 0; i < 3; i++) cam.target[i] = lerp(cam.target[i], g.target[i], k);
      moving ||= Math.abs(g.radius - cam.radius) > 0.001;
      draw(now);
      if (seen && !document.hidden && (!still || moving || drag)) frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    wake.current = start;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
      el.dataset.drag = "";
      start();
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      cam.yaw = drag.yaw + (e.clientX - drag.x) * 0.5;
      cam.pitch = Math.max(-25, Math.min(40, drag.pitch + (e.clientY - drag.y) * 0.25));
      goal.current = { ...goal.current, yaw: cam.yaw, pitch: cam.pitch };
      start();
    };
    const onUp = () => {
      drag = null;
      delete el.dataset.drag;
    };
    const onKey = (e: KeyboardEvent) => {
      const turn = { ArrowLeft: -20, ArrowRight: 20 }[e.key as "ArrowLeft"];
      if (!turn) return;
      e.preventDefault();
      goal.current = { ...goal.current, yaw: goal.current.yaw + turn };
      start();
    };
    const io = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      if (seen) start();
    });
    const ro = new ResizeObserver(() => start());
    io.observe(el);
    ro.observe(el);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", start);
    const undo = gl.onRestore(start);
    start();
    return () => {
      cancelAnimationFrame(frame);
      wake.current = () => {};
      io.disconnect();
      ro.disconnect();
      undo();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", start);
      detach();
    };
  }, [gl, still]);

  /** Turns the view to `yaw` (the Front / Side / Back buttons). */
  const face = (yaw: number) => {
    goal.current = { ...goal.current, yaw };
    wake.current();
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={host}
        tabIndex={0}
        role="img"
        aria-roledescription="3D preview"
        aria-label={`${label} Drag, or use the left and right arrow keys, to turn it.`}
        className="relative min-h-0 flex-1 cursor-grab touch-pan-y overflow-hidden outline-none select-none focus-visible:ring-2 focus-visible:ring-[#a98fff] data-[drag]:cursor-grabbing"
      >
        {!gl && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[15px] text-white/55">
            This browser can&apos;t draw the 3D preview. Every item and price is still listed below.
          </p>
        )}
        <div ref={tagRef} aria-hidden className="pointer-events-none absolute top-0 left-0 will-change-transform">
          {tag}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-3" role="group" aria-label="Turn the preview">
        {(
          [
            ["Front", -20],
            ["Side", -90],
            ["Back", 160],
          ] as const
        ).map(([text, yaw]) => (
          <button key={text} type="button" onClick={() => face(yaw)} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white">
            {text}
          </button>
        ))}
        <span className="ml-auto text-sm text-white/45">Drag to turn</span>
      </div>
    </div>
  );
}

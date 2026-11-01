"use client";

import { useEffect, useRef } from "react";

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30,
  54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

const RAMP = ["#100a1f", "#170e2c", "#21113c", "#2e144c", "#3d175a", "#511a66", "#6a1e6f", "#872672", "#a53470", "#c4486b", "#de6466", "#f08a64", "#f8b36f", "#fcd795"];

function abgr(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
}

const COLORS = RAMP.map(abgr);
const TOP = COLORS.length - 1;

type Field = { w: number; h: number; px: number; heat: Float32Array; image: ImageData; buf: Uint32Array };

function createField(ctx: CanvasRenderingContext2D, width: number, height: number): Field {
  const px = Math.min(6, Math.max(3, Math.round(window.innerWidth / 340)));
  const w = Math.ceil(width / px);
  const h = Math.ceil(height / px);
  const image = ctx.createImageData(w, h);
  return { w, h, px, heat: new Float32Array(w * h), image, buf: new Uint32Array(image.data.buffer) };
}

function step(f: Field, strength: number, t: number) {
  const { w, h, heat } = f;
  const reach = Math.max(8, h * (0.25 + 0.45 * strength));
  const cooling = 2.2 / reach;
  const base = (h - 1) * w;
  for (let x = 0; x < w; x++) {
    const sway = 0.55 + 0.45 * Math.sin(x * 0.11 + t * 0.9) * Math.sin(x * 0.037 - t * 0.4);
    heat[base + x] = Math.min(1, (0.55 + 0.45 * strength) * (0.7 + 0.3 * Math.random()) * (0.7 + 0.3 * sway));
  }
  for (let y = 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const from = y * w + x;
      const r = Math.random();
      const dx = Math.floor(r * 3) - 1;
      const to = (y - 1) * w + Math.min(w - 1, Math.max(0, x + dx));
      heat[to] = Math.max(0, heat[from] - r * cooling);
    }
  }
}

function paint(f: Field) {
  const { w, h, heat, buf } = f;
  for (let y = 0; y < h; y++) {
    const fade = Math.min(1, (y / h) * 1.6) * Math.min(1, (h - 1 - y) / (h * 0.15));
    const row = (y & 7) * 8;
    for (let x = 0; x < w; x++) {
      const level = heat[y * w + x] * fade * TOP;
      const low = Math.floor(level);
      const pick = level - low > BAYER[row + (x & 7)] ? low + 1 : low;
      buf[y * w + x] = COLORS[pick > TOP ? TOP : pick];
    }
  }
}

export function PixelFire({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let field: Field | null = null;
    let strength = 0.6;
    let raf = 0;
    let last = 0;
    let visible = false;
    let t = 0;

    const draw = () => {
      if (!field) return;
      paint(field);
      ctx.putImageData(field.image, 0, 0);
      canvas.dataset.ready = "";
    };

    const warm = () => {
      if (!field) return;
      for (let i = 0; i < field.h * 1.5; i++) step(field, strength, (t += 0.05));
      draw();
    };

    const resize = () => {
      const { clientWidth, clientHeight } = parent;
      if (!clientWidth || !clientHeight) return;
      field = createField(ctx, clientWidth, clientHeight);
      canvas.width = field.w;
      canvas.height = field.h;
      canvas.style.width = `${field.w * field.px}px`;
      canvas.style.height = `${field.h * field.px}px`;
      warm();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 50) return;
      last = now;
      if (!field) return;
      step(field, strength, (t += 0.05));
      draw();
    };

    const start = () => {
      if (!raf && !still && visible) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const live = () =>
      fetch("/api/players?view=live", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<{ playing?: number }>) : null))
        .then((d) => {
          if (d && typeof d.playing === "number") strength = Math.min(1, Math.log10(1 + d.playing) / Math.log10(2001));
          if (still) warm();
        })
        .catch(() => {});
    live();
    const timer = window.setInterval(live, 60_000);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    visibilityObserver.observe(parent);

    return () => {
      stop();
      window.clearInterval(timer);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`opacity-0 transition-opacity duration-700 [image-rendering:pixelated] data-ready:opacity-75 ${className}`} />;
}

"use client";

import { useEffect, useRef } from "react";

const EDGES = [0, 1, 2, 3, 4.17, 5, 6, 7, 8.33, 10, 12, 14, 16.67, 20, 25, 33.33, 40, 50, 66.67, 100, 150, 250, 500, 1000, 1500];
const FASTEST = 1;
const SLOWEST = 100;
const SIXTY = 16.67;
const THIRTY = 33.33;

const BACKGROUND = "#100a1f";
const STEPS = 6;
const CREST = 0.62;
const BODY = 0.28;
const BODY_FALLOFF = 96;
const OLDEST = 0.5;
const COLUMNS_PER_SECOND = 15;

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30,
  54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

function ramp(to: string) {
  const a = rgb(BACKGROUND);
  const b = rgb(to);
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const [r, g, bl] = a.map((v, c) => Math.round(v + ((b[c] - v) * i) / STEPS));
    return (0xff000000 | (bl << 16) | (g << 8) | r) >>> 0;
  });
}

const HORIZON = ramp("#a98fff");
const JAVA = ramp("#8b8499");
const SLOW = ramp("#f2c46b");
const STUTTER = ramp("#f07a6a");

const ease = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampler(histogram: number[], seed: number) {
  const rand = mulberry(seed);
  const total = histogram.reduce((a, b) => a + b, 0) || 1;
  const cdf: number[] = [];
  let acc = 0;
  for (const count of histogram) cdf.push((acc += count) / total);
  return () => {
    const r = rand();
    let i = cdf.findIndex((p) => p >= r);
    if (i < 0) i = histogram.length - 1;
    return Math.max(0.3, EDGES[i] + rand() * (EDGES[i + 1] - EDGES[i]));
  };
}

type Field = {
  w: number;
  h: number;
  px: number;
  height: number;
  image: ImageData;
  buf: Uint32Array;
  horizon: Float32Array;
  java: Float32Array;
  head: number;
  span: number;
  sixty: number;
  thirty: number;
  nextHorizon: () => number;
  nextJava: () => number;
};

function createField(ctx: CanvasRenderingContext2D, width: number, height: number, horizon: number[], java: number[]): Field {
  const px = Math.min(6, Math.max(3, Math.round(window.innerWidth / 340)));
  const w = Math.ceil(width / px);
  const h = Math.ceil(height / px);
  const image = ctx.createImageData(w, h);
  const span = Math.min(height * 0.5, 340) / px;
  const field: Field = {
    w,
    h,
    px,
    height,
    image,
    buf: new Uint32Array(image.data.buffer),
    horizon: new Float32Array(w),
    java: new Float32Array(w),
    head: 0,
    span,
    sixty: 0,
    thirty: 0,
    nextHorizon: sampler(horizon, 1201),
    nextJava: sampler(java, 2603),
  };
  field.sixty = Math.round(barHeight(field, SIXTY));
  field.thirty = Math.round(barHeight(field, THIRTY));
  for (let x = 0; x < w; x++) advance(field);
  return field;
}

function barHeight(f: Field, ms: number) {
  const t = (Math.log(ms) - Math.log(FASTEST)) / (Math.log(SLOWEST) - Math.log(FASTEST));
  return Math.max(1, Math.min(1, t) * f.span);
}

function advance(f: Field) {
  const slot = f.head % f.w;
  f.horizon[slot] = barHeight(f, f.nextHorizon());
  f.java[slot] = barHeight(f, f.nextJava());
  f.head++;
}

function paint(f: Field) {
  const { w, h, px, height, buf, horizon, java, head, sixty, thirty } = f;
  const fadeTop = Math.min(140, height * 0.2);
  const fadeBottom = Math.min(72, height * 0.12);

  for (let y = 0; y < h; y++) {
    const cy = (y + 0.5) * px;
    const fade = ease(cy / fadeTop) * ease((height - cy) / fadeBottom);
    const up = h - 1 - y;
    const band = up >= thirty ? STUTTER : up >= sixty ? SLOW : null;
    const row = (y & 7) * 8;
    for (let x = 0; x < w; x++) {
      const age = OLDEST + (1 - OLDEST) * ease(x / (w * 0.8));
      const slot = (head + x) % w;
      const ht = horizon[slot];
      const jt = java[slot];
      let colors: number[];
      let light: number;
      let anchor = head + x;
      if (up < ht) {
        const depth = ht - 1 - up;
        colors = band ?? HORIZON;
        light = depth < 1 ? CREST : BODY * Math.exp((-depth * px) / BODY_FALLOFF);
      } else if (up < jt) {
        const depth = jt - 1 - up;
        colors = band ?? JAVA;
        light = depth < 1 ? CREST : BODY * Math.exp((-depth * px) / BODY_FALLOFF);
      } else if (up === sixty && x % 3 === 0) {
        colors = SLOW;
        light = 0.26;
        anchor = x;
      } else {
        buf[y * w + x] = HORIZON[0];
        continue;
      }
      const level = light * fade * age * STEPS;
      const base = Math.floor(level);
      const step = level - base > BAYER[row + (anchor & 7)] ? base + 1 : base;
      buf[y * w + x] = colors[step > STEPS ? STEPS : step];
    }
  }
}

export function FrameTrace({ horizon, java, className = "" }: { horizon: number[]; java: number[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let field: Field | null = null;
    let owed = 0;
    let last = 0;
    let raf = 0;
    let visible = false;

    const draw = () => {
      if (!field) return;
      paint(field);
      ctx.putImageData(field.image, 0, 0);
      canvas.dataset.ready = "";
    };

    const resize = () => {
      const { clientWidth, clientHeight } = parent;
      if (!clientWidth || !clientHeight) return;
      field = createField(ctx, clientWidth, clientHeight, horizon, java);
      canvas.width = field.w;
      canvas.height = field.h;
      canvas.style.width = `${field.w * field.px}px`;
      canvas.style.height = `${field.h * field.px}px`;
      draw();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      owed += last ? (Math.min(now - last, 100) / 1000) * COLUMNS_PER_SECOND : 0;
      last = now;
      if (!field || owed < 1) return;
      while (owed >= 1) {
        advance(field);
        owed--;
      }
      draw();
    };

    const start = () => {
      if (!raf && !still && visible) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };

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
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [horizon, java]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`opacity-0 transition-opacity duration-700 [image-rendering:pixelated] data-ready:opacity-55 ${className}`}
    />
  );
}

import Image from "next/image";
import type { Rating } from "@/components/mods-logic";

const INKS = ["#a98fff", "#8be0b4", "#f2c46b", "#f07a6a"];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pixels(id: string) {
  let seed = hash(id);
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const cells: { x: number; y: number; half: boolean }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const r = next();
      if (r > 0.62) continue;
      const half = r > 0.42;
      cells.push({ x, y, half });
      if (x < 2) cells.push({ x: 4 - x, y, half });
    }
  }
  return cells;
}

export function ModIcon({ id, icon, size = 48, className = "" }: { id: string; icon?: string; size?: number; className?: string }) {
  if (icon) {
    return (
      <Image
        src={icon}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={`shrink-0 rounded-xl bg-[#221a3a] object-cover [image-rendering:pixelated] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const ink = INKS[hash(id) % INKS.length];
  return (
    <svg viewBox="-2 -2 14 14" width={size} height={size} aria-hidden shapeRendering="crispEdges" className={`shrink-0 rounded-xl bg-[#221a3a] ${className}`}>
      {pixels(id).map(({ x, y, half }) =>
        half ? (
          <g key={`${x}-${y}`} fill={ink}>
            <rect x={x * 2} y={y * 2} width={1} height={1} />
            <rect x={x * 2 + 1} y={y * 2 + 1} width={1} height={1} />
          </g>
        ) : (
          <rect key={`${x}-${y}`} x={x * 2} y={y * 2} width={2} height={2} fill={ink} />
        ),
      )}
    </svg>
  );
}

export function Stars({ rating, className = "" }: { rating: Rating; className?: string }) {
  const on = Math.min(5, Math.max(0, Math.round(rating.average)));
  const mean = rating.average.toFixed(1);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={`${mean} out of 5 from ${rating.count} rating${rating.count === 1 ? "" : "s"}`}>
      <span aria-hidden className="tracking-[0.05em]">
        <span className="text-[#f2c46b]">{"★".repeat(on)}</span>
        <span className="text-white/20">{"★".repeat(5 - on)}</span>
      </span>
      <span className="sr-only">Rated {mean} out of 5</span>
      <span className="tabular-nums">
        {mean} ({rating.count})
      </span>
    </span>
  );
}

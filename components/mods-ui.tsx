import Image from "next/image";
import { GitHubIcon } from "@/components/icons";
import { format } from "@/components/i18n-text";
import { count, type Rating } from "@/components/mods-logic";

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

/** The words of Stars and GitHubStars; pages that aren't translated use English. */
export type StarsText = { title: string; titleOne: string; rated: string; github: string; githubOne: string };
const STARS_EN: StarsText = {
  title: "{mean} out of 5 from {n} ratings",
  titleOne: "{mean} out of 5 from {n} rating",
  rated: "Rated {mean} out of 5",
  github: "{n} stars on GitHub",
  githubOne: "{n} star on GitHub",
};

export function Stars({ rating, className = "", t = STARS_EN, comma = false }: { rating: Rating; className?: string; t?: StarsText; comma?: boolean }) {
  const on = Math.min(5, Math.max(0, Math.round(rating.average)));
  const mean = comma ? rating.average.toFixed(1).replace(".", ",") : rating.average.toFixed(1);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={format(rating.count === 1 ? t.titleOne : t.title, { mean, n: rating.count })}>
      <span aria-hidden className="tracking-[0.05em]">
        <span className="text-[#f2c46b]">{"★".repeat(on)}</span>
        <span className="text-white/20">{"★".repeat(5 - on)}</span>
      </span>
      <span className="sr-only">{format(t.rated, { mean })}</span>
      <span className="tabular-nums">
        {mean} ({rating.count})
      </span>
    </span>
  );
}

/** A project's GitHub stars: GitHub's mark, a star and how many, as its repository shows them. */
export function GitHubStars({
  stars,
  className = "",
  t = STARS_EN,
  numberLocale = "en-US",
}: {
  stars: number;
  className?: string;
  t?: StarsText;
  numberLocale?: string;
}) {
  const label = format(stars === 1 ? t.githubOne : t.github, { n: stars.toLocaleString(numberLocale) });
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={label}>
      <GitHubIcon className="size-3.5 opacity-80" />
      <span aria-hidden className="text-[#f2c46b]">
        ★
      </span>
      <span aria-hidden className="tabular-nums">
        {count(stars, numberLocale !== "en-US")}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

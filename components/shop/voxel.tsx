"use client";

import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { ArtAnimation, ArtCube, ArtPart, ItemArt, Vec3 } from "@/components/shop-data";

// A small CSS-3D renderer for Horizon's cosmetics item format (docs/cosmetics.md in the game's repository): the same
// parts, pivots, rotations, box UV, inflate and animations the game draws, on a made-up Horizon player (not Mojang's
// skin). Model space is the game's: pixels, y down, the player facing -z. CSS space has y down and +z toward the
// viewer, so z is negated, and so are the rotations about x and y.

export const PX = 8; // CSS pixels per model pixel, before the stage's own scale

// ── textures: the PNG as it is, and flipped copies for the faces whose UV runs the other way ──

export type Texture = { w: number; h: number; plain: string; flipV: string; flipH: string; flipHV: string };

const textures = new Map<string, Promise<Texture>>();

function flipped(img: CanvasImageSource, w: number, h: number, fx: boolean, fy: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (!g) return "";
  g.translate(fx ? w : 0, fy ? h : 0);
  g.scale(fx ? -1 : 1, fy ? -1 : 1);
  g.drawImage(img, 0, 0);
  return canvas.toDataURL();
}

export function loadTexture(src: string): Promise<Texture> {
  let t = textures.get(src);
  if (!t) {
    t = new Promise<Texture>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        resolve({ w, h, plain: src, flipV: flipped(img, w, h, false, true), flipH: flipped(img, w, h, true, false), flipHV: flipped(img, w, h, true, true) });
      };
      img.onerror = () => reject(new Error("The texture didn't load"));
      img.src = src;
    });
    textures.set(src, t);
  }
  return t;
}

export function useTextures(sources: string[]) {
  const [loaded, setLoaded] = useState<Map<string, Texture> | null>(null);
  const key = sources.join("\n");
  useEffect(() => {
    let live = true;
    Promise.allSettled(key.split("\n").map(async (s) => [s, await loadTexture(s)] as const)).then((all) => {
      if (!live) return;
      const map = new Map<string, Texture>();
      for (const r of all) if (r.status === "fulfilled") map.set(r.value[0], r.value[1]);
      setLoaded(map);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return loaded;
}

export const pngUrl = (base64: string) => `data:image/png;base64,${base64}`;

// ── the made-up player: a 64×64 skin painted from rows, laid out with Minecraft's box UV ──

const SKIN: Record<string, string> = { H: "#3a2a4f", S: "#e0a98a", W: "#ffffff", E: "#4b3bb8", N: "#c98f72", M: "#9a5a4a", T: "#5b3fd6", t: "#4a32b8", L: "#a08cff", P: "#23305a", p: "#1c2648", B: "#1a1a22" };

type Face = string | string[]; // one palette letter, or rows of them
type BoxPaint = { top: Face; bottom: Face; right: Face; front: Face; left: Face; back: Face };

const rows = (w: number, spec: string) => [...spec].map((c) => c.repeat(w));
const mirrorRows = (r: string[]) => r.map((row) => [...row].reverse().join(""));

const HEAD_SIDE = ["HHHHHHHH", "HHHHHHHH", "HHHHHHSS", "HHHHSSSS", "HHHSSSSS", "HHSSSSSS", "HSSSSSSS", "SSSSSSSS"];
const PLAYER_PAINT: { uv: [number, number]; size: Vec3; paint: BoxPaint }[] = [
  {
    uv: [0, 0],
    size: [8, 8, 8],
    paint: {
      top: "H",
      bottom: "S",
      right: HEAD_SIDE,
      front: ["HHHHHHHH", "HHHHHHHH", "HSSSSSSH", "SSSSSSSS", "SWESSEWS", "SSSNNSSS", "SSMMMMSS", "SSSSSSSS"],
      left: mirrorRows(HEAD_SIDE),
      back: "H",
    },
  },
  {
    uv: [16, 16],
    size: [8, 12, 4],
    paint: {
      top: "T",
      bottom: "P",
      right: rows(4, "TTTTTTTTTtPP"),
      front: ["TTTSSTTT", "TTTTTTTT", "TTLTTTTT", "TTLTTTTT", ...rows(8, "TTTTTtPP")],
      left: rows(4, "TTTTTTTTTtPP"),
      back: rows(8, "TTTTTTTTTtPP"),
    },
  },
  ...([[40, 16], [32, 48]] as [number, number][]).map((uv) => ({
    uv,
    size: [4, 12, 4] as Vec3,
    paint: { top: "T", bottom: "S", right: rows(4, "TTTtSSSSSSSS"), front: rows(4, "TTTtSSSSSSSS"), left: rows(4, "TTTtSSSSSSSS"), back: rows(4, "TTTtSSSSSSSS") },
  })),
  ...([[0, 16], [16, 48]] as [number, number][]).map((uv) => ({
    uv,
    size: [4, 12, 4] as Vec3,
    paint: { top: "P", bottom: "B", right: rows(4, "PPPPPPPPPPBB"), front: [...rows(4, "PPPPPPP"), "pPPp", ...rows(4, "PPBB")], left: rows(4, "PPPPPPPPPPBB"), back: rows(4, "PPPPPPPPPPBB") },
  })),
];

let skinUrl: string | null = null;
export function playerSkin() {
  if (skinUrl) return skinUrl;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  if (!g) return "";
  const fill = (x: number, y: number, w: number, h: number, face: Face) => {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const c = typeof face === "string" ? face : face[Math.min(j, face.length - 1)]?.[Math.min(i, face[0].length - 1)];
        if (c && SKIN[c]) {
          g.fillStyle = SKIN[c];
          g.fillRect(x + i, y + j, 1, 1);
        }
      }
  };
  for (const { uv: [u, v], size: [w, h, d], paint } of PLAYER_PAINT) {
    fill(u + d, v, w, d, paint.top);
    fill(u + d + w, v, w, d, paint.bottom);
    fill(u, v + d, d, h, paint.right);
    fill(u + d, v + d, w, h, paint.front);
    fill(u + d + w, v + d, d, h, paint.left);
    fill(u + 2 * d + w, v + d, w, h, paint.back);
  }
  skinUrl = canvas.toDataURL();
  return skinUrl;
}

// The player model's parts at rest (vanilla's wide arms), with their pivots.
export const PLAYER_BONES: { bone: string; pivot: Vec3; cube: ArtCube }[] = [
  { bone: "head", pivot: [0, 0, 0], cube: { origin: [-4, -8, -4], size: [8, 8, 8], uv: [0, 0], inflate: 0, mirror: false } },
  { bone: "body", pivot: [0, 0, 0], cube: { origin: [-4, 0, -2], size: [8, 12, 4], uv: [16, 16], inflate: 0, mirror: false } },
  { bone: "right_arm", pivot: [-5, 2, 0], cube: { origin: [-3, -2, -2], size: [4, 12, 4], uv: [40, 16], inflate: 0, mirror: false } },
  { bone: "left_arm", pivot: [5, 2, 0], cube: { origin: [-1, -2, -2], size: [4, 12, 4], uv: [32, 48], inflate: 0, mirror: false } },
  { bone: "right_leg", pivot: [-1.9, 12, 0], cube: { origin: [-2, 0, -2], size: [4, 12, 4], uv: [0, 16], inflate: 0, mirror: false } },
  { bone: "left_leg", pivot: [1.9, 12, 0], cube: { origin: [-2, 0, -2], size: [4, 12, 4], uv: [16, 48], inflate: 0, mirror: false } },
];

const BONE_PIVOT = new Map(PLAYER_BONES.map((b) => [b.bone, b.pivot]));
export const bonePivot = (bone: string): Vec3 => BONE_PIVOT.get(bone) ?? [0, 0, 0];

/** The bone a top-level part rides: its own, or the item's. */
export const partBone = (art: ItemArt, part: ArtPart) => part.bone ?? art.bone;

/** The bones an item's model rides, the item's own first. */
export function itemBones(art: ItemArt) {
  return [...new Set(art.parts.map((p) => partBone(art, p)))].sort((a, b) => Number(b === art.bone) - Number(a === art.bone));
}

// ── geometry ──

const SHADE = { front: 1, back: 0.72, right: 0.84, left: 0.84, top: 1.12, bottom: 0.6 };

export function pose(p: Vec3, r: Vec3) {
  return `translate3d(${p[0] * PX}px, ${p[1] * PX}px, ${-p[2] * PX}px) rotateZ(${r[2]}deg) rotateY(${-r[1]}deg) rotateX(${-r[0]}deg)`;
}

function Cube({ cube, tex, tint }: { cube: ArtCube; tex?: Texture; tint?: string }) {
  const [w, h, d] = cube.size;
  const [u, v] = cube.uv;
  const g = cube.inflate;
  const W = (w + 2 * g) * PX;
  const H = (h + 2 * g) * PX;
  const D = (d + 2 * g) * PX;
  const centre: Vec3 = [cube.origin[0] + w / 2, cube.origin[1] + h / 2, cube.origin[2] + d / 2];
  // CSS face → (plane size, UV rect in the texture, transform). "right" is the viewer's right from the front: model +x.
  const east: [number, number] = [u + d + w, v + d];
  const west: [number, number] = [u, v + d];
  const faces: { name: keyof typeof SHADE; size: [number, number]; uv: [number, number]; uvSize: [number, number]; tf: string; flipV?: boolean }[] = [
    { name: "front", size: [W, H], uv: [u + d, v + d], uvSize: [w, h], tf: `translateZ(${D / 2}px)` },
    { name: "back", size: [W, H], uv: [u + 2 * d + w, v + d], uvSize: [w, h], tf: `rotateY(180deg) translateZ(${D / 2}px)` },
    { name: "right", size: [D, H], uv: cube.mirror ? west : east, uvSize: [d, h], tf: `rotateY(90deg) translateZ(${W / 2}px)` },
    { name: "left", size: [D, H], uv: cube.mirror ? east : west, uvSize: [d, h], tf: `rotateY(-90deg) translateZ(${W / 2}px)` },
    { name: "top", size: [W, D], uv: [u + d, v], uvSize: [w, d], tf: `rotateX(90deg) translateZ(${H / 2}px)` },
    { name: "bottom", size: [W, D], uv: [u + d + w, v], uvSize: [w, d], tf: `rotateX(-90deg) translateZ(${H / 2}px)`, flipV: true },
  ];
  return (
    <div className="vx-box" style={{ transform: `translate3d(${centre[0] * PX}px, ${centre[1] * PX}px, ${-centre[2] * PX}px)` }}>
      {faces.map((f) => {
        if (f.size[0] <= 0 || f.size[1] <= 0) return null;
        const style: CSSProperties = {
          width: f.size[0] + 0.6,
          height: f.size[1] + 0.6,
          marginLeft: -f.size[0] / 2 - 0.3,
          marginTop: -f.size[1] / 2 - 0.3,
          transform: f.tf,
          filter: `brightness(${SHADE[f.name]})`,
        };
        if (tex) {
          const sx = f.uvSize[0] > 0 ? f.size[0] / (f.uvSize[0] * PX) : 1;
          const sy = f.uvSize[1] > 0 ? f.size[1] / (f.uvSize[1] * PX) : 1;
          // A mirrored cube reads its faces' UV right to left: the same as the texture flipped in x.
          const fx = cube.mirror;
          const uu = fx ? tex.w - f.uv[0] - f.uvSize[0] : f.uv[0];
          const vv = f.flipV ? tex.h - f.uv[1] - f.uvSize[1] : f.uv[1];
          const url = fx ? (f.flipV ? tex.flipHV : tex.flipH) : f.flipV ? tex.flipV : tex.plain;
          style.backgroundImage = `url(${url})`;
          style.backgroundSize = `${tex.w * PX * sx}px ${tex.h * PX * sy}px`;
          style.backgroundPosition = `${-uu * PX * sx}px ${-vv * PX * sy}px`;
        } else if (tint) {
          style.backgroundColor = tint;
        }
        return <div key={f.name} className="vx-face" style={style} />;
      })}
    </div>
  );
}

export type PartRefs = Map<string, HTMLDivElement>;

function Part({ part, tex, refs }: { part: ArtPart; tex: Texture; refs?: PartRefs }) {
  return (
    <div
      className="vx-bone"
      style={{ transform: pose(part.pivot, part.rotation) }}
      ref={(el) => {
        if (!refs || !part.name) return;
        if (el) refs.set(part.name, el);
        else refs.delete(part.name);
      }}
    >
      {part.cubes.map((c, i) => (
        <Cube key={i} cube={c} tex={tex} />
      ))}
      {part.children.map((c, i) => (
        <Part key={c.name || i} part={c} tex={tex} refs={refs} />
      ))}
    </div>
  );
}

/** The parts of an item that ride `bone`, under the item's attachment (offset, rotation, then scale), in that bone's space. */
export function ItemModel({ art, bone, tex, refs }: { art: ItemArt; bone: string; tex: Texture; refs?: PartRefs }) {
  const a = art.attach;
  return (
    <div className="vx-bone" style={{ transform: `${pose(a.offset, a.rotation)} scale3d(${a.scale}, ${a.scale}, ${a.scale})` }}>
      {art.parts
        .filter((p) => partBone(art, p) === bone)
        .map((p, i) => (
          <Part key={p.name || i} part={p} tex={tex} refs={refs} />
        ))}
    </div>
  );
}

/** An item alone, each of its parts on its bone's pivot, over a faint mannequin of those bones if `tint` is given. */
export function ItemAlone({ art, tex, tint }: { art: ItemArt; tex: Texture; tint?: string }) {
  return (
    <>
      {itemBones(art).map((bone) => {
        const body = PLAYER_BONES.find((b) => b.bone === bone);
        return (
          <div key={bone} className="vx-bone" style={{ transform: pose(bonePivot(bone), [0, 0, 0]) }}>
            {tint && body && <Cube cube={body.cube} tint={tint} />}
            <ItemModel art={art} bone={bone} tex={tex} />
          </div>
        );
      })}
    </>
  );
}

/** The player, wearing `items` on their bones. */
export function Player({ skin, items, textures, refs }: { skin: Texture; items: ItemArt[]; textures: Map<string, Texture>; refs?: PartRefs }) {
  return (
    <>
      {PLAYER_BONES.map((b) => (
        <div key={b.bone} className="vx-bone" style={{ transform: pose(b.pivot, [0, 0, 0]) }}>
          <Cube cube={b.cube} tex={skin} />
          {items
            .filter((i) => i.parts.some((p) => partBone(i, p) === b.bone))
            .map((i) => {
              const tex = textures.get(pngUrl(i.texture));
              return tex ? <ItemModel key={i.id} art={i} bone={b.bone} tex={tex} refs={refs} /> : null;
            })}
        </div>
      ))}
    </>
  );
}

// ── animations: the game's, a sine of `period` ticks (20 a second) started `phase` periods in ──

function restOf(parts: ArtPart[], name: string): ArtPart | null {
  for (const p of parts) {
    if (p.name === name) return p;
    const c = restOf(p.children, name);
    if (c) return c;
  }
  return null;
}

export function animate(items: ItemArt[], refs: PartRefs, seconds: number) {
  const ticks = seconds * 20;
  for (const item of items) {
    const byPart = new Map<string, ArtAnimation[]>();
    for (const a of item.animations) byPart.set(a.part, [...(byPart.get(a.part) ?? []), a]);
    for (const [name, anims] of byPart) {
      const el = refs.get(name);
      const rest = restOf(item.parts, name);
      if (!el || !rest) continue;
      const p: Vec3 = [...rest.pivot];
      const r: Vec3 = [...rest.rotation];
      for (const a of anims) {
        const turns = ticks / a.period + a.phase;
        if (a.motion === "swing") r[a.axis] += a.amplitude * Math.sin(turns * Math.PI * 2);
        else if (a.motion === "bob") p[a.axis] += a.amplitude * Math.sin(turns * Math.PI * 2);
        else r[a.axis] += (((turns % 1) + 1) % 1) * 360;
      }
      el.style.transform = pose(p, r);
    }
  }
}

// ── bounds, to frame an item alone (in the player's space, as ItemAlone draws it; rotations left out) ──

export function bounds(art: ItemArt, mannequin = false) {
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  const s = art.attach.scale;
  const add = (from: Vec3, to: Vec3) => {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], from[k]);
      hi[k] = Math.max(hi[k], to[k]);
    }
  };
  const walk = (part: ArtPart, root: Vec3, at: Vec3) => {
    const o: Vec3 = [at[0] + part.pivot[0], at[1] + part.pivot[1], at[2] + part.pivot[2]];
    for (const c of part.cubes)
      add(
        [0, 1, 2].map((k) => root[k] + s * (o[k] + c.origin[k] - c.inflate)) as Vec3,
        [0, 1, 2].map((k) => root[k] + s * (o[k] + c.origin[k] + c.size[k] + c.inflate)) as Vec3,
      );
    part.children.forEach((c) => walk(c, root, o));
  };
  for (const p of art.parts) {
    const pivot = bonePivot(partBone(art, p));
    walk(p, [0, 1, 2].map((k) => pivot[k] + art.attach.offset[k]) as Vec3, [0, 0, 0]);
  }
  if (mannequin)
    for (const bone of itemBones(art)) {
      const body = PLAYER_BONES.find((b) => b.bone === bone);
      if (!body) continue;
      const pivot = bonePivot(bone);
      add(
        [0, 1, 2].map((k) => pivot[k] + body.cube.origin[k]) as Vec3,
        [0, 1, 2].map((k) => pivot[k] + body.cube.origin[k] + body.cube.size[k]) as Vec3,
      );
    }
  if (!Number.isFinite(lo[0])) return { centre: [0, 0, 0] as Vec3, size: 8 };
  return { centre: lo.map((l, k) => (l + hi[k]) / 2) as Vec3, size: Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) };
}

// ── a stage: perspective, sized to its box ──

export function Stage({ children, stageRef, className = "", label }: { children: ReactNode; stageRef?: RefObject<HTMLDivElement | null>; className?: string; label?: string }) {
  return (
    <div ref={stageRef} className={`vx-stage ${className}`} aria-label={label}>
      {children}
    </div>
  );
}

export { Cube };

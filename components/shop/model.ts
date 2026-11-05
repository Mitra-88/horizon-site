import type { ArtAnimation, ArtCube, ArtPart, ArtTrail, ItemArt, Vec3 } from "@/components/shop-data";

// The cosmetics model math, ported from the game's `horizon_cosmetics` (item.rs, pose.rs, preview.rs) so the site
// draws exactly what the launcher's Wardrobe and the game draw: vanilla's player model (`PlayerModel`, both skin
// layers, wide or slim arms), each item on its bone under its attachment, `ModelPart.Cube`'s box UV, grown by
// `inflate`, mirrored in x on request, and the items' swing, bob and spin loops; a companion at its anchor, an aura at
// the feet and a trail's particles (fx.rs, trail.rs). Model space is the game's: pixels (1/16 block), y down, the
// player's front toward -z.

export type Mat4 = Float32Array;

export const identity = (): Mat4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/** a × b (column-major, as GL reads it). */
export function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}

export function translation(x: number, y: number, z: number): Mat4 {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

export function rotX(a: number): Mat4 {
  const [s, c] = [Math.sin(a), Math.cos(a)];
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}
export function rotY(a: number): Mat4 {
  const [s, c] = [Math.sin(a), Math.cos(a)];
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}
export function rotZ(a: number): Mat4 {
  const [s, c] = [Math.sin(a), Math.cos(a)];
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
export function scaling(s: number): Mat4 {
  return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);
}

export function apply(m: Mat4, x: number, y: number, z: number): Vec3 {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

/** x, y, z (pixels), x, y, z rotations (radians), a uniform scale: the game's `Part::pose`. */
export type Pose = { p: Vec3; r: Vec3; s: number };

/** `ModelPart.translateAndRotate` (pose.rs `pose_matrix`): T(p / 16) · Rz · Ry · Rx · S, in blocks. */
export function poseMatrix({ p, r, s }: Pose): Mat4 {
  let m = translation(p[0] / 16, p[1] / 16, p[2] / 16);
  if (r[2]) m = mul(m, rotZ(r[2]));
  if (r[1]) m = mul(m, rotY(r[1]));
  if (r[0]) m = mul(m, rotX(r[0]));
  if (s !== 1) m = mul(m, scaling(s));
  return m;
}

// ── faces ──

/** One quad: four corners (pixels) with their UV (0..1), and its normal. */
export type Face = { v: [number, number, number, number, number][]; n: Vec3 };

/** `ModelPart.Cube` (item.rs `box_faces`): six faces with box UV in vanilla's order, grown by `inflate`, mirrored in x. */
export function boxFaces(c: ArtCube, tw: number, th: number): Face[] {
  const [w, h, d] = c.size;
  const g = c.inflate;
  let x0 = c.origin[0] - g;
  let x1 = c.origin[0] + w + g;
  const [y0, z0] = [c.origin[1] - g, c.origin[2] - g];
  const [y1, z1] = [c.origin[1] + h + g, c.origin[2] + d + g];
  if (c.mirror) [x0, x1] = [x1, x0];
  const t0: Vec3 = [x0, y0, z0];
  const t1: Vec3 = [x1, y0, z0];
  const t2: Vec3 = [x1, y1, z0];
  const t3: Vec3 = [x0, y1, z0];
  const l0: Vec3 = [x0, y0, z1];
  const l1: Vec3 = [x1, y0, z1];
  const l2: Vec3 = [x1, y1, z1];
  const l3: Vec3 = [x0, y1, z1];
  const [u, v] = c.uv;
  const [u1, u2, u22, u3, u4] = [u + d, u + d + w, u + d + w + w, u + d + w + d, u + d + w + d + w];
  const [v1, v2] = [v + d, v + d + h];
  const faces: [Vec3[], [number, number, number, number], Vec3][] = [
    [[l1, l0, t0, t1], [u1, v, u2, v1], [0, -1, 0]],
    [[t2, t3, l3, l2], [u2, v1, u22, v], [0, 1, 0]],
    [[t0, l0, l3, t3], [u, v1, u1, v2], [-1, 0, 0]],
    [[t1, t0, t3, t2], [u1, v1, u2, v2], [0, 0, -1]],
    [[l1, t1, t2, l2], [u2, v1, u3, v2], [1, 0, 0]],
    [[l0, l1, l2, l3], [u3, v1, u4, v2], [0, 0, 1]],
  ];
  return faces.map(([corners, [a, b, cc, e], normal]) => {
    // Polygon's remap: (u1, v0), (u0, v0), (u0, v1), (u1, v1).
    const uvs = [
      [cc, b],
      [a, b],
      [a, e],
      [cc, e],
    ];
    const verts = corners.map((p, i) => [p[0], p[1], p[2], uvs[i][0] / tw, uvs[i][1] / th] as [number, number, number, number, number]);
    const n: Vec3 = [...normal];
    if (c.mirror) {
      verts.reverse();
      n[0] = -n[0];
    }
    return { v: verts, n };
  });
}

// ── parts: the game's `Part` (a pose, faces, children), baked from the item file or the player model ──

export type Part = { name: string; pose: Pose; faces: Face[]; children: Part[] };

const RAD = Math.PI / 180;

function bake(file: ArtPart, tw: number, th: number): Part {
  return {
    name: file.name,
    pose: { p: [...file.pivot], r: file.rotation.map((a) => a * RAD) as Vec3, s: 1 },
    faces: file.cubes.flatMap((c) => boxFaces(c, tw, th)),
    children: file.children.map((c) => bake(c, tw, th)),
  };
}

/** An item's roots, one per bone it rides (item.rs `roots`): `cosmetic` on the item's bone, then `cosmetic_<bone>`.
 * A companion or an aura rides no bone: one root, under `fxBase`. */
export function itemRoots(art: ItemArt, tw: number, th: number): { bone: string; root: Part }[] {
  const a = art.attach;
  const pose: Pose = { p: [...a.offset], r: a.rotation.map((x) => x * RAD) as Vec3, s: a.scale };
  const loose = !!(art.companion || art.aura || art.trail);
  const roots = new Map<string, Part>();
  roots.set(loose ? "" : art.bone, { name: "cosmetic", pose, faces: [], children: [] });
  for (const p of art.parts) {
    const bone = loose ? "" : (p.bone ?? art.bone);
    let root = roots.get(bone);
    if (!root) {
      root = { name: `cosmetic_${bone}`, pose, faces: [], children: [] };
      roots.set(bone, root);
    }
    root.children.push(bake(p, tw, th));
  }
  return [...roots].filter(([, r]) => r.children.length > 0).map(([bone, root]) => ({ bone, root }));
}

/** Where an item on no bone sits (preview.rs `Draw::item`): a companion at its anchor, an aura at the middle of the
 * feet (24 pixels under the neck); null for the rest. */
export function fxBase(art: ItemArt): Mat4 | null {
  if (art.companion) return translation(art.companion.anchor[0] / 16, art.companion.anchor[1] / 16, art.companion.anchor[2] / 16);
  if (art.aura) return translation(0, 1.5, 0);
  return null;
}

// ── a trail: its particles left behind a player walking forward (trail.rs) ──

/** Walking speed, blocks a tick (4.3 a second): the viewer's player stands still, so the ground goes back under it. */
const WALK = 4.3 / 20;
/** Particles one wearer has alive at once (trail.rs `PER_PLAYER`). */
export const TRAIL_CAP = 24;
/** Values per vertex: x, y, z, u, v, light, alpha. */
export const STRIDE = 7;

const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, -1],
  [1, 1],
  [-1, 1],
] as const;

/** A hash of `n` to 0..1 (trail.rs `unit`, lowbias32): the same particle looks the same on every frame. */
function unit(n: number) {
  let x = n >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 8) / (1 << 24);
}

/** The particles of `trail` alive at `ticks` (blocks, model space), as camera-facing quads (`right` and `up`: the
 * camera's, unit, in model space) pushed into `out` as triangles. They are born at a steady rate by distance walked,
 * so the stream never ends and a still frame (`ticks` 0) is full; each is placed from its age alone, as the game's
 * `Emitter::quads`: fall by gravity, sway, spin, fade over its last third. Past `TRAIL_CAP` alive the trail thins. */
export function trailQuads(trail: ArtTrail, ticks: number, right: Vec3, up: Vec3, out: number[], keep?: (z: number) => boolean) {
  const life = trail.lifetime;
  const perTick = Math.min(trail.rate * WALK, TRAIL_CAP / life);
  const lift = trail.from === "body" ? 0.9 : 0.1;
  const light = trail.glow ? 1 : 0.75;
  const w = 1 / trail.sprites;
  let alive = 0;
  for (let n = Math.floor(ticks * perTick); alive < TRAIL_CAP; n--) {
    const age = ticks - n / perTick;
    if (age >= life) break;
    if (age < 0) continue;
    alive++;
    // The hash wraps so `n` stays small however long the page is open.
    const seed = (((n % 4096) + 4096) % 4096) * 4;
    const phase = unit(seed + 2) * Math.PI * 2;
    const sway = (trail.drift / 16) * Math.sin(age * 0.2 + phase);
    const fall = 0.5 * trail.gravity * age * age;
    // Left at the feet (y down: 1.5 blocks under the neck), a little around them, as far behind as walked since.
    const x = (unit(seed + 1) - 0.5) * 0.4 + sway * Math.cos(phase);
    const y = 1.5 - lift + fall;
    const z = (unit(seed + 2) - 0.5) * 0.4 + age * WALK + sway * Math.sin(phase);
    if (keep && !keep(z)) continue;
    const spin = trail.spin * age * RAD + phase;
    const [s, c] = [Math.sin(spin), Math.cos(spin)];
    const half = (trail.size[0] + (trail.size[1] - trail.size[0]) * unit(seed + 1)) / 32;
    // The quad's half sides, turned by its spin in the camera's plane.
    const [rx, ry, rz] = [(right[0] * c + up[0] * s) * half, (right[1] * c + up[1] * s) * half, (right[2] * c + up[2] * s) * half];
    const [ux, uy, uz] = [(up[0] * c - right[0] * s) * half, (up[1] * c - right[1] * s) * half, (up[2] * c - right[2] * s) * half];
    const sprite = Math.floor(unit(seed + 3) * trail.sprites) % trail.sprites;
    const [u0, u1] = [sprite * w, (sprite + 1) * w];
    const alpha = trail.fade ? Math.min(1, 3 * (1 - age / life)) : 1;
    // Corners at -r-u, +r-u, +r+u, -r+u (the sprite's top toward `up`), as two triangles.
    for (const [sr, su] of CORNERS)
      out.push(x + sr * rx + su * ux, y + sr * ry + su * uy, z + sr * rz + su * uz, sr < 0 ? u0 : u1, su < 0 ? 1 : 0, light, alpha);
  }
}

function find(part: Part, name: string): Part | null {
  if (part.name === name) return part;
  for (const c of part.children) {
    const f = find(c, name);
    if (f) return f;
  }
  return null;
}

/** The animated parts' poses at `ticks` (item.rs `animate`): each part's rest pose with its loops added. */
export function animatePoses(animations: ArtAnimation[], roots: Part[], ticks: number): Map<string, Pose> {
  const out = new Map<string, Pose>();
  for (const anim of animations) {
    if (out.has(anim.part)) continue;
    let part: Part | null = null;
    for (const r of roots) part ??= find(r, anim.part);
    if (!part) continue;
    const pose: Pose = { p: [...part.pose.p], r: [...part.pose.r], s: part.pose.s };
    for (const a of animations) {
      if (a.part !== anim.part) continue;
      const turns = ticks / a.period + a.phase;
      if (a.motion === "swing") pose.r[a.axis] += a.amplitude * Math.sin(turns * Math.PI * 2) * RAD;
      else if (a.motion === "bob") pose.p[a.axis] += a.amplitude * Math.sin(turns * Math.PI * 2);
      else pose.r[a.axis] += (((turns % 1) + 1) % 1) * Math.PI * 2;
    }
    out.set(anim.part, pose);
  }
  return out;
}

// ── the player: vanilla's PlayerModel on a 64×64 skin (preview.rs `player_model`) ──

const rest = (p: Vec3): Pose => ({ p, r: [0, 0, 0], s: 1 });
const cube = (origin: Vec3, size: Vec3, uv: [number, number], inflate: number): ArtCube => ({ origin, size, uv, inflate, mirror: false });

export function playerModel(slim: boolean): Part {
  const part = (name: string, pivot: Vec3, origin: Vec3, size: Vec3, uv: [number, number], outer: [string, [number, number], number]): Part => ({
    name,
    pose: rest(pivot),
    faces: boxFaces(cube(origin, size, uv, 0), 64, 64),
    children: [{ name: outer[0], pose: rest([0, 0, 0]), faces: boxFaces(cube(origin, size, outer[1], outer[2]), 64, 64), children: [] }],
  });
  const [arm, armY, rightX]: [Vec3, number, number] = slim ? [[3, 12, 4], 2.5, -2] : [[4, 12, 4], 2, -3];
  const leg: Vec3 = [4, 12, 4];
  return {
    name: "root",
    pose: rest([0, 0, 0]),
    faces: [],
    children: [
      part("head", [0, 0, 0], [-4, -8, -4], [8, 8, 8], [0, 0], ["hat", [32, 0], 0.5]),
      part("body", [0, 0, 0], [-4, 0, -2], [8, 12, 4], [16, 16], ["jacket", [16, 32], 0.25]),
      part("right_arm", [-5, armY, 0], [rightX, -2, -2], arm, [40, 16], ["right_sleeve", [40, 32], 0.25]),
      part("left_arm", [5, armY, 0], [-1, -2, -2], arm, [32, 48], ["left_sleeve", [48, 48], 0.25]),
      part("right_leg", [-1.9, 12, 0], [-2, 0, -2], leg, [0, 16], ["right_pants", [0, 32], 0.25]),
      part("left_leg", [1.9, 12, 0], [-2, 0, -2], leg, [16, 48], ["left_pants", [0, 48], 0.25]),
    ],
  };
}

/** Vanilla's idle arm bob (`AnimationUtils.bobArms`): the arms breathe a little, and a shirt's sleeves with them. */
export function bobArms(model: Part, ticks: number): Map<string, Pose> {
  const out = new Map<string, Pose>();
  for (const [name, sign] of [
    ["right_arm", 1],
    ["left_arm", -1],
  ] as const) {
    const arm = model.children.find((c) => c.name === name);
    if (!arm) continue;
    out.set(name, { p: arm.pose.p, r: [sign * Math.sin(ticks * 0.067) * 0.05, 0, sign * (Math.cos(ticks * 0.09) * 0.05 + 0.05)], s: 1 });
  }
  return out;
}

// ── skins: Mojang's texture as vanilla prepares it (SkinTextureDownloader.processLegacySkin) ──

/** A 64×64 RGBA skin from a decoded image: a legacy 64×32 skin gets its left limbs mirrored from the right ones, and
 * the layers that must be opaque are made opaque, as vanilla does. */
export function prepareSkin(src: ImageData): ImageData | null {
  const legacy = src.width === 64 && src.height === 32;
  if (src.width !== 64 || (src.height !== 64 && !legacy)) return null;
  const out = new ImageData(64, 64);
  out.data.set(src.data.subarray(0, 64 * src.height * 4));
  const d = out.data;
  const at = (x: number, y: number) => (y * 64 + x) * 4;
  if (legacy) {
    const copy = (sx: number, sy: number, dx: number, dy: number, w: number, h: number) => {
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const from = at(sx + i, sy + j);
          const to = at(sx + dx + (w - 1 - i), sy + dy + j);
          for (let k = 0; k < 4; k++) d[to + k] = d[from + k];
        }
    };
    copy(4, 16, 16, 32, 4, 4);
    copy(8, 16, 16, 32, 4, 4);
    copy(0, 20, 24, 32, 4, 12);
    copy(4, 20, 16, 32, 4, 12);
    copy(8, 20, 8, 32, 4, 12);
    copy(12, 20, 16, 32, 4, 12);
    copy(44, 16, -8, 32, 4, 4);
    copy(48, 16, -8, 32, 4, 4);
    copy(40, 20, 0, 32, 4, 12);
    copy(44, 20, -8, 32, 4, 12);
    copy(48, 20, -16, 32, 4, 12);
    copy(52, 20, -8, 32, 4, 12);
  }
  const opaque = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d[at(x, y) + 3] = 255;
  };
  opaque(0, 0, 32, 16);
  if (legacy) {
    // Notch's transparency hack: a legacy hat layer with no see-through pixel is no hat at all.
    let solid = true;
    for (let y = 0; y < 32 && solid; y++) for (let x = 32; x < 64; x++) if (d[at(x, y) + 3] < 128) solid = false;
    if (solid) for (let y = 0; y < 32; y++) for (let x = 32; x < 64; x++) d[at(x, y) + 3] = 0;
  }
  opaque(0, 16, 64, 32);
  opaque(16, 48, 48, 64);
  return out;
}

// ── Horizon's own stand-in skin, until a Minecraft name is given: original art, painted from rows (not Mojang's) ──

const PALETTE: Record<string, string> = { H: "#3a2a4f", S: "#e0a98a", W: "#ffffff", E: "#4b3bb8", N: "#c98f72", M: "#9a5a4a", T: "#5b3fd6", t: "#4a32b8", L: "#a08cff", P: "#23305a", p: "#1c2648", B: "#1a1a22" };
type Paint = string | string[];
type BoxPaint = { top: Paint; bottom: Paint; right: Paint; front: Paint; left: Paint; back: Paint };
const rows = (w: number, spec: string) => [...spec].map((c) => c.repeat(w));
const mirrorRows = (r: string[]) => r.map((row) => [...row].reverse().join(""));
const HEAD_SIDE = ["HHHHHHHH", "HHHHHHHH", "HHHHHHSS", "HHHHSSSS", "HHHSSSSS", "HHSSSSSS", "HSSSSSSS", "SSSSSSSS"];
const LIMB = (spec: string): BoxPaint => ({ top: spec[0], bottom: spec[spec.length - 1], right: rows(4, spec), front: rows(4, spec), left: rows(4, spec), back: rows(4, spec) });
const STAND_IN: { uv: [number, number]; size: Vec3; paint: BoxPaint }[] = [
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
    paint: { top: "T", bottom: "P", right: rows(4, "TTTTTTTTTtPP"), front: ["TTTSSTTT", "TTTTTTTT", "TTLTTTTT", "TTLTTTTT", ...rows(8, "TTTTTtPP")], left: rows(4, "TTTTTTTTTtPP"), back: rows(8, "TTTTTTTTTtPP") },
  },
  { uv: [40, 16], size: [4, 12, 4], paint: LIMB("TTTtSSSSSSSS") },
  { uv: [32, 48], size: [4, 12, 4], paint: LIMB("TTTtSSSSSSSS") },
  { uv: [0, 16], size: [4, 12, 4], paint: { ...LIMB("PPPPPPPPPPBB"), front: [...rows(4, "PPPPPPP"), "pPPp", ...rows(4, "PPBB")] } },
  { uv: [16, 48], size: [4, 12, 4], paint: { ...LIMB("PPPPPPPPPPBB"), front: [...rows(4, "PPPPPPP"), "pPPp", ...rows(4, "PPBB")] } },
];

/** Horizon's stand-in player skin (64×64), painted on a 2D canvas. */
export function standInSkin(): ImageData | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  if (!g) return null;
  const fill = (x: number, y: number, w: number, h: number, face: Paint) => {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const c = typeof face === "string" ? face : face[Math.min(j, face.length - 1)]?.[Math.min(i, face[0].length - 1)];
        if (c && PALETTE[c]) {
          g.fillStyle = PALETTE[c];
          g.fillRect(x + i, y + j, 1, 1);
        }
      }
  };
  for (const { uv: [u, v], size: [w, h, d], paint } of STAND_IN) {
    fill(u + d, v, w, d, paint.top);
    fill(u + d + w, v, w, d, paint.bottom);
    fill(u, v + d, d, h, paint.right);
    fill(u + d, v + d, w, h, paint.front);
    fill(u + d + w, v + d, d, h, paint.left);
    fill(u + 2 * d + w, v + d, w, h, paint.back);
  }
  return g.getImageData(0, 0, 64, 64);
}

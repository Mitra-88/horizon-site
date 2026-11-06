import type { ArtAnimation, ArtCube, ArtEmote, ArtPart, ArtTrail, EmoteKey, EmoteTrack, ItemArt, Vec3 } from "@/components/shop-data";

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

// ── emotes: emote.rs's sampling and posing, so the shop plays them as the game does ──

type Quat = [number, number, number, number]; // x, y, z, w

const qmul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

/** glam's `Quat::from_euler(EulerRot::ZYX, z, y, x)`: Rz · Ry · Rx, as `poseMatrix` turns a part. */
function quat(r: Vec3): Quat {
  const half = (a: number) => [Math.sin(a / 2), Math.cos(a / 2)];
  const [sx, cx] = half(r[0]);
  const [sy, cy] = half(r[1]);
  const [sz, cz] = half(r[2]);
  return qmul(qmul([0, 0, sz, cz], [0, sy, 0, cy]), [sx, 0, 0, cx]);
}

/** The x, y, z angles of `q` read back as Rz · Ry · Rx (glam's `to_euler(EulerRot::ZYX)`). */
function euler(q: Quat): Vec3 {
  const [x, y, z, w] = q;
  const r20 = 2 * (x * z - w * y);
  const r21 = 2 * (y * z + w * x);
  const r22 = 1 - 2 * (x * x + y * y);
  const r10 = 2 * (x * y + w * z);
  const r00 = 1 - 2 * (y * y + z * z);
  return [Math.atan2(r21, r22), Math.asin(Math.max(-1, Math.min(1, -r20))), Math.atan2(r10, r00)];
}

function rotate(q: Quat, v: Vec3): Vec3 {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]);
  return [p[0], p[1], p[2]];
}

function slerp(a: Quat, b: Quat, t: number): Quat {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const c: Quat = d < 0 ? [-b[0], -b[1], -b[2], -b[3]] : [...b];
  d = Math.abs(d);
  if (d > 0.9995) {
    const q = a.map((v, i) => v + (c[i] - v) * t) as Quat;
    const n = Math.hypot(...q) || 1;
    return q.map((v) => v / n) as Quat;
  }
  const th = Math.acos(d);
  const [wa, wb] = [Math.sin((1 - t) * th) / Math.sin(th), Math.sin(t * th) / Math.sin(th)];
  return a.map((v, i) => v * wa + c[i] * wb) as Quat;
}

function catmull(p0: number, p1: number, p2: number, p3: number, s: number) {
  const s2 = s * s;
  return 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (3 * p1 - p0 - 3 * p2 + p3) * s2 * s);
}

type Sample = { offset: Vec3; rotation: Vec3; scale: number };

/** `Track::sample`: the track at tick `t` (wrapped for a loop, held at the ends for a one-shot). */
export function sampleTrack(track: EmoteTrack, t: number, length: number, looping: boolean): Sample {
  const keys = track.keys;
  const n = keys.length;
  const at = (k: EmoteKey): Sample => ({ offset: [...k.offset], rotation: [...k.rotation], scale: k.scale });
  t = looping ? ((t % length) + length) % length : Math.min(length, Math.max(0, t));
  let i = -1;
  for (let k = n - 1; k >= 0; k--)
    if (keys[k].t <= t) {
      i = k;
      break;
    }
  if (i < 0) {
    if (!looping) return at(keys[0]);
    i = n - 1;
  }
  if (i === n - 1 && !looping) return at(keys[i]);
  const next = (i + 1) % n;
  const t0 = keys[i].t;
  let t1 = keys[next].t;
  let now = t;
  if (next <= i) {
    t1 += length;
    if (now < t0) now += length;
  }
  const span = t1 - t0;
  const s = span > 0 ? Math.min(1, Math.max(0, (now - t0) / span)) : 0;
  const [k0, k1] = [keys[i], keys[next]];
  const near = (j: number) => keys[looping ? ((j % n) + n) % n : Math.min(n - 1, Math.max(0, j))];
  const [kp, kn] = [near(i - 1), near(i + 2)];
  const mix = (a: number, b: number, pa: number, nb: number) =>
    k0.ease === "step" ? a : k0.ease === "linear" ? a + (b - a) * s : k0.ease === "in_out" ? a + (b - a) * (s * s * (3 - 2 * s)) : catmull(pa, a, b, nb, s);
  const three = (f: (k: EmoteKey) => Vec3): Vec3 => [0, 1, 2].map((c) => mix(f(k0)[c], f(k1)[c], f(kp)[c], f(kn)[c])) as Vec3;
  return { offset: three((k) => k.offset), rotation: three((k) => k.rotation), scale: mix(k0.scale, k1.scale, kp.scale, kn.scale) };
}

const smooth01 = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** `Emote::weight`: how much of the emote shows at `t` (it fades in, and a one-shot out, over its blend). */
export function emoteWeight(e: ArtEmote, t: number) {
  if (t < 0 || (!e.looping && t >= e.length)) return 0;
  if (e.blend <= 0) return 1;
  const fadeIn = smooth01(t / e.blend);
  return e.looping ? fadeIn : Math.min(fadeIn, smooth01((e.length - t) / e.blend));
}

export const EMOTE_BODY = ["head", "body", "right_arm", "left_arm", "right_leg", "left_leg"] as const;
/** The feet (pixels under the neck), what `root` turns about. */
const FEET: Vec3 = [0, 24, 0];

/** `Emote::pose_body`: the six bones at `t`, blended by `weight` from `current` (their poses without the emote) toward
 * the emote's; `rest` is each bone's rest pose (where its offsets count from). */
export function poseBody(e: ArtEmote, t: number, weight: number, rest: Map<string, Pose>, current: Map<string, Pose>): Map<string, Pose> {
  const now = new Map<string, Pose>();
  for (const b of EMOTE_BODY) {
    const p = current.get(b) ?? rest.get(b);
    if (p) now.set(b, { p: [...p.p], r: [...p.r], s: p.s });
  }
  if (weight <= 0) return now;
  const target = new Map<string, Pose>([...now].map(([b, p]) => [b, { p: [...p.p], r: [...p.r], s: p.s }]));
  for (const track of e.tracks) {
    const r = rest.get(track.part);
    if (!r || !(EMOTE_BODY as readonly string[]).includes(track.part)) continue;
    const s = sampleTrack(track, t, e.length, e.looping);
    target.set(track.part, { p: [r.p[0] + s.offset[0], r.p[1] + s.offset[1], r.p[2] + s.offset[2]], r: s.rotation, s: r.s });
  }
  const root = e.tracks.find((tr) => tr.part === "root");
  if (root) {
    const s = sampleTrack(root, t, e.length, e.looping);
    const turn = quat(s.rotation);
    for (const p of target.values()) {
      const d = rotate(turn, [p.p[0] - FEET[0], p.p[1] - FEET[1], p.p[2] - FEET[2]]);
      p.p = [FEET[0] + d[0] + s.offset[0], FEET[1] + d[1] + s.offset[1], FEET[2] + d[2] + s.offset[2]];
      p.r = euler(qmul(turn, quat(p.r)));
    }
  }
  if (weight >= 1) return target;
  for (const [b, p] of now) {
    const goal = target.get(b)!;
    p.p = [0, 1, 2].map((c) => p.p[c] + (goal.p[c] - p.p[c]) * weight) as Vec3;
    p.r = euler(slerp(quat(p.r), quat(goal.r), weight));
  }
  return now;
}

/** `Emote::pose_props`: each prop's pose at `t`, from its rest (`rest`), its keys added (and its scale multiplied). */
export function poseProps(e: ArtEmote, t: number, roots: Part[]): Map<string, Pose> {
  const out = new Map<string, Pose>();
  for (const track of e.tracks) {
    if (track.part === "root" || (EMOTE_BODY as readonly string[]).includes(track.part)) continue;
    let part: Part | null = null;
    for (const r of roots) part ??= find(r, track.part);
    if (!part) continue;
    const s = sampleTrack(track, t, e.length, e.looping);
    const p = part.pose;
    out.set(track.part, { p: [p.p[0] + s.offset[0], p.p[1] + s.offset[1], p.p[2] + s.offset[2]], r: [p.r[0] + s.rotation[0], p.r[1] + s.rotation[1], p.r[2] + s.rotation[2]], s: p.s * s.scale });
  }
  return out;
}

/** The tick a still picture of the emote shows: where the body is furthest from its rest (the move at its fullest),
 * with its props shown as large as they get. */
export function emoteStill(e: ArtEmote): number {
  let best = e.length / 2;
  let most = -1;
  for (let k = 1; k < 32; k++) {
    const t = (e.length * k) / 32;
    let far = 0;
    for (const track of e.tracks) {
      const s = sampleTrack(track, t, e.length, e.looping);
      if (track.part !== "root" && !(EMOTE_BODY as readonly string[]).includes(track.part)) {
        far += 4 * s.scale;
        continue;
      }
      far += Math.abs(s.rotation[0]) + Math.abs(s.rotation[1]) + Math.abs(s.rotation[2]) + (Math.abs(s.offset[0]) + Math.abs(s.offset[1]) + Math.abs(s.offset[2])) / 8;
    }
    if (far > most) [most, best] = [far, t];
  }
  return best;
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

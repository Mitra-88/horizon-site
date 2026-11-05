import type { ItemArt, Vec3 } from "@/components/shop-data";
import { animatePoses, apply, bobArms, itemRoots, mul, playerModel, poseMatrix, prepareSkin, rotX, rotY, standInSkin, translation, type Mat4, type Part, type Pose } from "@/components/shop/model";

// The shop's one WebGL context. The big viewer shows its canvas; every card's picture is drawn by the same context into
// a framebuffer, read back once and put on the card's own 2D canvas, so a page of cards never holds more than one GL
// context (phones allow few). Plain WebGL 1 (or 2), no library: textured quads, cutout alpha, the Wardrobe's light.

export type Scene = {
  skin: string; // a texture key from `skinTexture`
  slim: boolean;
  items: ItemArt[];
  ticks: number;
  /** Degrees: 0 shows the front. */
  yaw: number;
  /** Degrees down. */
  pitch: number;
  /** What the camera looks at (blocks, model space) and from how far. */
  target: Vec3;
  distance: number;
  /** The arms breathe, as vanilla's idle pose. */
  idle: boolean;
};

const FOV = 30 * (Math.PI / 180);

const VERTEX = `
attribute vec3 a_pos; attribute vec2 a_uv; attribute float a_light;
uniform mat4 u_vp; varying vec2 v_uv; varying float v_light;
void main() { gl_Position = u_vp * vec4(a_pos, 1.0); v_uv = a_uv; v_light = a_light; }`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_tex; varying vec2 v_uv; varying float v_light;
void main() { vec4 c = texture2D(u_tex, v_uv); if (c.a < 0.5) discard; gl_FragColor = vec4(c.rgb * v_light, 1.0); }`;

type Tex = { tex: WebGLTexture; w: number; h: number; source: TexImageSource | ImageData };

/** view · world, then the perspective: model space has y down and the camera looks along +z, as preview.rs's. */
function viewMatrix(s: Pick<Scene, "yaw" | "pitch" | "target" | "distance">): Mat4 {
  const r = mul(rotX((-s.pitch * Math.PI) / 180), rotY((s.yaw * Math.PI) / 180));
  return mul(translation(0, 0, s.distance), mul(r, translation(-s.target[0], -s.target[1], -s.target[2])));
}

function projection(aspect: number, near = 0.05, far = 50): Mat4 {
  const f = 1 / Math.tan(FOV / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = -f; // model y is down; clip y is up
  m[10] = (far + near) / (far - near);
  m[11] = 1;
  m[14] = (-2 * far * near) / (far - near);
  return m;
}

/** Where a model-space point (blocks) lands on a `w`×`h` picture of `scene`, in its pixels (y down). */
export function project(scene: Scene, w: number, h: number, p: Vec3): [number, number] | null {
  const v = apply(viewMatrix(scene), p[0], p[1], p[2]);
  if (v[2] <= 0.01) return null;
  const f = 1 / Math.tan(FOV / 2);
  return [w / 2 + ((f * v[0]) / v[2]) * (h / 2), h / 2 + ((f * v[1]) / v[2]) * (h / 2)];
}

/** The camera distance that fits a sphere of `radius` blocks in a view of the given aspect. */
export function fitDistance(radius: number, aspect: number) {
  const half = Math.min(FOV / 2, Math.atan(Math.tan(FOV / 2) * aspect));
  return radius / Math.sin(half);
}

type Quads = { key: string; data: number[] };

/** Every face of `part`'s tree under `parent`, posed by `poses`, as triangles (x, y, z, u, v, light) into `out`. */
function emit(part: Part, parent: Mat4, poses: Map<string, Pose>, view: Mat4, out: number[], bones?: Map<string, Mat4>) {
  const m = mul(parent, poseMatrix(poses.get(part.name) ?? part.pose));
  bones?.set(part.name, m);
  if (part.faces.length) {
    const vm = mul(view, m);
    for (const face of part.faces) {
      const [nx, ny, nz] = face.n;
      let x = vm[0] * nx + vm[4] * ny + vm[8] * nz;
      let y = vm[1] * nx + vm[5] * ny + vm[9] * nz;
      let z = vm[2] * nx + vm[6] * ny + vm[10] * nz;
      const len = Math.hypot(x, y, z) || 1;
      [x, y, z] = [x / len, y / len, z / len];
      // The Wardrobe's light (preview.rs): brighter facing up and toward the viewer.
      const light = Math.min(1, 0.55 + 0.25 * Math.max(-y, 0) + 0.2 * Math.max(-z, 0));
      const c = face.v.map((v) => [...apply(m, v[0] / 16, v[1] / 16, v[2] / 16), v[3], v[4]]);
      for (const i of [0, 1, 2, 0, 2, 3]) out.push(c[i][0], c[i][1], c[i][2], c[i][3], c[i][4], light);
    }
  }
  for (const child of part.children) emit(child, m, poses, view, out, bones);
}

const MODELS = new Map<string, { roots: { bone: string; root: Part }[]; all: Part[] }>();
const BODIES = new Map<boolean, Part>();

function itemKey(art: ItemArt) {
  return `item:${art.id}:${art.texture.length}:${art.texture.slice(-24)}`;
}

/** Every triangle of `scene`, per texture; and the bones' matrices. */
function buildScene(scene: Scene, textures: Map<string, Tex>, view: Mat4) {
  let body = BODIES.get(scene.slim);
  if (!body) BODIES.set(scene.slim, (body = playerModel(scene.slim)));
  const bones = new Map<string, Mat4>();
  const skin: number[] = [];
  emit(body, translation(0, 0, 0), scene.idle ? bobArms(body, scene.ticks) : new Map(), view, skin, bones);
  const batches: Quads[] = [{ key: scene.skin, data: skin }];
  for (const art of scene.items) {
    const key = itemKey(art);
    const tex = textures.get(key);
    if (!tex) continue;
    let model = MODELS.get(key);
    if (!model) {
      const roots = itemRoots(art, tex.w, tex.h);
      MODELS.set(key, (model = { roots, all: roots.map((r) => r.root) }));
    }
    const poses = animatePoses(art.animations, model.all, scene.ticks);
    const data: number[] = [];
    for (const { bone, root } of model.roots) {
      const base = bones.get(bone);
      if (base) emit(root, base, poses, view, data);
    }
    batches.push({ key, data });
  }
  return { batches, bones };
}

/** The bounds (blocks) of what `items` add to the player at rest, with the body parts they ride. */
export function itemBounds(items: ItemArt[], slim: boolean, textures: { w: number; h: number }[]): { centre: Vec3; radius: number; top: number } {
  const body = playerModel(slim);
  const bones = new Map<string, Mat4>();
  const sink: number[] = [];
  const none = translation(0, 0, 0);
  emit(body, none, new Map(), none, sink, bones);
  const pts: number[] = [];
  items.forEach((art, i) => {
    const t = textures[i];
    if (!t) return;
    for (const { bone, root } of itemRoots(art, t.w, t.h)) {
      const base = bones.get(bone);
      if (!base) continue;
      emit(root, base, new Map(), none, pts);
      const part = body.children.find((c) => c.name === bone);
      if (part) emit({ ...part, children: [] }, none, new Map(), none, pts);
    }
  });
  if (!pts.length) return { centre: [0, 0.5, 0], radius: 1.2, top: -0.5 };
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pts.length; i += 6)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], pts[i + k]);
      hi[k] = Math.max(hi[k], pts[i + k]);
    }
  const centre: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  // `top`: the highest point (y is down), for the name tag's lift.
  return { centre, radius: Math.max(0.2, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2), top: Math.min(-0.5, lo[1]) };
}

export class ShopGL {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program!: WebGLProgram;
  private buffer!: WebGLBuffer;
  private loc!: { pos: number; uv: number; light: number; vp: WebGLUniformLocation | null; tex: WebGLUniformLocation | null };
  private textures = new Map<string, Tex>();
  private fbo: { fb: WebGLFramebuffer; color: WebGLTexture; depth: WebGLRenderbuffer; w: number; h: number } | null = null;
  lost = false;
  private listeners = new Set<() => void>();

  private constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.setup();
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      const old = [...this.textures];
      this.textures.clear();
      this.fbo = null;
      this.setup();
      for (const [key, t] of old) this.upload(key, t.source);
      this.listeners.forEach((l) => l());
    });
  }

  private static instance: ShopGL | null | undefined;

  /** The page's context, made on first use; null where WebGL isn't available. */
  static get(): ShopGL | null {
    if (ShopGL.instance !== undefined) return ShopGL.instance;
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const opts: WebGLContextAttributes = { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" };
    const gl = (canvas.getContext("webgl2", opts) ?? canvas.getContext("webgl", opts)) as WebGLRenderingContext | null;
    ShopGL.instance = gl ? new ShopGL(canvas, gl) : null;
    return ShopGL.instance;
  }

  /** Called when the context came back after a loss (everything should be drawn again). */
  onRestore(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setup() {
    const gl = this.gl;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(p);
    this.program = p;
    this.buffer = gl.createBuffer()!;
    this.loc = {
      pos: gl.getAttribLocation(p, "a_pos"),
      uv: gl.getAttribLocation(p, "a_uv"),
      light: gl.getAttribLocation(p, "a_light"),
      vp: gl.getUniformLocation(p, "u_vp"),
      tex: gl.getUniformLocation(p, "u_tex"),
    };
  }

  /** Shows the canvas in `host` (the viewer), filling it; the returned function takes it out again. */
  attach(host: HTMLElement) {
    this.canvas.className = "absolute inset-0 h-full w-full";
    this.canvas.setAttribute("aria-hidden", "true");
    host.prepend(this.canvas);
    return () => this.canvas.remove();
  }

  has(key: string) {
    return this.textures.has(key);
  }

  size(key: string) {
    const t = this.textures.get(key);
    return t ? { w: t.w, h: t.h } : null;
  }

  upload(key: string, source: TexImageSource | ImageData) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
    for (const [k, v] of [
      [gl.TEXTURE_MIN_FILTER, gl.NEAREST],
      [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ])
      gl.texParameteri(gl.TEXTURE_2D, k, v);
    const w = "width" in source ? Number(source.width) : 64;
    const h = "height" in source ? Number(source.height) : 64;
    const old = this.textures.get(key);
    if (old) gl.deleteTexture(old.tex);
    this.textures.set(key, { tex, w, h, source });
  }

  /** Draws `scene` into the current framebuffer, `w`×`h` device pixels. */
  private drawScene(scene: Scene, w: number, h: number) {
    const gl = this.gl;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.textures.has(scene.skin)) return;
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.program);
    const view = viewMatrix(scene);
    gl.uniformMatrix4fv(this.loc.vp, false, mul(projection(w / h), view));
    gl.uniform1i(this.loc.tex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.loc.pos);
    gl.enableVertexAttribArray(this.loc.uv);
    gl.enableVertexAttribArray(this.loc.light);
    for (const batch of buildScene(scene, this.textures, view).batches) {
      const tex = this.textures.get(batch.key);
      if (!tex || !batch.data.length) continue;
      gl.bindTexture(gl.TEXTURE_2D, tex.tex);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(batch.data), gl.STREAM_DRAW);
      gl.vertexAttribPointer(this.loc.pos, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(this.loc.uv, 2, gl.FLOAT, false, 24, 12);
      gl.vertexAttribPointer(this.loc.light, 1, gl.FLOAT, false, 24, 20);
      gl.drawArrays(gl.TRIANGLES, 0, batch.data.length / 6);
    }
  }

  /** Draws `scene` on the shared canvas at `w`×`h` device pixels (the viewer shows it). */
  render(scene: Scene, w: number, h: number) {
    if (this.lost) return;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.drawScene(scene, w, h);
  }

  /** Draws `scene` off screen at twice `w`×`h` and puts it, scaled down (smooth edges), on `target`. */
  snapshot(scene: Scene, target: HTMLCanvasElement) {
    if (this.lost) return false;
    const gl = this.gl;
    const [w, h] = [target.width, target.height];
    const ss = Math.max(1, Math.min(2, Math.floor(1024 / Math.max(w, h))));
    const [W, H] = [w * ss, h * ss];
    if (!this.fbo || this.fbo.w < W || this.fbo.h < H) {
      if (this.fbo) {
        gl.deleteFramebuffer(this.fbo.fb);
        gl.deleteTexture(this.fbo.color);
        gl.deleteRenderbuffer(this.fbo.depth);
      }
      const fb = gl.createFramebuffer()!;
      const color = gl.createTexture()!;
      const depth = gl.createRenderbuffer()!;
      const [fw, fh] = [Math.max(W, this.fbo?.w ?? 0), Math.max(H, this.fbo?.h ?? 0)];
      // Eight bits a channel: a texture (WebGL 1's colour renderbuffers have only four).
      gl.bindTexture(gl.TEXTURE_2D, color);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, fw, fh);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      this.fbo = { fb, color, depth, w: fw, h: fh };
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.fb);
    this.drawScene(scene, W, H);
    const pixels = new Uint8ClampedArray(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // GL's rows run bottom up.
    const flipped = new ImageData(W, H);
    const row = W * 4;
    for (let y = 0; y < H; y++) flipped.data.set(pixels.subarray((H - 1 - y) * row, (H - y) * row), y * row);
    const big = document.createElement("canvas");
    big.width = W;
    big.height = H;
    big.getContext("2d")?.putImageData(flipped, 0, 0);
    const g = target.getContext("2d");
    if (!g) return false;
    g.clearRect(0, 0, w, h);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(big, 0, 0, w, h);
    return true;
  }
}

// ── textures: skins and items, decoded once per page ──

const loading = new Map<string, Promise<string>>();

function decode(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The picture didn't load"));
    img.src = src;
  });
}

function pixels(img: HTMLImageElement): ImageData | null {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, c.width, c.height);
}

export const STAND_IN = "skin:horizon";
const SKIN_URL = /^https:\/\/textures\.minecraft\.net\/texture\/[0-9a-f]{1,128}$/;

/** The texture key of a player's skin (Mojang's texture, prepared as vanilla does), or Horizon's stand-in. */
export function skinTexture(gl: ShopGL, url: string | null): Promise<string> {
  const key = url && SKIN_URL.test(url) ? `skin:${url}` : STAND_IN;
  if (gl.has(key)) return Promise.resolve(key);
  let p = loading.get(key);
  if (!p) {
    p = (async () => {
      const data = key === STAND_IN ? standInSkin() : await decode(url!, true).then((img) => {
        const raw = pixels(img);
        return raw ? prepareSkin(raw) : null;
      });
      if (!data) throw new Error("This skin can't be drawn");
      gl.upload(key, data);
      return key;
    })();
    p.catch(() => loading.delete(key));
    loading.set(key, p);
  }
  return p;
}

/** Decodes and uploads the items' textures; resolves once they're all there (failures are left out). */
export async function itemTextures(gl: ShopGL, items: ItemArt[]) {
  await Promise.allSettled(
    items.map((art) => {
      const key = itemKey(art);
      if (gl.has(key)) return Promise.resolve(key);
      let p = loading.get(key);
      if (!p) {
        p = decode(`data:image/png;base64,${art.texture}`, false).then((img) => {
          gl.upload(key, img);
          return key;
        });
        p.catch(() => loading.delete(key));
        loading.set(key, p);
      }
      return p;
    }),
  );
}

export function textureSizes(gl: ShopGL, items: ItemArt[]) {
  return items.map((a) => gl.size(itemKey(a)) ?? { w: 64, h: 64 });
}

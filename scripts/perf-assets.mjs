import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "vendor/perf/manifest.json");
const hash = (data) => createHash("sha256").update(data).digest("hex");
const [command, sourceArg, buildArg] = process.argv.slice(2);

if (command === "import") {
  if (!sourceArg || !buildArg) {
    throw new Error("Usage: npm run perf:import -- HORIZON_SOURCE_DIR PERF_WASM_DIR");
  }
  const source = resolve(sourceArg);
  const build = resolve(buildArg);
  const git = (...args) => execFileSync("git", ["-C", source, ...args]);
  const revision = git("rev-parse", "HEAD").toString().trim();
  const patch = git("diff", "--binary", "HEAD", "--", "Cargo.toml", "Cargo.lock", "crates/horizon-perf", "crates/horizon-perf-format", "crates/horizon-bench", "xtask");
  const copies = [
    [join(build, "horizon_perf.wasm"), "public/perf/horizon_perf.wasm"],
    [join(build, "horizon_perf.js"), "lib/perf/generated/horizon_perf.js"],
    [join(source, "crates/horizon-theme/icons/horizon-64.png"), "public/perf/horizon-64.png"],
    [join(source, "crates/horizon-theme/fonts/OFL-Geist.txt"), "public/perf/fonts/OFL-Geist.txt"],
    ...["Geist-Regular", "Geist-Medium", "Geist-SemiBold", "GeistMono-Regular"].map((name) => [
      join(source, `crates/horizon-theme/fonts/${name}.ttf`), `public/perf/fonts/${name}.ttf`,
    ]),
  ];
  const files = {};
  for (const [from, to] of copies) {
    const target = join(root, to);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(from, target);
    files[to] = hash(await readFile(target));
  }
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(join(root, "vendor/perf/source.patch"), patch);
  files["vendor/perf/source.patch"] = hash(patch);
  await writeFile(manifestPath, JSON.stringify({ repository: "https://github.com/horizon-rust/horizon", revision, files }, null, 2) + "\n");
  console.log(`Imported perf reader from Horizon ${revision}.`);
} else if (command === "verify") {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (hash(await readFile(join(root, path))) !== expected) {
      throw new Error(`Perf asset checksum mismatch: ${path}. Reimport the reader and its matching wrapper together.`);
    }
  }
  console.log(`Verified ${Object.keys(manifest.files).length} perf assets from Horizon ${manifest.revision}.`);
} else {
  throw new Error("Expected import or verify.");
}

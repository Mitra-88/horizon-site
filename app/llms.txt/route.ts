import { getDocs, type Doc } from "@/components/docs-data";
import { DISCORD_URL, GITHUB_URL } from "@/components/links";
import { absolute, SITE_URL } from "@/components/site";

const PAGES = [
  ["Download and releases", "/releases", "every game, launcher and nightly release, with notes and downloads"],
  ["Benchmarks", "/benchmarks", "Horizon against Minecraft: Java Edition 26.3 on a ThinkPad, a Mac mini and a gaming desktop"],
  ["Mods", "/mods", "mods, modpacks and resource packs made for Horizon, each reviewed before it was listed"],
  ["Hub", "/hub", "what is being built now, what comes next and what shipped"],
  ["Players", "/stats", "how many people play Horizon right now"],
];

export async function GET() {
  const docs = await getDocs();
  const groups = new Map<string, Doc[]>();
  for (const doc of docs) groups.set(doc.group, [...(groups.get(doc.group) ?? []), doc]);

  const lines = [
    "# Horizon",
    "",
    "> Horizon is Minecraft: Java Edition 26.3 rewritten from scratch in Rust, sometimes called Minecraft Rust Edition. It is free, open source under the MIT licence, and unofficial: it is not approved by or associated with Mojang or Microsoft.",
    "",
    "- Players install it with the Horizon launcher, for Windows x64 and ARM64, macOS on Apple Silicon and Intel, and Linux x86-64.",
    "- It contains no Minecraft code, assets or data. It builds its game files from the player's own legally obtained copy of Minecraft: Java Edition 26.3, on their computer.",
    "- It reads the same worlds, plays by the same rules and generates the same terrain as the Java game. Differential harnesses feed the same inputs to Horizon and to vanilla and compare the results.",
    "- Forge, NeoForge, Fabric and Quilt mods do not run in it. It has its own mod system, and the launcher can carry over the content of some Java mods.",
    "- Players sign in with a Microsoft account that owns Java Edition, and it joins servers that check accounts (online mode) as vanilla does. Vanilla 26.3 clients can join a Horizon server.",
    `- It is made by Ludovic Marie. Source code: ${GITHUB_URL}. Community: ${DISCORD_URL}.`,
    "",
    "## Pages",
    "",
    `- [Home](${SITE_URL}): what Horizon is, its parity with vanilla, and the launcher download`,
    ...PAGES.map(([title, path, about]) => `- [${title}](${absolute(path)}): ${about}`),
    ...[...groups].flatMap(([group, pages]) => [
      "",
      `## Docs: ${group}`,
      "",
      ...pages.map((doc) => `- [${doc.title}](${absolute(doc.path)})${doc.description ? `: ${doc.description}` : ""}`),
    ]),
    "",
  ];

  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

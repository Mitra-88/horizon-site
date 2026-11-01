# Mods and data packs

Horizon has its own mods, made for Horizon and not compatible with Java mods. Data packs work in part. This page says what you can do with each today.

## Mods

Horizon has two kinds of mod:

- **Content mods** (`.hmod`) add blocks and items from data and assets: models, textures, recipes, loot tables, tags and structures, with no code. They work in single player today. This is also what the launcher's [modpack](/docs/modpacks) carry-over produces.
- **Native mods** (`.hnmod`) are Rust code built into the game: a HUD, keys, commands, settings, new behaviour. Horizon's own Zoom, FPS Counter, Keystrokes and Minimap are native mods. They work in single player, on LAN and on servers (only what runs in your own game, on a server you join).

> **Early.** Reviewed mods are listed at [playhorizon.dev/mods](/mods) and on the launcher's Mods page.

**Content mods**

1. Install one from the launcher's **Mods** page (pick **Horizon** beside Modrinth), or put its `.hmod` file in the `horizon-mods` folder of the game folder (see [Install](/docs/install#first-launch) for where that is).
2. Open **Options, Mods...**. Each mod is listed with what it may do ("May add blocks and items to your worlds") and a switch. Content mods start off.
3. Start the game again after a switch: content loads when the game starts. A mod that failed to load shows why, in red, on its row.

**Native mods**

A native mod is code, not sandboxed: it can do anything you can on your computer. So the launcher builds it into a game of its own, and only when you say so:

1. Install it from the launcher's **Mods** page. The first time, the launcher says what native mods are and turns on **Settings > Native mods (experimental)**.
2. There, press **Build**. The launcher names the mods and warns you in red; **I trust these mods: build** starts it. The first build downloads Rust and takes 20 to 30 minutes and a few GB of disk; later builds take a few minutes.
3. Play the **Native mods** instance. It has its own worlds and options, so your other worlds never run the mods.
4. In the game, **Options > Mods** lists each native mod with a switch and, when it has some, a **Settings** page and keys to rebind. Turn one off there and the next build leaves it out.

Install only mods whose authors you trust. The registry lists a native mod only after a maintainer has read its source, and each one's page links it. Horizon's own mods say "Made by Horizon"; every other mod's page says who made it.

**Making a mod**

[Make a mod](/docs/make-a-mod) is the full guide, for both kinds: the tools, your mod in the game, the hook points with a worked example, content mods, testing, and publishing on [the registry](/mods).

Java mod jars don't run in Horizon: their code calls and patches Minecraft's Java classes, and Horizon has none. What carries over is the data and assets inside a jar ([modpacks](/docs/modpacks)).

## Finding resource packs and modpacks

The launcher's **Mods** page (launcher 0.17 and newer) searches [Modrinth](https://modrinth.com) for what Horizon can load: resource packs and modpacks. Each result says how well it runs in Horizon (**Works**, **Partly**, or **Doesn't run**), and by default the page shows only what runs. **Install** downloads the file, checks it against the checksum Modrinth lists and refuses anything that does not match, then puts it in the right folder, with the packs it needs. **Update** and **Remove** are there too. A resource pack still has to be turned on in the game's Resource Packs screen. A modpack is imported on the [Modpacks page](/docs/modpacks).

CurseForge support is coming soon: the page shows it, but doesn't search it yet. The same things work from a terminal: `horizon-launcher mods search`, `install`, `update` and `remove`.

## Java mods from the Mods page (next launcher release)

Java code does not run in Horizon, but much of what a mod adds is data: blocks, items, recipes, loot tables, tags, worldgen, textures. From the next launcher release, the Mods page also lists Fabric, NeoForge and Forge mods made for 26.3 and, before offering one, downloads its jar, checks it against Modrinth's checksum and reads it (without running it) to say what of it Horizon runs:

- **Works**: the mod is only content, and all of it carries over.
- **Partly**: its content carries over; the row lists what does not, such as machines and containers, mobs, blocks or items with behaviour of their own, recipe types of its own, or Mixins.
- **Doesn't run**: there is nothing to carry over (performance mods, libraries, mods that are all code). It is not offered.

**Install** brings the mod over into `horizon-mods` and turns it on; start the game again to load it. Blocks take the closest vanilla block's shape, hardness and sounds, so a carried-over block can break faster or slower than in Java. Most popular mods today are **Partly** or **Doesn't run**: the verdict is the honest answer for each one.

## Data packs

A world's data packs go in its `datapacks` folder, as folders or `.zip` files with a `pack.mcmeta`, as in vanilla.

**Works today (single player and open-to-LAN worlds):**

- **Functions** (`.mcfunction`, with macros and line continuation), **function tags** (such as `minecraft:load` and `minecraft:tick`), **predicates** and **item modifiers**.
- The `/function`, `/datapack` and `/reload` commands, and the choice of which packs are on, kept with the world.

**Not applied from data packs yet:** custom recipes, loot tables, advancements and world generation. Horizon reads those from the vanilla data it prepared, and from content mods.

Vanilla's own data is always on, and it matches vanilla: every command runs as vanilla does, and recipes, loot and world generation are checked against the real game.

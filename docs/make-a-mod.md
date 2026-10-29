# Make a mod

This guide takes you from nothing to a mod that other players can install from [playhorizon.dev/mods](/mods). Horizon has two kinds of mod, and the first step is to pick the right one. You need no Minecraft modding experience.

## Two kinds of mod

| | Content mod | Native mod |
| --- | --- | --- |
| **What it is** | Data and assets: blocks, items, recipes, loot tables, tags, models, textures, names, structures | Rust code that hooks into the game: a HUD, keys, commands, settings, new behaviour |
| **File** | `.hmod` | `.hnmod` |
| **Code** | None | Rust, compiled into the game |
| **How players get it** | The game reads it when it starts | The launcher compiles a game with it, in an instance of its own |
| **Safety** | Data only: it can't run anything | Not sandboxed: it can do anything the player can on their computer |

**Pick a content mod** when what you add is a block, an item, a recipe or a structure: no compiler, and it works on every computer as it is. [Content mods](/docs/content-mods) has the whole guide.

**Pick a native mod** when the mod has to do something: draw on the screen, react to a key, add a command, change how the game plays. The rest of this page and the two after it are about native mods.

A Horizon mod is not a Java mod. Fabric, NeoForge and Forge jars don't run in Horizon, and Horizon mods don't run in Java Minecraft. What carries over from a Java mod is its data and assets ([modpacks](/docs/modpacks)).

## How a native mod works

A native mod is a **bundle** for [horizon-mixins](https://github.com/horizon-rust/horizon-mixins), a tool made for Horizon: a manifest, `horizon-mixin.toml`, and a few `.rs` files. Before the game is compiled, horizon-mixins adds your code to Horizon's own source and calls it from the places the manifest names. The result is an ordinary Horizon game with your mod built in.

Horizon keeps a set of **hook points** for this: empty functions the game calls at fixed places (every tick, every frame, when it draws the HUD, when a key goes down, when the player types a command, when Options > Mods lists the mods), and helpers to read the player, draw text and keep settings. A mod that hooks only these builds on every later version of Horizon too, so it doesn't need a new release for each Nightly. Horizon's own Zoom, FPS Counter, Keystrokes and Minimap are made this way.

Players never compile anything by hand. They install the mod from the launcher's Mods page, and the launcher compiles the game with it, with its own copy of Rust ([below](#what-players-see)).

## The path

1. **Set up** (this page): the tools, the files of a native mod, and your mod in the game.
2. **[The bundle](/docs/mod-manifest)**: the manifest, what a mod builds on, and the `.hnmod` file.
3. **[Hook points and helpers](/docs/mod-code)**: what your code can hook and call, and a worked example.
4. **[Content mods](/docs/content-mods)**: blocks, items, recipes and textures from data files, with no code at all.
5. **[Test it](/docs/test-a-mod)**: unit tests, a check against Horizon's source, and the game with your mod in it.
6. **[Publish it](/docs/publish-a-mod)**: package it and submit it to the registry.

## Install the tools

For a native mod you need:

- **[Rust](https://rustup.rs)**, the stable toolchain, and **Git**.
- **Python 3.11** or later, and `rsync` (on Windows, use WSL for the checks below).
- **[horizon-rust/horizon-mods](https://github.com/horizon-rust/horizon-mods)**, the registry's repository. Its `native/tools/native.py` applies your bundle to Horizon's source, checks and builds the game with it, and packages the `.hnmod`. It is what Horizon's own native mods use.
- **The launcher**, 0.2.23 or later ([Install](/docs/install)), with the game prepared at least once, to play with your mod.

```sh
git clone https://github.com/horizon-rust/horizon-mods
```

## The files of a native mod

The guide's example, [Playtime](/docs/mod-code#a-worked-example-playtime), shows how long you have played in a corner of the screen. Its folder:

```
playtime/
├── Cargo.toml                  runs the mod's unit tests: cargo test
├── compatibility.json          the hook points it needs, and the commits it was tested on
└── mixins/playtime/
    ├── horizon-mixin.toml      the manifest: its id, its version, what it hooks
    ├── runtime.rs              the mod's own code: becomes the module crate::game::playtime
    ├── tick.rs                 one small helper for each hook it uses
    ├── hud.rs
    └── …
```

Start from the example, or copy one of Horizon's own mods from [horizon-mods' `native/` folder](https://github.com/horizon-rust/horizon-mods/tree/main/native): `fps-overlay` is the smallest. [horizon-native-mod-template](https://github.com/horizon-rust/horizon-native-mod-template) shows the other way, a mod that hooks one of the game's own functions instead of a hook point ([the bundle](/docs/mod-manifest#hook-points-or-a-pinned-commit) says what that costs).

## Check it against Horizon

From your clone of horizon-mods, give `native.py` the path to your mod's folder:

```sh
cd horizon-mods
python3 native/tools/native.py check /path/to/playtime
```

It downloads Horizon's source at the commit your `compatibility.json` names (once), applies your bundle with horizon-mixins, and runs `cargo check` on the game. A mistake in your manifest is a horizon-mixins error; a mistake in your code is an ordinary Rust error, with the file and line. The first run compiles Horizon's dependencies and takes several minutes; later ones take seconds to a minute.

## See it in the game

The launcher builds a game with your mod from its folder:

```sh
horizon-launcher native-build /path/to/playtime/mixins/playtime --trust-native-code
```

It compiles the game with the launcher's own Rust and installs it in an instance named **Native mods**. Pick that instance in the launcher and press **Play**. The first build downloads Rust and takes 20 to 30 minutes; after a change to your mod, the next build compiles only what changed, a few minutes.

`--trust-native-code` is the same decision the launcher asks players for in red: the mods run with full access to the computer. Build only code you trust.

## What players see

When a player installs a native mod from the launcher's Mods page, the launcher says once that native mods compile into a game of their own (the first build downloads Rust and can take 20 to 30 minutes) and turns on **Settings > Native mods (experimental)**. There the player presses **Build**, reads the red warning that names the mods, and builds with **I trust these mods: build**. The **Native mods** instance then plays the built game, with its own worlds and options.

In the game, **Options > Mods** lists the mod with a switch and, when the mod has some, a **Settings** page and keys to rebind. A mod's settings live in `horizon-mods/.horizon-mod-data/<id>/` in the game folder, one file per setting.

Next: [the bundle](/docs/mod-manifest).

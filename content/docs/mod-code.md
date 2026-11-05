# Hook points and helpers

Horizon's hook points are empty functions the game calls at fixed places, for native mods to hook. Beside them are helpers your code calls: the player, the frame rate, text and boxes on the HUD, chat, settings. Most live in [`native_hooks.rs`](https://github.com/horizon-rust/horizon/blob/main/crates/horizon-client/src/game/native_hooks.rs). They keep their names and parameters from release to release, and are only ever added to. There are more than 350 hook points and 100 helpers, from ticks and the HUD to block behaviour, mobs, loot tables, explosions, menus and rendering. The catalog [`native-hooks.json`](https://github.com/horizon-rust/horizon/blob/main/native-hooks.json) names them all, and [`docs/native-mods.md`](https://github.com/horizon-rust/horizon/blob/main/docs/native-mods.md) documents each one.

Your code reaches them in one of two ways:

- **Mixin helpers** (this page's worked example): one small `.rs` helper for each hook, which horizon-mixins pastes into the hook point. This works on every Horizon release.
- **The typed API** (new): one Rust crate that implements the `Hooks` trait, with one method per hook and a typed event for each. Nightlies since 2026-11-03 have it ([below](#the-typed-api)).

This page lists the hook points most mods start with, then builds a complete mod, then shows the typed API.

## Hook points

Each is a method of the game (`Game`), hooked with `HEAD` ([the bundle](/docs/mod-manifest#the-manifest)). Bind `game` to `&mut *self` (or `&*self` for the two that take `&self`) and the parameters by their names. Several mods can hook the same point: hooks that answer take an out parameter (`claimed`, `ran`, `zoom`), and a mod leaves it alone when another mod already set it.

| Hook point | When the game calls it | What you can do |
| --- | --- | --- |
| `native_frame(elapsed: Duration)` | Once a frame, in a world or not | Animate, time things |
| `native_tick()` | Once a tick (20 a second), in the window's game and, in single player, in its server's game too: check `native_window()` | Count, update state |
| `native_hud(batch, corners)` | When the HUD is drawn (not under F1) | Place a box with `corners.place(corner, w, h)` and draw it with `native_fill` and `native_text` |
| `native_key(key: &str, pressed: bool)` | A key or mouse button went down or up, by its vanilla name (`key.keyboard.z`, `key.mouse.left`). Keys come on any screen (check `native_playing()`), mouse buttons while playing | React to your keys |
| `native_wheel(steps: f32, claimed: &mut bool)` | The mouse wheel turned while playing | Set `claimed` to keep the steps from the hotbar |
| `native_command(command: &str, ran: &mut bool)` | The player typed or clicked a command, without its slash, before the server sees it | Run yours and set `ran` |
| `native_zoom(zoom: &mut Option<NativeZoom>)` | When the game sets the view's zoom (it applies while playing; the spyglass wins) | Ask for a zoom: factor, smooth, mouse turning |
| `native_minimap(minimap: &mut Option<NativeMinimap>)` | When the game draws the minimap | Ask Horizon's minimap to show: corner, size, scale, rotation, shape |
| `native_mods(mods: &mut Vec<NativeMod>)` | Options > Mods lists the native mods | Push your row: `id`, `title`, `description` and your rebindable `keys` |
| `native_settings(mod_id: &str, buttons: &mut Vec<String>)` | Your settings page opens, and again after each click | When `mod_id` is yours, push the labels of its buttons |
| `native_settings_click(mod_id: &str, button: usize)` | A button of a settings page was clicked | When it is yours, change the setting and keep it |

These are the first eleven. The rest are in [the catalog](https://github.com/horizon-rust/horizon/blob/main/docs/native-mods.md#named-hook-catalog-draft): the server's ticks, commands and players joining or leaving; placing, breaking and using blocks, their ticks and neighbour updates; block entities and their rendering; mobs spawning and dying, damage, knockback and effects; item use, tooltips and components; loot tables; explosions; menus and slots; screens, the GUI's layers and the mouse; fog, field of view, camera shake, biome colours and music; and the [item panel and recipes](#api-versions).

## Helpers

Call them on `game` from your helpers:

| Helper | What it gives or does |
| --- | --- |
| `native_on(id) -> bool` | Whether the player left your mod on in Options > Mods. Check it first in every hook: a mod turned off stays compiled in until the next build. |
| `native_playing() -> bool` | Playing, with no screen over the world. |
| `native_window() -> bool` | This game is the window's, not a server's. |
| `native_player() -> Option<NativePlayer>` | In a world: `x`, `y`, `z`, `yaw`, `pitch` and `dimension`. |
| `native_frame_rate() -> (u32, u32, u32)` | Frames in the last second, the slowest frame and the 1% low of the last 5 seconds, in frames per second. |
| `native_clicks() -> (u32, u32)` | Attack and use clicks in the last second. |
| `native_mapping(name) -> Option<(bool, String)>` | A vanilla control (`key.forward`, `key.jump`, `key.attack`…): whether it is held, and its key as Controls shows it. |
| `native_mod_key(id, name, default) -> String` | The key the player chose for your key `name` in Options > Mods, else `default` (`key.keyboard.z`). |
| `native_corner_shown(corner) -> bool` | Whether a box in that corner shows: F3's debug screen takes the top left. |
| `native_text_width(text) -> f32` | The width of a line of text, in GUI pixels. |
| `native_fill(batch, [x, y, w, h], argb)` | A rectangle on the HUD (`0x78000000` is the box behind Horizon's own HUD text). |
| `native_text(batch, text, [x, y], rgb, shadow)` | A line of text on the HUD. |
| `native_chat(text)` | A chat line only this player sees. |
| `native_setting(id, key) -> Option<String>` | One of your settings: a file in your mod's folder, `horizon-mods/.horizon-mod-data/<id>/<key>`. |
| `native_set_setting(id, key, value)` | Keeps a setting. |
| `native_data_dir(id) -> PathBuf` | That folder, for anything else your mod keeps. |

**Your own state** lives in your module: a `thread_local!` for what changes, plain constants for the rest. The window's game runs on one thread, so its hooks see the same state; the single-player server's game runs on another and sees its own.

**Paths in helpers.** Helpers are compiled inside the game, so they name your module `crate::game::<name>`, the hook points' types `crate::game::native_hooks::…`, and the HUD's `horizon_client::hud::HudBatch`, `horizon_client::extras_hud::Corners` and `horizon_client::extras::Corner`.

## API versions

Each hook point or helper Horizon adds raises the API version, `NATIVE_HOOKS_API` in `native_hooks.rs`. A mod names the version it needs (`"hooks"` in [compatibility.json](/docs/mod-manifest#compatibility-json)), and builds on any Horizon with that version or a later one. The launcher builds it on the game the player plays when that game is new enough, else on the commit the mod was tested on.

The current Nightly's version is `NATIVE_HOOKS_API` in [its `native_hooks.rs`](https://github.com/horizon-rust/horizon/blob/nightly/crates/horizon-client/src/game/native_hooks.rs) (Nightly 2026-11-04 has 359). Horizon's main branch is ahead of it, so check that the hooks you use are in the Nightly.

For example, version 2 added what a recipe viewer needs: the panel beside container screens (`native_panel_items`, `native_panel_recipes`), the hook `native_panel_event` for the player's clicks, searches and keys over it, and the game's items and recipes (`native_recipes`, `native_known_recipes`, `native_place_recipe`, `native_give`). The native port of Horizon's Recipes mod, in horizon-mods' `native/recipes`, uses them and sets `"hooks": 2`. The [catalog](https://github.com/horizon-rust/horizon/blob/main/docs/native-mods.md#mods-on-the-hook-points) says which version added each hook point.

**Hook points by name.** With horizon-mixins 0.6.0 or later, an injection can name its hook point from the catalog instead of the function: `hook = "tick"` and `hook_version = 1` in place of `target = "…::native_tick"`. The hook point can then move in Horizon's source without breaking your mod. A name the catalog lacks fails with `E_HOOK_UNKNOWN`, and the error lists the names it has.

## A worked example: Playtime

This mod counts how long you play, shows it in the top-right corner and keeps the count when you quit. `/playtime` says it in chat and `/playtime reset` starts over. Its settings page has one button, to hide the box. It hooks six points: `native_tick`, `native_hud`, `native_command`, `native_mods`, `native_settings` and `native_settings_click`.

**1. The folder.** Make the files from [the setup page](/docs/make-a-mod#the-files-of-a-native-mod): `Cargo.toml`, `compatibility.json` and `mixins/playtime/`. `Cargo.toml` makes `runtime.rs` a library, so `cargo test` runs its tests on your computer:

```toml
[package]
name = "playtime"
version = "0.1.0"
edition = "2024"
publish = false

[lib]
path = "mixins/playtime/runtime.rs"
```

**2. The mod's own code.** `mixins/playtime/runtime.rs` holds the count and turns ticks into hours and minutes. It touches nothing of the game, so it is ordinary Rust:

```rust
// Playtime: how long you have played, in a corner of the screen. This file is
// both the mod's Cargo library (its tests run with `cargo test`) and the module
// the bundle adds to the game as crate::game::playtime.
use std::cell::Cell;

pub const ID: &str = "playtime";
pub const VERSION: &str = "0.1.0";

thread_local! {
    // Ticks played; None until the saved count is read.
    static TICKS: Cell<Option<u64>> = const { Cell::new(None) };
}

/// Ticks played: the saved count (`saved` reads it) the first time, then the
/// running one.
pub fn ticks(saved: impl FnOnce() -> Option<String>) -> u64 {
    TICKS.with(|t| {
        let n = t.get().unwrap_or_else(|| saved().and_then(|s| s.parse().ok()).unwrap_or(0));
        t.set(Some(n));
        n
    })
}

pub fn set_ticks(n: u64) {
    TICKS.with(|t| t.set(Some(n)));
}

/// `1h 05m` from a number of ticks (20 a second).
pub fn format(ticks: u64) -> String {
    let minutes = ticks / 20 / 60;
    format!("{}h {:02}m", minutes / 60, minutes % 60)
}

#[cfg(test)]
mod tests {
    #[test]
    fn formats_hours_and_minutes() {
        assert_eq!(super::format(0), "0h 00m");
        assert_eq!(super::format(20 * 60 * 65), "1h 05m");
    }
}
```

**3. Count the ticks.** `tick.rs` adds one tick in the window's game, while in a world, and saves the count once a minute:

```rust
// Counts the ticks played in a world, and saves the count once a minute.
fn playtime_tick(game: &mut crate::game::Game<'_>) {
    use crate::game::playtime as m;
    // Only the window's game counts: in single player the server thread ticks too.
    if !game.native_on(m::ID) || !game.native_window() || game.native_player().is_none() {
        return;
    }
    let ticks = m::ticks(|| game.native_setting(m::ID, "ticks")) + 1;
    m::set_ticks(ticks);
    if ticks % (20 * 60) == 0 {
        game.native_set_setting(m::ID, "ticks", &ticks.to_string());
    }
}
```

**4. Draw the box.** `hud.rs` asks `corners` for a place in the top-right corner, under any other mod's box there, and draws:

```rust
// "Played 1h 05m" in a box in the top right corner, under the other mods' boxes.
fn playtime_hud(
    game: &mut crate::game::Game<'_>,
    batch: &mut horizon_client::hud::HudBatch,
    corners: &mut horizon_client::extras_hud::Corners,
) {
    use crate::game::playtime as m;
    use horizon_client::extras::Corner;
    let shown = game.native_setting(m::ID, "shown").as_deref() != Some("false");
    if !game.native_on(m::ID) || !shown || game.native_player().is_none() {
        return;
    }
    let text = format!("Played {}", m::format(m::ticks(|| game.native_setting(m::ID, "ticks"))));
    let w = game.native_text_width(&text) + 4.0;
    let (x, y) = corners.place(Corner::TopRight, w, 12.0);
    game.native_fill(batch, [x, y, w, 12.0], 0x7800_0000);
    game.native_text(batch, &text, [x + 2.0, y + 2.0], 0xFFFF55, true);
}
```

**5. The command.** `command.rs` takes `/playtime` and leaves every other command alone:

```rust
// /playtime says it in chat; /playtime reset starts over.
fn playtime_command(game: &mut crate::game::Game<'_>, command: &str, ran: &mut bool) {
    use crate::game::playtime as m;
    let Some(args) = command.strip_prefix("playtime") else {
        return;
    };
    if !game.native_on(m::ID) || !(args.is_empty() || args.starts_with(' ')) {
        return;
    }
    *ran = true;
    match args.trim() {
        "" => {
            let ticks = m::ticks(|| game.native_setting(m::ID, "ticks"));
            game.native_chat(&format!("You have played {}", m::format(ticks)));
        }
        "reset" => {
            m::set_ticks(0);
            game.native_set_setting(m::ID, "ticks", "0");
            game.native_chat("Playtime reset");
        }
        other => game.native_chat(&format!("Unknown option {other}: use /playtime or /playtime reset")),
    }
}
```

**6. Its row and its settings page.** `list.rs` puts the mod in Options > Mods; `settings.rs` and `click.rs` make its page, with one button:

```rust
// The mod's row in Options > Mods.
fn playtime_listed(mods: &mut Vec<crate::game::native_hooks::NativeMod>) {
    use crate::game::playtime as m;
    mods.push(crate::game::native_hooks::NativeMod {
        id: m::ID.into(),
        title: format!("Playtime {}", m::VERSION),
        description: "How long you have played, in a corner of the screen.".into(),
        keys: Vec::new(),
    });
}
```

```rust
// The mod's settings page: one button.
fn playtime_page(game: &mut crate::game::Game<'_>, mod_id: &str, buttons: &mut Vec<String>) {
    use crate::game::playtime as m;
    if mod_id != m::ID {
        return;
    }
    let shown = game.native_setting(m::ID, "shown").as_deref() != Some("false");
    buttons.push(format!("Shown: {}", if shown { "ON" } else { "OFF" }));
}
```

```rust
// A click on the settings page's button: show or hide the box, and keep it.
fn playtime_click(game: &mut crate::game::Game<'_>, mod_id: &str, button: usize) {
    use crate::game::playtime as m;
    if mod_id != m::ID || button != 0 {
        return;
    }
    let shown = game.native_setting(m::ID, "shown").as_deref() != Some("false");
    game.native_set_setting(m::ID, "shown", if shown { "false" } else { "true" });
}
```

A mod with keys lists them in its row (`keys: vec![["zoom".into(), "Zoom key".into(), "key.keyboard.z".into()]]`: the name, the label and the default), and the player rebinds them on its page; `native_mod_key` reads the choice.

**7. The manifest.** `mixins/playtime/horizon-mixin.toml` has the `[mod]`, `[compatibility]` and `[[module]]` parts from [the bundle](/docs/mod-manifest#the-manifest), and one `[[injection]]` for each helper. The bindings of the six:

```toml
[[injection]]
id = "tick"
kind = "HEAD"
target = "horizon_client::game::native_hooks::Game<'_>::native_tick"
helper = "tick.rs"
bindings = [
  { name = "game", ty = "&mut crate::game::Game<'_>", value = "&mut *self" },
]

[[injection]]
id = "hud"
kind = "HEAD"
target = "horizon_client::game::native_hooks::Game<'_>::native_hud"
helper = "hud.rs"
bindings = [
  { name = "game", ty = "&mut crate::game::Game<'_>", value = "&mut *self" },
  { name = "batch", ty = "&mut horizon_client::hud::HudBatch", value = "&mut *batch" },
  { name = "corners", ty = "&mut horizon_client::extras_hud::Corners", value = "&mut *corners" },
]

[[injection]]
id = "command"
kind = "HEAD"
target = "horizon_client::game::native_hooks::Game<'_>::native_command"
helper = "command.rs"
bindings = [
  { name = "game", ty = "&mut crate::game::Game<'_>", value = "&mut *self" },
  { name = "command", ty = "&str", value = "command" },
  { name = "ran", ty = "&mut bool", value = "&mut *ran" },
]

[[injection]]
id = "list"
kind = "HEAD"
target = "horizon_client::game::native_hooks::Game<'_>::native_mods"
helper = "list.rs"
bindings = [
  { name = "mods", ty = "&mut Vec<crate::game::native_hooks::NativeMod>", value = "&mut *mods" },
]

[[injection]]
id = "settings"
kind = "HEAD"
target = "horizon_client::game::native_hooks::Game<'_>::native_settings"
helper = "settings.rs"
bindings = [
  { name = "game", ty = "&mut crate::game::Game<'_>", value = "&mut *self" },
  { name = "mod_id", ty = "&str", value = "mod_id" },
  { name = "buttons", ty = "&mut Vec<String>", value = "&mut *buttons" },
]

[[injection]]
id = "click"
kind = "HEAD"
target = "horizon_client::game::native_hooks::Game<'_>::native_settings_click"
helper = "click.rs"
bindings = [
  { name = "game", ty = "&mut crate::game::Game<'_>", value = "&mut *self" },
  { name = "mod_id", ty = "&str", value = "mod_id" },
  { name = "button", ty = "usize", value = "button" },
]
```

**8. Try it.** `cargo test` runs the unit test. `native.py check /path/to/playtime` compiles it into the game, and `horizon-launcher native-build` builds a game you play ([how](/docs/make-a-mod#see-it-in-the-game)). Open a world: "Played 0h 00m" sits in the top-right corner and goes up each minute. Type `/playtime`, then hide the box from Options > Mods > Playtime > Settings. Quit and come back: the count goes on from where it was.

**Where to go from here.** Horizon's own mods are complete native mods to read, in [horizon-mods' `native/`](https://github.com/horizon-rust/horizon-mods/tree/main/native): FPS Counter (a HUD box and its settings), Keystrokes (keys and controls), Zoom (a key, the wheel and `native_zoom`) and Minimap.

## The typed API

The typed API is the second way to write a native mod. Instead of one helper for each hook, the mod is one Rust crate that implements the trait `horizon_client::mod_api::Hooks`. Every hook point in the catalog is a method of that trait, with a default body that does nothing, so you write only the ones you need. Each method gets an event, a struct named after the hook (`TickEvent`, `HudEvent`, `LivingIncomingDamageEvent`), and the game's `Host` where the hook has one.

**Where it works.** Nightlies since 2026-11-03 have the typed API; earlier ones don't. Building a typed mod takes launcher 0.2.37 or later. Pin your mod to the Nightly you tested it on (`horizon_revision` below).

### A typed mod: Soft pigs

This mod makes pigs take half damage. Its folder:

```
softpigs/
└── mixins/softpigs/
    ├── horizon-mixin.toml      the manifest: its id, its version, where its crate is
    └── engine/                 the mod's crate
        ├── Cargo.toml
        └── src/lib.rs
```

`horizon-mixin.toml` names the crate with `[api]`. A bundle with only `[api]` (no injections or modules) skips horizon-mixins:

```toml
[mod]
id = "softpigs"
version = "0.1.0"

# The commit of the Nightly the mod was tested on (here Nightly 2026-11-04).
[compatibility]
horizon_revision = "6475f62f3c834b7489e1816bf47f47ea5eb2b879"

[api]
path = "engine"
```

`engine/Cargo.toml` depends on `horizon-client`. When the launcher builds the mod, it points that dependency at the source it builds, so the git dependency here serves only your own `cargo test`. The crate may use only crates that are in Horizon's `Cargo.lock`, in the versions there:

```toml
[package]
name = "softpigs"
version = "0.1.0"
edition = "2024"
publish = false

[dependencies]
horizon-client = { git = "https://github.com/horizon-rust/horizon", rev = "6475f62f3c834b7489e1816bf47f47ea5eb2b879" }
```

`engine/src/lib.rs` implements one hook and exports `hooks()`, which the launcher calls:

```rust
//! Soft pigs: pigs take half damage.
use horizon_client::mod_api::{Flow, Hooks, LivingIncomingDamageEvent};

pub struct SoftPigs;

impl Hooks for SoftPigs {
    fn living_incoming_damage(&self, event: &mut LivingIncomingDamageEvent<'_>) -> Flow {
        if event.kind == "minecraft:pig" {
            event.amount *= 0.5;
        }
        Flow::Continue
    }
}

/// What the launcher calls: this mod's hooks.
pub fn hooks() -> Box<dyn Hooks> {
    Box::new(SoftPigs)
}

#[cfg(test)]
mod tests {
    use horizon_client::mod_api::dispatch_living_incoming_damage;

    fn hurt(kind: &str, amount: f32) -> f32 {
        let mods = [super::hooks()];
        let (mut amount, mut canceled) = (amount, false);
        dispatch_living_incoming_damage(&mods, 1, kind, "minecraft:generic", -1, -1, &mut amount, &mut canceled);
        amount
    }

    #[test]
    fn pigs_take_half_damage() {
        assert_eq!(hurt("minecraft:pig", 4.0), 2.0);
        assert_eq!(hurt("minecraft:cow", 4.0), 4.0);
    }
}
```

`cargo test` in `engine/` compiles Horizon once, which takes a few minutes. On Linux it needs the same ALSA and libudev development files as the launcher's builds. Copy Horizon's `Cargo.lock` into `engine/` so your tests use the game's crate versions. Then build the game with the mod:

```sh
horizon-launcher native-build /path/to/softpigs/mixins/softpigs --trust-native-code
```

The launcher generates a game executable that links your crate and passes its `hooks()` to the game.

### Events and what a hook returns

- **Events** are `#[non_exhaustive]`: you read and change their fields, but you can't build one. That lets a later Horizon add a field without breaking your mod. A number or `bool` you may change is a plain field (`event.amount`), written back once every mod has run. Anything else you may change, such as a list or a game struct, is a `&mut` field (`event.batch` and `event.corners` in `HudEvent`).
- **What a hook returns**: hooks that can cancel return `Flow::Continue` or `Flow::Cancel`, and the first `Cancel` stops the other mods. Hooks that replace a value (`zoom`, `minimap`) return an `Option`, and the first `Some` wins. Hooks that collect (`mods`, `settings`) give every mod the same list to push to.
- **Order**: mixin injections run first, then typed mods. Typed mods run after the mods they depend on, otherwise in bundle order.
- **State**: hook methods take `&self`, and the type must be `Send + Sync`. One instance serves both the window's game and the single-player server's game, and a hook can fire inside another (`set_block` fires `block_changed`). Keep state in atomics or a `Mutex`, not in a `thread_local!`.

The signatures look like this:

```rust
fn tick(&self, host: &mut dyn Host, event: &mut TickEvent)
fn hud(&self, host: &mut dyn Host, event: &mut HudEvent<'_>)
fn command(&self, host: &mut dyn Host, event: &mut CommandEvent<'_>) -> Flow
fn living_incoming_damage(&self, event: &mut LivingIncomingDamageEvent<'_>) -> Flow
```

### The host

`Host` offers the helpers listed in the catalog, without their `native_` prefix: `host.on(id)`, `host.setting(id, key)`, `host.set_setting(id, key, value)`, `host.text(…)`, `host.fill(…)`, `host.mod_key(…)`, and on the server `host.feedback(line)`, `host.tell(uuid, line)`, `host.set_block(…)` and many more. Some helpers aren't on `Host` yet, among them `player`, `chat`, `playing`, `window`, `text_width` and `frame_rate`. A mod that needs them can keep a mixin helper for that hook: one bundle can have both.

Block hooks (`random_tick`, `tick_block`, `perform_bonemeal`…) get a level host instead. `LevelHost` reads block states. `LevelRandomHost` gives vanilla's level random, so your draws come in vanilla's order. `LevelTicksHost` schedules block and fluid ticks. `LevelWriteHost` sets block properties, plays sounds and sends particles.

### More of the typed API

- **Rendering**: implement `RenderHooks` and return it from `Hooks::render`. `render_needs` asks for what the frame should prepare. `world_drawn` runs after the world is drawn and can draw before the hand and the HUD.
- **Saved data on game objects**: an `AttachmentType<T>` keeps a value on a level, a chunk, a block entity, an entity or a player, saved with the world when you give it a codec. It lives on the server only, and clients don't receive it.
- **Mods that use other mods**: `[dependencies]` in `horizon-mixin.toml` (`base_mod = "^1"`) lets your crate call another typed mod's public functions as `base_mod::…`. Optional dependencies get a Cargo feature named after the mod.
- **Your own hook into the game**: an `[[injection]]` with `trait_method = "points"` instead of `helper` adds the method `inject_<mod id>_points` to the trait, with its own event. It hooks a function of the game, not a hook point, so the mod pins its commit.
- **Tests**: every hook has a `dispatch_<hook>` function that builds the event as the game does. Every `Host` method panics with its name unless you implement it, so a test host implements only what the hook calls.

[`docs/native-mods.md`](https://github.com/horizon-rust/horizon/blob/main/docs/native-mods.md#trait-mods-draft) has the details of each.

**Not yet.** horizon-mods' `native.py` doesn't know `[api]` yet: `check` and `build` don't handle it, and `package` leaves the crate's folder out of the `.hnmod`. Build typed mods with `horizon-launcher native-build`, and use mixin helpers for a mod you want in the registry today.

Next: [content mods](/docs/content-mods), or straight to [testing](/docs/test-a-mod).

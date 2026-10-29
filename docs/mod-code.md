# Hook points and helpers

Horizon's hook points are empty functions the game calls at fixed places, for native mods to hook. Beside them are helpers your code calls: the player, the frame rate, text and boxes on the HUD, chat, settings. Both live in [`native_hooks.rs`](https://github.com/horizon-rust/horizon/blob/main/crates/horizon-client/src/game/native_hooks.rs), keep their names and parameters from release to release, and are only ever added to. This page lists them, then builds a complete mod.

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

Version 2 of the hook points adds one more, for the [item panel and recipes](#the-item-panel-and-recipes-version-2).

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

## The item panel and recipes (version 2)

Hook points version 2, in the current Nightly, add what a recipe viewer needs: the panel beside container screens (`native_panel_items`, `native_panel_recipes`), the hook `native_panel_event` for the player's clicks, searches and keys over it, and the game's items and recipes (`native_recipes`, `native_known_recipes`, `native_place_recipe`, `native_give`). The native port of Horizon's Recipes mod, in horizon-mods' `native/recipes`, uses them. A mod that uses them sets `"hooks": 2`, and builds only on a Horizon that has them: the launcher builds it on the game the player plays when that game has them, else on the commit the mod was tested on.

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

Next: [content mods](/docs/content-mods), or straight to [testing](/docs/test-a-mod).

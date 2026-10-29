# The bundle

A native mod is a bundle for [horizon-mixins](https://github.com/horizon-rust/horizon-mixins): the manifest `horizon-mixin.toml`, the mod's own code, and one small helper for each place it hooks. This page explains the manifest, what Horizon a mod builds on, and the `.hnmod` file players install. Content mods have a different manifest, on [their own page](/docs/content-mods).

## The manifest

Playtime's `mixins/playtime/horizon-mixin.toml`, shortened to two hooks:

```toml
[mod]
id = "playtime"
version = "0.1.0"
priority = 100

# The commit it was tested on.
[compatibility]
horizon_revision = "6f8c7a0e5d531d3834c4d0be4659a1db8e7e5c2a"

# runtime.rs becomes the module crate::game::playtime.
[[module]]
id = "runtime"
file = "crates/horizon-client/src/game.rs"
name = "playtime"
source = "runtime.rs"

[[injection]]
id = "tick"
kind = "HEAD"
target = "horizon_client::game::native_hooks::Game<'_>::native_tick"
helper = "tick.rs"
bindings = [
  { name = "game", ty = "&mut crate::game::Game<'_>", value = "&mut *self" },
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
```

| Part | What it is |
| --- | --- |
| `[mod] id` | The mod's id: `a-z`, `0-9` and `_`. It names its row in Options > Mods, its settings folder and its keys. Keep it once you have published the mod. |
| `[mod] version` | Your mod's version, such as `0.1.0`. Each version you publish needs a new one. |
| `[mod] priority` | Orders the mods that hook the same function ([horizon-mixins' README](https://github.com/horizon-rust/horizon-mixins) has the rules). `100`, as Horizon's own mods, unless you need another. |
| `[compatibility] horizon_revision` | The Horizon commit the mod was made and tested on ([below](#hook-points-or-a-pinned-commit)). |
| `[[module]]` | A file of yours added to the game as a module: `source` becomes `crate::game::<name>`. Your state, your logic and your tests go there. |
| `[[injection]]` | One hook: `target` is the function, `kind` where in it your code runs (`HEAD`: first), `helper` the file with your code, and `bindings` what it receives. |

**Helpers.** A helper file holds one function, whose parameters are the bindings in order. Keep it short: read what the hook gives, call into your module, and write back what the hook asks for. Playtime's `command.rs`:

```rust
// /playtime says it in chat; /playtime reset starts over.
fn playtime_command(game: &mut crate::game::Game<'_>, command: &str, ran: &mut bool) {
    use crate::game::playtime as m;
    let Some(args) = command.strip_prefix("playtime") else {
        return;
    };
    ...
}
```

A binding's `value` is an expression in the hooked function: `&mut *self` for the game, a parameter by its name. Module and helper files can't use inner attributes or `//!` comments, other files through `mod` or `include!`: use ordinary comments and inline modules. horizon-mixins refuses a bundle that breaks a rule, with the reason in one line.

`HEAD` is enough for the hook points. horizon-mixins has other kinds (`RETURN`, `BEFORE_CALL`, `MODIFY_ARG`, `OVERWRITE` and more) for hooking the game's own functions; [its README](https://github.com/horizon-rust/horizon-mixins) lists them all.

## Hook points or a pinned commit

Horizon changes every day, and a hook names a function of its source. What a mod builds on depends on what it hooks:

- **Only Horizon's hook points** (`native_tick`, `native_hud` and the others in [hook points and helpers](/docs/mod-code)). These keep their names and parameters from release to release, and new ones are only ever added. Each addition raises the hook points' version. Your mod names the version it needs, and the launcher builds it on the game the player plays, as long as that game has at least that version. **This is the way to make a mod**: it keeps working on new Nightlies without a new release.
- **The game's own functions**, such as `Game::break_block`. Those can change in any Nightly, so the mod builds only on the commit it pins in `horizon_revision`, a Nightly's. Every Nightly's commit is kept, so a pinned mod still builds after its Nightly is replaced, but the player plays that Nightly's game with it, and all the pinned mods of one build must pin the same commit. The launcher says which mod pins which when they don't.

## compatibility.json

`native.py` reads the mod's facts from `compatibility.json`, beside the `mixins/` folder:

```json
{
  "game": "26.3",
  "hooks": 1,
  "horizon_repository": "https://github.com/horizon-rust/horizon",
  "horizon_revision": "6f8c7a0e5d531d3834c4d0be4659a1db8e7e5c2a",
  "horizon_mixins_repository": "https://github.com/horizon-rust/horizon-mixins",
  "horizon_mixins_revision": "0d6b103c70633d8fd9443d8d0acd3aadaacedb06"
}
```

| Key | What it is |
| --- | --- |
| `game` | The Minecraft version: `26.3`. |
| `hooks` | The hook points' version the mod needs. Version 1 is in the current Nightly; [version 2](/docs/mod-code#the-item-panel-and-recipes-version-2) is merged on main but not in a Nightly yet, so a mod that needs it builds only once a Nightly has it. |
| `horizon_revision` | The commit the mod was tested on: the same as in `horizon-mixin.toml`. Take a Nightly's ([Releases](/releases)). |
| `horizon_mixins_revision` | The horizon-mixins the mod was made with. Use the one Horizon's own mods use, in [horizon-mods' `native/`](https://github.com/horizon-rust/horizon-mods/tree/main/native). |

## The .hnmod file

What players install, and what you submit to the registry, is one `.hnmod` file: a zip holding `horizon-native.json` (the id, the version, the game, the commits and the hook points' version) and your bundle's `.rs` and `.toml` files, nothing else. The `.hnmod` *is* the source: the launcher compiles it on the player's computer, and a reviewer reads all of it before the registry lists it. `native.py package` makes it ([Publish](/docs/publish-a-mod)).

## What a native mod can do

Anything Rust can. A native mod is compiled into the game, so it isn't held to a list of permissions and nothing stops it from reading files or using the network. That is why players build native mods only after a warning, why the registry reviews every line, and why the launcher runs them in an instance of their own, with its own worlds and options. Keep your mod to what its page says it does.

Next: [hook points and helpers](/docs/mod-code).

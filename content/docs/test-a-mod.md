# Test a mod

A few checks catch most mistakes before players see them. For a native mod: unit tests for your own logic, a check against Horizon's source, and the game with your mod built in. For a content mod: the game with your mod as a dev mod. Both end with `cargo horizon-mod check`, which runs the registry's own checks.

## Native mods

### Unit tests for your logic

Code that doesn't call the game (formatting, maths, parsing a command's arguments) is ordinary Rust in your module. Keep it there, keep the helpers thin, and test it with `#[test]`, as [Playtime](/docs/mod-code#a-worked-example-playtime) does with its `format` function. The mod's `Cargo.toml` makes the module a library, so the tests run on your computer, with no game:

```sh
cargo test
```

### Check it against Horizon

From your clone of [horizon-mods](https://github.com/horizon-rust/horizon-mods):

```sh
python3 native/tools/native.py check /path/to/playtime
python3 native/tools/native.py check /path/to/playtime --horizon latest
```

`check` downloads Horizon's source at the commit in your `compatibility.json`, applies your bundle with horizon-mixins and runs `cargo check` on the game, with warnings as errors. It fails when the source has fewer hook points than your mod needs, when horizon-mixins refuses the bundle (a wrong target or binding, with the reason in one line), and on any Rust error in your code. `--horizon latest` does the same on the newest Nightly, and `--horizon <commit>` on any commit: run it when a Nightly comes out, to know your mod still builds before players find out.

Several mods at once, as a player's set is built:

```sh
python3 native/tools/native.py check /path/to/playtime zoom fps-overlay
```

### In the game

```sh
python3 native/tools/native.py build /path/to/playtime
```

builds the game with your mod (Horizon's `fast` profile) and prints where it is. Start it with `--resources` pointing at prepared game files: each version the launcher installed has them in its `.local/horizon-client/26.3` folder. Or build with the launcher, as players do, and play the **Native mods** instance:

```sh
horizon-launcher native-build /path/to/playtime/mixins/playtime --trust-native-code
```

Things to try each time:

- **Options > Mods**: your row, its switch and its settings page. Turn the mod off: it must do nothing until it is on again.
- Every command, with no arguments, with good ones and with wrong ones.
- The title screen and a world, single player and a server: `native_player()` is `None` outside a world, and in single player the server's game ticks too.
- Quitting and starting again, for a mod that keeps settings.
- F1 (no HUD) and F3 (the debug screen takes the top-left corner).

A native mod runs inside the game, so a panic in your code stops the game. Use `Option` and `Result` for what can go wrong, as the helpers do.

## Content mods

Start the game with your mod as a dev mod ([how](/docs/content-mods#try-it-and-share-it)) and read the log (`logs/latest.log` in the game folder): a file the game can't read is logged and skipped. After each change to the files, start the game again. Things to try:

- Each block: place it, mine it with and without the right tool, and look at what it drops.
- Each recipe in a crafting table or furnace, and in the recipe book.
- The names and textures, in the inventory and in the world.

## Check it as the registry does

Before you publish, run what the registry runs on every submission, on the file you will submit:

```sh
cargo horizon-mod check target/horizon-mod/ruby.hmod
cargo horizon-mod check native/target/playtime-0.1.0.hnmod
```

It reads the file's manifest and checks its contents: a content mod's files as the game will read them, a native mod's bundle without running anything. It also checks modpacks (`.hpack`) and resource packs (`.zip`).

- `--json` prints the report as JSON, for scripts.
- `--key <public key> --signature <file>.minisig` also checks your signature ([Publish](/docs/publish-a-mod#sign-it)).

A file that passes `check` passes the registry's automatic checks. A person still reviews it, and for a native mod reads all of its code ([Publish](/docs/publish-a-mod)).

Next: [publish it](/docs/publish-a-mod).

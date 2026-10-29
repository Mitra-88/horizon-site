# Publish a mod

Horizon's registry lists content mods, native mods, modpacks and resource packs made for Horizon. Players find them at [playhorizon.dev/mods](/mods) and on the launcher's Mods page, which checks every file before it installs it. Each project is reviewed by a person before it is published. This page takes your mod from a file on your computer to the registry.

## Before you submit

1. **Choose a version.** Set `version` in the manifest (`horizon-mod.toml` for a content mod, `horizon-mixin.toml` for a native mod), such as `1.0.0`. Every version you publish needs a new one, and a published file never changes.
2. **Make the file.** A content mod: `cargo horizon-mod build` writes `target/horizon-mod/<id>.hmod`. A native mod: [package it](#package-a-native-mod). That file is what you submit.
3. **Check it.** `cargo horizon-mod check <file>` must pass ([Test a mod](/docs/test-a-mod#check-it-as-the-registry-does)).
4. **Publish the source.** Put the mod's source in a public repository, under a licence that lets players use it (MIT, Apache-2.0, GPL and so on, as an [SPDX](https://spdx.org/licenses/) name). Reviewers read it, and the file must be made from it.

## Package a native mod

From your clone of [horizon-mods](https://github.com/horizon-rust/horizon-mods):

```sh
python3 native/tools/native.py check /path/to/playtime
python3 native/tools/native.py package /path/to/playtime
```

`package` writes `native/target/<id>-<version>.hnmod` and prints its size and SHA-256. It holds `horizon-native.json`, made from your `compatibility.json`, and your bundle's `.rs` and `.toml` files. `horizon-mixin.toml` and `compatibility.json` must name the same Horizon commit: `package` refuses the mod when they don't. The same files always give the same `.hnmod`, so anyone can make it again from your source and compare.

Before you submit a native mod, build it on the Horizon players play: `native.py check --horizon latest` for the newest Nightly ([Test a mod](/docs/test-a-mod#check-it-against-horizon)).

## Sign it

Signing is optional and recommended. When your project has a public key, every later version must be signed with the matching secret key, so nobody else can publish an update in your name, even with access to your GitHub account.

Horizon uses [minisign](https://jedisct1.github.io/minisign/) signatures. Install minisign (`brew install minisign`, `scoop install minisign`, or your Linux distribution's package), then make a key pair once:

```sh
minisign -G -p horizon-mods.pub -s horizon-mods.key
```

Keep `horizon-mods.key` and its password private and backed up: losing it means changing the project's key by hand, through the registry's maintainers. The public key is the last line of `horizon-mods.pub` (it starts with `RW`).

Sign each file you publish, and check the signature as the registry will:

```sh
minisign -S -s horizon-mods.key -m native/target/playtime-0.1.0.hnmod
cargo horizon-mod check native/target/playtime-0.1.0.hnmod --key "RW…your public key…" --signature native/target/playtime-0.1.0.hnmod.minisig
```

The report then says "signature verified".

## Submit it

Open [playhorizon.dev/mods/submit](/mods/submit) and sign in with GitHub. The page reads only your public profile. Then fill in:

- **The file**: the kind (mod or native mod), the `.hmod` or `.hnmod`, its id (the manifest's `id`), its version, the Minecraft version (26.3) and what changed.
- **Its page**: the name, a one-line summary for the list, a description (Markdown), the authors, the licence, the source address and, optionally, a square PNG icon (at most 256 KiB).
- **Signature**: your public key (for a new project) and the file's `.minisig`.

**Submit for review** checks the file again and opens a pull request in [horizon-rust/horizon-mods](https://github.com/horizon-rust/horizon-mods). It adds `mods/<id>.toml`, with you as the project's owner. The repository's checks run `cargo horizon-mod check` on the file again and post their report on the pull request.

## Review and publication

A reviewer reads the pull request, your source and the checks' report. For a native mod, the `.hnmod` is the source: a maintainer reads every line of it, since it runs with the player's rights, and its description should say what it does and what it doesn't. Questions and requests for changes come as comments on the pull request: answer them there, and submit a new version from the form when the file must change.

When the reviewer merges it, the file becomes a release of horizon-mods within minutes, and the project gets its page at `playhorizon.dev/mods/<id>` and shows in the launcher. The page shows your source, licence and the file's SHA-256; a native mod's page says it is code the launcher compiles, with no sandbox. Players install a native mod from the launcher's Mods page, and the launcher compiles the game with it after a warning that names it.

## Updates

An update is the same form with a new version: it adds the version to your project's entry. The project's owners publish updates of a content mod without a reviewer's extra look; every version of a native mod is read again. If the project has a key, the new file must be signed with it.

Without the form, you can open the pull request by hand: the [horizon-mods README](https://github.com/horizon-rust/horizon-mods) says how. The registry's file formats are in [the mod index reference](/docs/api/mod-index).

## Reports and takedowns

Anyone can report a project from its page (**Report it**). A project that does harm is taken down: the launcher then refuses its files and turns installed copies off, telling players why.

# Install and first launch

Download the launcher, let it install Horizon, then prepare the game from your own copy of Minecraft. It takes a few minutes, and you do the preparation once.

## What you need

- **Minecraft: Java Edition 26.3, played once.** Install it with the official Minecraft launcher (or Prism Launcher, MultiMC, the Modrinth App, ATLauncher or GDLauncher) and start 26.3 once, so it downloads its files. Horizon reads them from there and never copies them anywhere else.
- **Java 25, a JDK**, for the one-time preparation only (the game itself needs no Java). Nothing to install: the launcher uses the Java the Minecraft launcher downloaded for 26.3, or downloads that same Java from Mojang. A JDK you installed yourself (for example [Eclipse Temurin 25](https://adoptium.net/temurin/releases/?version=25)) works too.
- **A computer on the [supported list](/docs/#supported-systems).** On Linux and Windows that means a graphics card with Vulkan (or DirectX 12 on Windows).

## Download the launcher

Get the newest launcher from the [Download button on the home page](/), which picks the right file for your system, or from [the launcher releases on GitHub](https://github.com/horizon-rust/horizon/releases?q=launcher-v&expanded=true).

- **Linux:** download `horizon-launcher-linux-x86_64.tar.gz`, extract it and run `horizon-launcher`.
- **macOS:** download `horizon-launcher-macos-arm64.dmg`, open it and drag Horizon onto Applications. The first time, macOS says it cannot check the app, because it is not signed with a paid Apple developer account. On macOS 14 and earlier, right-click Horizon, choose **Open**, then **Open** again. On macOS 15 and later, open it once, then go to **System Settings, Privacy & Security** and choose **Open Anyway**. After that it opens normally.
- **Windows:** download `horizon-launcher-windows-x64.zip`, extract it and run `horizon-launcher.exe`.

Every release also carries `SHA256SUMS` and a signature, `SHA256SUMS.sig`, if you want to check your download. The launcher does not check that signature for you yet.

## First launch

1. Open the launcher. On the **Play** page, if it says "No version installed yet", choose **Choose a version**. On the **Versions** page, install the newest one. The launcher installs it in its own folder.
2. Back on **Play**, the launcher says "Not prepared. Horizon needs the files of your own Minecraft 26.3." Choose **Prepare**. It finds your Minecraft folder by itself in the usual places. If it cannot, it lists where it looked, and **Choose…** next to the Minecraft folder lets you point it at yours.
3. Wait a few minutes. When it says "Prepared for Minecraft 26.3", choose **Play**.

The game opens on vanilla's title screen. Your worlds, options and logs live in the game folder, which is not inside a version's folder, so updating or removing a version never touches them:

- Linux: `~/.local/share/horizon`
- macOS: `~/Library/Application Support/horizon`
- Windows: `%APPDATA%\horizon`

> **No Microsoft sign-in yet.** The launcher's Settings page has an Accounts section, but signing in with a Microsoft account does not work for players today. It needs an app registration and an approval from Mojang that the project does not have yet. You do not need an account to play single player.

## Updating

- **Horizon.** The launcher looks for a new Nightly when it starts and every 30 minutes while it is open. With **Install new versions automatically** on (the default), it installs it and moves you to it if you were on the newest version. Your worlds stay where they are. New Nightlies come out a few times a day; an older Nightly is removed once nothing plays it, and versions you installed by hand stay until you remove them on the **Versions** page.
- **The launcher.** It updates itself from its own releases, then shows **Restart** in its footer. A launcher from before 0.2 (0.16 or older) updates twice in a row: first to 0.17, then to 0.2. Then it installs Horizon 0.2 like any update.

## One version for everyone: the Nightly

Horizon ships one build, the **Nightly**: the latest Horizon, plus a few changes the Team picked to try before they are merged. Before a Nightly goes out, the game has to start and draw a world on our test machine, and nothing goes out while a serious problem is open. The game shows which Nightly you play ("Nightly 2026-10-28 · 9b772b2"): give that when you report a bug. You can install an earlier one (the last week's) or an older numbered release by hand on the **Versions** page.

Launchers from before this change still show a **Nightly builds** setting, or an **Updates** choice. The launcher updates itself, and from then on it plays the Nightly for everyone; the setting goes away.

## The Versions page

It lists Horizon's builds, newest first: the current Nightly, the last week's, then the numbered releases from before. You can install a version, remove it, or choose which one **Play** starts. Each release's notes are on the **Patch notes** page, and on [GitHub](https://github.com/horizon-rust/horizon/releases).

## Something went wrong

See [Logs, crashes and bug reports](/docs/troubleshooting).

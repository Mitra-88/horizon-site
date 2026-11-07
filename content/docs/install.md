# Install and first launch

Download the launcher, let it install Horizon, then prepare the game from your own copy of Minecraft. It takes a few minutes, and you do the preparation once.

## What you need

- **A Microsoft account that owns Minecraft: Java Edition.** Like other launchers, Horizon's launcher plays only while such an account is signed in.
- **Minecraft: Java Edition 26.3, played once.** Install it with the official Minecraft launcher (or Prism Launcher, MultiMC, the Modrinth App, ATLauncher or GDLauncher) and start 26.3 once, so it downloads its files. Horizon reads them from there and never copies them anywhere else.
- **Java 25, a JDK**, for the one-time preparation only (the game itself needs no Java). Nothing to install: the launcher uses the Java the Minecraft launcher downloaded for 26.3, or downloads that same Java from Mojang. A JDK you installed yourself (for example [Eclipse Temurin 25](https://adoptium.net/temurin/releases/?version=25)) works too.
- **A computer on the [supported list](/docs/#supported-systems).** On Linux and Windows that means a graphics card with Vulkan (or DirectX 12 on Windows).

## Download the launcher

Get the newest launcher from the [Download button on the home page](/), which picks the right file for your system, or from [the launcher releases on GitHub](https://github.com/horizon-rust/horizon/releases?q=launcher&expanded=true).

- **Linux:** download `horizon-launcher-linux-x86_64.tar.gz`, extract it and run `horizon-launcher`.
- **macOS:** download `horizon-launcher-macos-arm64.dmg` for Apple Silicon (M1 or newer), or `horizon-launcher-macos-x64.dmg` for an Intel Mac (Apple menu, **About This Mac**: "Chip" means Apple Silicon, "Processor" Intel). Open it and drag Horizon onto Applications, then open it from Applications, not from the disk image. The first time, macOS says it cannot check the app, because it is not signed with a paid Apple developer account. On macOS 14 and earlier, right-click Horizon, choose **Open**, then **Open** again. On macOS 15 and later, open it once, then go to **System Settings, Privacy & Security** and choose **Open Anyway**. After that it opens normally.
- **Windows:** download `horizon-launcher-setup.exe` and run it (on a Windows on ARM PC, such as a Snapdragon laptop, `horizon-launcher-setup-arm64.exe` runs natively; the x64 one works there too). It installs the launcher for your account (no administrator needed) with a Start menu shortcut, and the launcher updates itself from there; **Apps & features** removes it. If you'd rather not install it, `horizon-launcher-windows-x64.zip` holds the same launcher: extract it (right-click, **Extract All**) and run `horizon-launcher.exe` from the extracted folder, not from inside the ZIP, where Windows runs a temporary copy it throws away later.

Every release also carries `SHA256SUMS` and a signature, `SHA256SUMS.sig`, if you want to check your download. The launcher does not check that signature for you yet.

## First launch

1. Open the launcher. On the **Play** page, if it says "No version installed yet", choose **Choose a version**. On the **Versions** page, install the newest one. The launcher installs it in its own folder.
2. Back on **Play**, the launcher says "Not prepared. Horizon needs the files of your own Minecraft 26.3." Choose **Prepare**. It finds your Minecraft folder by itself in the usual places. If it cannot, it lists where it looked, and **Choose…** next to the Minecraft folder lets you point it at yours.
3. Wait a few minutes. When it says "Prepared for Minecraft 26.3", choose **Play**.

The game opens on vanilla's title screen. Your worlds, options and logs live in the game folder, which is not inside a version's folder, so updating or removing a version never touches them:

- Linux: `~/.local/share/horizon`
- macOS: `~/Library/Application Support/horizon`
- Windows: `%APPDATA%\horizon`

> **Sign in to play.** Without a signed-in account, the launcher shows **Sign in to play**. Choose **Open link**, enter the code it shows on Microsoft's page in your browser, and the launcher goes on by itself. Until an account that owns Java Edition is signed in, **Play** asks you to sign in instead of starting the game. Once one is, you can also play under an offline name.

## Updating

- **Horizon.** The launcher looks for a new Nightly when it starts and every 30 minutes while it is open. With **Install new versions automatically** on (the default), it installs it and moves you to it if you were on the newest version. Your worlds stay where they are. New Nightlies come out a few times a day; an older Nightly is removed once nothing plays it, and versions you installed by hand stay until you remove them on the **Versions** page.
- **The launcher.** It updates itself from its own releases. When one is ready it says **A new version is available**: choose **Update**, the launcher closes, installs it and opens again. If you close it instead, the update goes in then and the next start is the new launcher. A launcher from before 0.2 (0.16 or older) updates twice in a row: first to 0.17, then to 0.2. Then it installs Horizon 0.2 like any update.

### Stuck on an old launcher? Download it again once

A launcher can only update itself where it is allowed to write. One opened from the disk image, a Mac app that was never moved out of Downloads (macOS runs it from a read-only copy), or a ZIP opened on Windows without extracting it finds every update and cannot put it in place. Launcher 0.2.41 and older say so only in **Settings**, next to the launcher's version ("the update failed: …"), so nothing on the home screen tells you that it is stuck on an old version. Newer ones say it in the sidebar, with **Download again**.

Settings shows which launcher you have. If it is older than the newest [launcher release](https://github.com/horizon-rust/horizon/releases?q=launcher&expanded=true), download the launcher again from the home page and install it as described above: on macOS, drag it onto Applications and open it from there; on Windows, extract the ZIP first. Your instances, worlds and settings stay where they are, because they are not inside the launcher. You only do this once: from then on it updates itself.

## One version for everyone: the Nightly

Horizon ships one build, the **Nightly**: the latest Horizon, plus a few changes the Team picked to try before they are merged. Before a Nightly goes out, the game has to start and draw a world on our test machine, and nothing goes out while a serious problem is open. The game shows which Nightly you play ("Nightly 2026-10-28 · 9b772b2"): give that when you report a bug. You can install an earlier one (the last week's) or an older numbered release by hand on the **Versions** page.

Launchers from before this change still show a **Nightly builds** setting, or an **Updates** choice. The launcher updates itself, and from then on it plays the Nightly for everyone; the setting goes away.

## The Versions page

It lists Horizon's builds, newest first: the current Nightly, the last week's, then the numbered releases from before. You can install a version, remove it, or choose which one **Play** starts. Each release's notes are on the **Patch notes** page, and on [GitHub](https://github.com/horizon-rust/horizon/releases).

## Something went wrong

See [Logs, crashes and bug reports](/docs/troubleshooting).

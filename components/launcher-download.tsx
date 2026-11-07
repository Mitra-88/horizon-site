"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import type { DesktopOs, LauncherBuild, LauncherTarget } from "@/components/github-releases";
import { DOWNLOAD_URL } from "@/components/links";

function detect(): DesktopOs | null {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return navigator.maxTouchPoints > 1 ? null : "macos";
  if (/Linux|X11|CrOS/i.test(ua)) return "linux";
  return null;
}

// The processor, where the browser says (Chromium's client hints; the user agent string says Intel on every Mac and
// x64 on Windows on ARM). Read once, in the browser only; nothing leaves the page.
type Arch = "arm" | "x86" | null;
let arch: Arch = null;
let asked = false;
const archListeners = new Set<() => void>();
type HintedNavigator = Navigator & {
  userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> };
};

function subscribeArch(changed: () => void) {
  archListeners.add(changed);
  if (!asked) {
    asked = true;
    (navigator as HintedNavigator).userAgentData
      ?.getHighEntropyValues(["architecture"])
      .then(({ architecture }) => {
        arch = architecture === "arm" ? "arm" : architecture === "x86" ? "x86" : null;
        archListeners.forEach((listener) => listener());
      })
      .catch(() => {});
  }
  return () => {
    archListeners.delete(changed);
  };
}

const never = () => () => {};

function useDesktopOs() {
  return useSyncExternalStore(never, detect, () => null);
}

// This system's launcher: an Intel Mac gets the x64 disk image and Windows on ARM the ARM64 setup when the browser
// names the processor. Otherwise a Mac gets Apple Silicon's and Windows x64's, which Windows on ARM also runs.
function useLauncherTarget(os: DesktopOs | null): LauncherTarget | null {
  const processor = useSyncExternalStore(subscribeArch, () => arch, () => null);
  if (os === "macos" && processor === "x86") return "macos-x64";
  if (os === "windows" && processor === "arm") return "windows-arm64";
  return os;
}

const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

export function LauncherLink({
  build,
  os,
  className,
  children,
}: {
  build: LauncherBuild | null;
  os?: DesktopOs;
  className?: string;
  children: ReactNode;
}) {
  const detected = useDesktopOs();
  // The processor is this computer's: a link to another system's launcher keeps that system's default build.
  const target = useLauncherTarget(os && os !== detected ? null : (os ?? detected));
  const href = (target && build?.files[target]?.url) ?? build?.files[os ?? detected ?? "windows"]?.url;
  return (
    <a href={(os || detected) && href ? href : DOWNLOAD_URL} className={className}>
      {children}
    </a>
  );
}

export function LauncherMeta({ build, dot }: { build: LauncherBuild | null; dot: ReactNode }) {
  const detected = useDesktopOs();
  const target = useLauncherTarget(detected);
  if (!build) return null;
  const file = (target && build.files[target]) ?? build.files[detected ?? "windows"] ?? build.files.windows;
  return (
    <>
      Launcher {build.version}
      {file && (
        <>
          {dot}
          {megabytes(file.size)}
        </>
      )}
    </>
  );
}

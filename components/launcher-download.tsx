"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import type { DesktopOs, LauncherBuild } from "@/components/github-releases";
import { DOWNLOAD_URL } from "@/components/links";

function detect(): DesktopOs | null {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return navigator.maxTouchPoints > 1 ? null : "macos";
  if (/Linux|X11|CrOS/i.test(ua)) return "linux";
  return null;
}

const never = () => () => {};

function useDesktopOs() {
  return useSyncExternalStore(never, detect, () => null);
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
  const href = build?.files[os ?? detected ?? "windows"]?.url;
  return (
    <a href={(os || detected) && href ? href : DOWNLOAD_URL} className={className}>
      {children}
    </a>
  );
}

export function LauncherMeta({ build, dot }: { build: LauncherBuild | null; dot: ReactNode }) {
  const detected = useDesktopOs();
  if (!build) return null;
  const file = build.files[detected ?? "windows"] ?? build.files.windows;
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

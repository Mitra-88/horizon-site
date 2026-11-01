"use client";

import { Fragment, useId, useState, type ReactNode } from "react";
import { CopyCommand } from "@/components/hub-tools";
import { ChevronDownIcon, DownloadIcon } from "@/components/icons";

export function ModDownload({
  name,
  url,
  fileName,
  size,
  version,
  command,
  signed,
  byHand,
}: {
  name: string;
  url: string;
  fileName: string;
  size: string;
  version: string;
  command: string;
  signed: boolean;
  byHand: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panel = useId();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {url && (
          <a
            href={url}
            className="inline-flex h-11 items-center gap-2.5 rounded-[10px] bg-[#6b4bff] px-5 text-[15px] font-medium text-white transition-colors outline-none hover:bg-[#7a5dff] focus-visible:ring-2 focus-visible:ring-[#c4b5ff]"
          >
            <DownloadIcon className="size-[18px]" />
            Download
            <span className="font-normal text-white/60">
              {version} · {size}
            </span>
          </a>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen(!open)}
          className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-white/65 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#a98fff]"
        >
          Advanced
          <ChevronDownIcon className="size-4 transition-transform duration-300 group-aria-expanded:rotate-180" />
        </button>
      </div>

      <div
        id={panel}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-4 space-y-5 rounded-2xl bg-[#18112c] p-5 text-[14px] leading-relaxed text-white/65 sm:p-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-white">From a terminal or an agent</h2>
                <CopyCommand command={command} label="Copy the install command" text="Copy" />
              </div>
              <pre className="mt-2 rounded-lg bg-[#0a0614] px-3.5 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-[#e7e1ff]">
                <code>
                  {command.split(" ").map((word, i) => (
                    <Fragment key={i}>
                      {i > 0 && " "}
                      <span className="whitespace-nowrap">{word}</span>
                    </Fragment>
                  ))}
                </code>
              </pre>
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">In the launcher</h2>
              <p className="mt-1">
                Open Mods, pick Horizon beside Modrinth, find {name} and press Install. It checks the file&apos;s checksum{signed ? " and signature" : ""} first.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">By hand</h2>
              <p className="mt-1">
                Download {fileName} with the button above, check its SHA-256 against the one under File, and {byHand}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

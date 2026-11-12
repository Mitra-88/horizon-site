"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { t } from "@/lib/perf/i18n";
import { LocalCaptureError, loadLocalCapture, localCaptureUrl, localParam } from "@/lib/perf/local-capture";
import { sharedFile } from "@/lib/perf/share-client";
import { CaptureView } from "./capture-view";
import { Landing } from "./landing";
import { useReader } from "./use-capture";
import styles from "./page.module.css";

export default function PerfViewer({ captureId }: { captureId?: string }) {
  const { reader, readerError, capture, error, open, close, showSide } = useReader();
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPending, setLinkPending] = useState(Boolean(captureId));
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const localStarted = useRef(false);

  useEffect(() => {
    const raw = localParam(window.location.hash);
    if (raw === null) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const url = localCaptureUrl(raw);
    if (url) {
      /* eslint-disable react-hooks/set-state-in-effect -- the fragment is only readable in the browser */
      setLocalUrl(url);
      setLinkPending(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  useEffect(() => {
    if (!localUrl || !reader || localStarted.current) return;
    localStarted.current = true;
    void loadLocalCapture(localUrl, open)
      .catch((failure: unknown) => setLinkError(t(failure instanceof LocalCaptureError ? `local.${failure.failure}` : "local.expired")))
      .finally(() => setLinkPending(false));
  }, [localUrl, reader, open]);

  useEffect(() => {
    if (!captureId || !reader) return;
    const controller = new AbortController();
    void sharedFile(captureId, controller.signal)
      .then((file) => { if (!controller.signal.aborted) return open(file, file.name); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setLinkError(failure instanceof Error ? failure.message : t("share.error.unavailable")); })
      .finally(() => { if (!controller.signal.aborted) setLinkPending(false); });
    return () => controller.abort();
  }, [captureId, reader, open]);

  const choose = useCallback(async (files: FileList | File[] | null) => {
    const file = Array.isArray(files) ? files[0] : files?.[0];
    if (file) {
      setLinkError(null);
      await open(file, file.name);
    }
  }, [open]);

  const drop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    void choose(event.dataTransfer.files);
  };

  const openPicker = () => input.current?.click();

  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (!event.defaultPrevented && files && files.length > 0) {
        event.preventDefault();
        void choose(files);
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [choose]);

  return (
    <main
      className={styles.page}
      data-tip-root=""
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <input
        ref={input}
        type="file"
        accept=".hzperf,application/octet-stream"
        className={styles.fileInput}
        onChange={(event) => {
          void choose(event.target.files);
          event.target.value = "";
        }}
      />
      {capture && reader ? (
        <>
          {error ? <p className={styles.error}>{t("error.capture", { message: error })}</p> : null}
          <CaptureView reader={reader} capture={capture} showSide={showSide} onClose={close} />
        </>
      ) : linkPending && !readerError ? (
        <section className={styles.opening} aria-busy="true">
          <p className={styles.muted} role="status">{t(localUrl ? "local.opening" : "share.opening")}</p>
        </section>
      ) : (
        <Landing
          ready={Boolean(reader)}
          dragging={dragging}
          problem={
            readerError ? t("error.reader", { message: readerError }) : error ? t("error.capture", { message: error }) : linkError
          }
          onChoose={openPicker}
        />
      )}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { fileFromLink } from "@/lib/perf/share-client";
import { captureId } from "@/lib/perf/sharing";
import { changeMs, changePct, rowName, toneOf } from "@/lib/perf/compare";
import { num } from "@/lib/perf/format";
import { has, t } from "@/lib/perf/i18n";
import type { DiffRow } from "@/lib/perf/types";
import { useComparison } from "./comparison";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

const SHOWN = 200;

/** A health figure in words, any other row by its name. */
function metricName(row: DiffRow): string {
  const key = `compare.field.${row.id.replace(/^h:/, "")}`;
  return row.id.startsWith("h:") && has(key) ? t(key) : rowName(row);
}

/** Picks the second capture and lists what changed in the whole run: the health figures and the tick's spans. */
export function ComparePanel({ base }: { base: LoadedCapture }) {
  const { other, rows, warnings, error, ready, pick, clear } = useComparison();
  const picker = useRef<HTMLInputElement>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const openFile = useCallback(async (file: File) => {
    setLinkError(null);
    await pick(file);
  }, [pick]);
  const openShared = useCallback(async (value: string) => {
    setLinkError(null);
    try { await pick(await fileFromLink(value)); }
    catch (failure) { setLinkError(failure instanceof Error ? failure.message : t("share.invalidLink")); }
  }, [pick]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const file = event.clipboardData?.files[0];
      if (file) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void openFile(file);
        return;
      }
      if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable]")) return;
      const value = event.clipboardData?.getData("text/plain").trim();
      if (value && captureId(value, window.location.origin)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void openShared(value);
      }
    };
    window.addEventListener("paste", paste, true);
    return () => window.removeEventListener("paste", paste, true);
  }, [openFile, openShared]);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void openFile(file);
    else {
      const value = event.dataTransfer.getData("text/uri-list").split("\n").find((line) => line && !line.startsWith("#")) ?? event.dataTransfer.getData("text/plain");
      if (value.trim()) void openShared(value.trim());
    }
  };
  const table = rows.filter((row) => row.id.startsWith("h:") || row.id.startsWith("s:")).slice(0, SHOWN);
  const judged = table.some((row) => row.verdict !== "too_few_blocks");

  return (
    <div className={styles.metadata}>
      <div
        className={dragging ? styles.comparisonDropActive : styles.comparisonDrop}
        role="group"
        aria-label={t("compare.choose")}
        tabIndex={0}
        onDragEnter={(event) => { event.preventDefault(); event.stopPropagation(); dragDepth.current += 1; setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={(event) => { event.stopPropagation(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
        onDrop={drop}
      >
      <div className={styles.actions}>
        <input
          ref={picker}
          type="file"
          accept=".hzperf"
          className={styles.fileInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void openFile(file);
            event.target.value = "";
          }}
        />
        <button type="button" className={other ? styles.buttonSmall : styles.button} onClick={() => picker.current?.click()}>
          {other ? t("compare.another") : t("compare.choose")}
        </button>
        {other ? (
          <button type="button" className={styles.buttonSmall} onClick={clear}>
            {t("compare.stop")}
          </button>
        ) : null}
      </div>
      <p className={styles.muted} aria-live="polite">{t(dragging ? "compare.dropActive" : "compare.dropHint")}</p>
      </div>
      {linkError ? <p className={styles.error} role="alert">{linkError}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <p className={styles.muted}>{other ? t("compare.pair", { a: base.name, b: other.name }) : t("compare.pick")}</p>
      {other && ready ? <p className={styles.muted}>{t("compare.elsewhere")}</p> : null}
      {ready && table.length > 0 && !judged ? <p className={styles.muted}>{t("compare.fewBlocks")}</p> : null}
      {warnings.map((warning) => (
        <p key={warning} className={styles.muted}>
          {warning}
        </p>
      ))}
      {ready && table.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("compare.metric")}</th>
              <th>{t("compare.a")}</th>
              <th>{t("compare.b")}</th>
              <th>{t("compare.change")}</th>
              {judged ? <th>{t("compare.verdict")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.id} title={row.id}>
                <td>{metricName(row)}</td>
                <td>{num(row.a, 2)}</td>
                <td>{num(row.b, 2)}</td>
                <td>{[changeMs(row), changePct(row)].filter(Boolean).join(" ") || "—"}</td>
                {judged ? (
                  <td className={styles.verdictCell} data-tone={toneOf(row.verdict)}>
                    {t(`compare.verdict.${row.verdict}`)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

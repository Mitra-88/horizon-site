"use client";

import { useState } from "react";
import { t } from "@/lib/perf/i18n";
import { checkedResponse, publishCapture } from "@/lib/perf/share-client";
import type { ShareReply } from "@/lib/perf/sharing";
import type { LoadedCapture } from "./use-capture";
import styles from "./page.module.css";

export function ShareCapture({ capture }: { capture: LoadedCapture }) {
  const [phase, setPhase] = useState<"idle" | "notice" | "working" | "shared">("idle");
  const [shared, setShared] = useState<ShareReply | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const publish = async () => {
    setPhase("working");
    setError(null);
    try {
      const reply = await publishCapture(capture.file);
      setToken(reply.upload.delete_token);
      setShared(reply.shared);
      setPhase("shared");
    } catch (failure) {
      setPhase("notice");
      setError(failure instanceof Error ? failure.message : t("share.error.unavailable"));
    }
  };

  const remove = async () => {
    if (!shared || !token) return;
    setError(null);
    try {
      await checkedResponse(await fetch(`/api/perf/captures/${shared.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }));
      sessionStorage.removeItem(`perf-owner:${shared.id}`);
      setShared(null);
      setToken(null);
      setPhase("idle");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t("share.error.unavailable"));
    }
  };

  return (
    <>
      <button type="button" className={styles.buttonSmall} onClick={() => setPhase(shared ? "shared" : "notice")}>{t("share.action")}</button>
      {phase !== "idle" ? (
        <div className={styles.shareOverlay}>
          <section className={styles.shareDialog} role="dialog" aria-modal="true" aria-labelledby="share-title">
            <h2 id="share-title">{t(shared ? "share.ready" : "share.action")}</h2>
            {shared ? (
              <>
                <p>{t("share.expires", { date: new Date(shared.expires_utc).toLocaleString() })}</p>
                <label>{t("share.link")}<input className={styles.input} readOnly value={shared.url} onFocus={(event) => event.target.select()} /></label>
                <p>{t("share.keepToken")}</p>
                <label>{t("share.deleteToken")}<input className={styles.input} readOnly value={token ?? ""} onFocus={(event) => event.target.select()} /></label>
                <div className={styles.actions}>
                  <button type="button" className={styles.button} onClick={() => { void navigator.clipboard.writeText(shared.url).then(() => setCopied(true)).catch(() => setError(t("share.copyFailed"))); }}>{t(copied ? "share.copied" : "share.copy")}</button>
                  <button type="button" className={styles.buttonSmall} onClick={() => { void remove(); }}>{t("share.delete")}</button>
                </div>
              </>
            ) : (
              <>
                <p>{t("share.notice")}</p>
                <button type="button" className={styles.button} disabled={phase === "working"} onClick={() => { void publish(); }}>{t(phase === "working" ? "share.uploading" : "share.confirm")}</button>
              </>
            )}
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <button type="button" className={styles.buttonSmall} disabled={phase === "working"} onClick={() => setPhase("idle")}>{t("app.close")}</button>
          </section>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { t } from "@/lib/perf/i18n";
import styles from "./page.module.css";

interface Props {
  ready: boolean;
  dragging: boolean;
  problem: string | null;
  onChoose: () => void;
}

export function Landing({ ready, dragging, problem, onChoose }: Props) {
  return (
    <section className={styles.landing}>
      <nav className={styles.breadcrumb} aria-label={t("landing.navigation")}>
        <Link href="/docs">{t("landing.docs")}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("landing.title")}</span>
      </nav>
      <header className={styles.landingHeader}>
        <h1 className={styles.display}>{t("landing.title")}</h1>
        <p className={styles.lede}>{t("landing.lede")}</p>
      </header>
      <div className={styles.landingGrid}>
        <section className={styles.openPanel} aria-labelledby="open-capture-heading">
          <div className={dragging ? styles.dropZoneActive : styles.dropZone}>
            <span className={styles.fileType} aria-hidden="true">.hzperf</span>
            <h2 id="open-capture-heading" className={styles.landingHeading}>{t("landing.open")}</h2>
            <p className={styles.muted}>{t("app.dropHint")}</p>
            <button type="button" className={styles.button} onClick={onChoose} disabled={!ready}>
              {ready ? t("app.choose") : t("app.loadingReader")}
            </button>
          </div>
          {problem ? <p className={styles.error} role="alert">{problem}</p> : null}
          <p className={styles.privacyNote}>{t("app.privacy")}</p>
        </section>
        <aside className={styles.recordPanel} aria-labelledby="record-heading">
          <h2 id="record-heading" className={styles.landingHeading}>{t("landing.get")}</h2>
          <p>{t("landing.way.game")}</p>
          <code className={styles.commandBlock}>/profiler start</code>
          <p>{t("landing.recordHint")}</p>
          <code className={styles.commandBlock}>/profiler stop</code>
          <p className={styles.note}>{t("landing.where")}</p>
          <details className={styles.recordDetails}>
            <summary>{t("landing.otherWays")}</summary>
            <p>{t("landing.way.ctl")}</p>
            <code className={styles.commandBlock}>horizon-ctl profile start | stop</code>
            <p>{t("landing.way.server")}</p>
            <code className={styles.commandBlock}>horizon-report 60</code>
          </details>
        </aside>
      </div>
    </section>
  );
}

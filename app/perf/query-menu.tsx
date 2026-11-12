"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { copyText } from "@/lib/perf/clipboard";
import { t } from "@/lib/perf/i18n";
import { cliLine, queryLabel, replyJson, requestJson } from "@/lib/perf/query-text";
import { Icons } from "./icons";
import { useLoggedQueries } from "./query-log";
import type { LoggedQuery } from "./query-log";
import styles from "./filters.module.css";
import page from "./page.module.css";

const FEEDBACK_MS = 1500;

function CopyButton({ label, text, disabled = false }: { label: string; text: () => string; disabled?: boolean }) {
  const [done, setDone] = useState<boolean | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={page.buttonSmall}
      disabled={disabled}
      onClick={async () => {
        setDone(await copyText(text()));
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(null), FEEDBACK_MS);
      }}
    >
      {done === null ? label : t(done ? "copy.done" : "copy.failed")}
    </button>
  );
}

/** Every query the view on show ran: copy the request, the `horizon-perf query` line or the reply to check a number. */
export function QueryMenu() {
  const logged = useLoggedQueries();
  const queries = useMemo(() => {
    const seen = new Set<string>();
    return logged.filter((entry: LoggedQuery) => {
      const key = requestJson(entry.request);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [logged]);
  if (queries.length === 0) return null;
  return (
    <details className={styles.queryMenu}>
      <summary>
        <Icons.code width={14} height={14} />
        {t("query.menu", { count: queries.length })}
      </summary>
      <ul className={styles.queryList}>
        {queries.map((entry) => {
          const key = requestJson(entry.request);
          return (
            <li key={key} className={styles.queryItem}>
              <span className={styles.queryName} title={key}>
                {queryLabel(entry.request)}
              </span>
              <span className={styles.queryButtons}>
                <CopyButton label={t("query.copyRequest")} text={() => key} />
                <CopyButton label={t("query.copyCli")} text={() => cliLine(entry.request)} />
                <CopyButton label={t("query.copyReply")} text={() => replyJson(entry.reply)} disabled={entry.reply === null} />
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

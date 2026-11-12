"use client";

import { useState } from "react";
import { grouped } from "@/lib/perf/format";
import { t } from "@/lib/perf/i18n";
import styles from "./page.module.css";

/** A limit that lets the reader answer with every row. */
export const ALL_ROWS = 1_000_000;

/** A table's row limit: `all` lifts it, and `capped` says whether a reply of `count` rows hit it. */
export function useLimit(initial: number) {
  const [all, setAll] = useState(false);
  const limit = all ? ALL_ROWS : initial;
  return { limit, all, show: () => setAll(true), capped: (count: number) => !all && count >= limit };
}

/** The note under a table cut at its limit, with the button that lifts it. */
export function ShowAll({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <p className={styles.note}>
      {t("showAll.note", { count: grouped(count) })}{" "}
      <button type="button" className={styles.buttonSmall} onClick={onClick}>
        {t("showAll.button")}
      </button>
    </p>
  );
}

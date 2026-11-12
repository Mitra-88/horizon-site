"use client";

import { t } from "@/lib/perf/i18n";
import { fieldName } from "@/lib/perf/pins";
import { Icons } from "./icons";
import { usePins } from "./pins-context";
import styles from "./page.module.css";

/** Adds a field to the time chart, or takes it off; `field` is what `series` takes. */
export function PinButton({ field }: { field: string }) {
  const pins = usePins();
  const pinned = pins.has(field);
  return (
    <button
      type="button"
      className={styles.pin}
      aria-pressed={pinned}
      aria-label={t(pinned ? "chart.unpin" : "chart.pin", { name: fieldName(field) })}
      title={t(pinned ? "chart.unpin" : "chart.pin", { name: fieldName(field) })}
      onClick={() => pins.toggle(field)}
    >
      <Icons.chart width={13} height={13} />
    </button>
  );
}

"use client";

import { CRATE_GROUPS } from "@/lib/perf/crate-group";
import type { CrateGroup } from "@/lib/perf/crate-group";
import { t } from "@/lib/perf/i18n";
import type { GroupKind, SampleOptions, ViewKind } from "@/lib/perf/tree-options";
import { Segmented } from "./segmented";
import { Swatch } from "./tree-rows";
import styles from "./page.module.css";
import tree from "./tree.module.css";

interface Props {
  options: SampleOptions;
  group: GroupKind;
  view: ViewKind;
  merge: boolean;
  query: string;
  onGroup: (value: GroupKind) => void;
  onView: (value: ViewKind) => void;
  onMerge: () => void;
  onQuery: (value: string) => void;
  onCollapse: () => void;
  onHottest: () => void;
}

export function TreeToolbar(props: Props) {
  const { options, group, view, merge, query } = props;
  return (
    <div className={tree.controls}>
      <div className={tree.control}>
        <span className={tree.controlLabel}>{t("tree.view")}</span>
        <Segmented
          label={t("tree.view")}
          value={view}
          onChange={props.onView}
          options={[
            { id: "list", text: t("tree.view.list") },
            { id: "flame", text: t("tree.view.flame") },
          ]}
        />
      </div>
      {options.groups.length > 1 ? (
        <label className={tree.control}>
          <span className={tree.controlLabel}>{t("tree.groupBy")}</span>
          <select
            className={styles.select}
            value={group}
            onChange={(event) => {
              const next = options.groups.find((id) => id === event.target.value);
              if (next) props.onGroup(next);
            }}
          >
            {options.groups.map((id) => (
              <option key={id} value={id}>
                {t(`tree.group.${id}`)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className={`${tree.control} ${tree.searchControl}`}>
        <span className={tree.controlLabel}>{t("tree.search")}</span>
        <input
          type="search"
          className={tree.search}
          value={query}
          placeholder={t("tree.searchHint")}
          onChange={(event) => props.onQuery(event.target.value)}
        />
      </label>
      <div className={tree.buttons}>
        <button type="button" className={styles.buttonSmall} aria-pressed={merge} onClick={props.onMerge}>
          {t("tree.merge")}
        </button>
        {view === "list" ? (
          <>
            <button type="button" className={styles.buttonSmall} onClick={props.onCollapse}>
              {t("tree.collapseAll")}
            </button>
            <button type="button" className={styles.buttonSmall} onClick={props.onHottest}>
              {t("tree.hottest")}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** What the row colours mean, for the groups the tree has. */
export function TreeLegend({ groups }: { groups: readonly CrateGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <ul className={tree.legend} aria-label={t("tree.legend")}>
      {CRATE_GROUPS.filter((group) => groups.includes(group)).map((group) => (
        <li key={group} className={tree.legendItem}>
          <Swatch group={group} />
          {t(`tree.crate.${group}`)}
        </li>
      ))}
    </ul>
  );
}

import { ArrowDownUp, Bell, Search, Timer, Trash2, Undo2, X } from "lucide-react";
import type { Ref } from "react";
import { formatClock } from "@/core/focus";
import { SORTS } from "@/core/model";
import type { Sort } from "@/core/selectors";
import { Button } from "@/components/button";
import { useI18n } from "@/i18n";

interface Props {
  title: string;
  subtitle: string;
  query: string;
  onQuery(value: string): void;
  searchRef: Ref<HTMLInputElement>;
  sort: Sort;
  onSort(sort: Sort): void;
  showSort: boolean;
  canUndo: boolean;
  onUndo(): void;
  timerRunning: boolean;
  timerRemaining: number;
  onFocus(): void;
  onClearDone: (() => void) | null;
  unreadAlerts: number;
  onAlerts(): void;
}

const SORT_LABEL = { manual: "sortManual", due: "sortDue", priority: "sortPriority", created: "sortCreated" } as const;

export function ViewHeader({
  title,
  subtitle,
  query,
  onQuery,
  searchRef,
  sort,
  onSort,
  showSort,
  canUndo,
  onUndo,
  timerRunning,
  timerRemaining,
  onFocus,
  onClearDone,
  unreadAlerts,
  onAlerts,
}: Props) {
  const { t } = useI18n();
  return (
    <header className="view-header">
      <div className="view-header__titles">
        <h1 className="view-header__title">{title}</h1>
        <p className="view-header__subtitle">{subtitle}</p>
      </div>

      <div className="view-header__tools">
        <div className="search">
          <Search aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
          />
          {query && (
            <button type="button" className="icon-btn" aria-label={t("clearSearch")} onClick={() => onQuery("")}>
              <X aria-hidden="true" />
            </button>
          )}
        </div>

        {showSort && (
          <label className="select-chip">
            <ArrowDownUp aria-hidden="true" />
            <span className="sr-only">{t("sortBy")}</span>
            <select value={sort} onChange={(e) => onSort(e.target.value as Sort)}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(SORT_LABEL[s])}
                </option>
              ))}
            </select>
          </label>
        )}

        {onClearDone && (
          <Button variant="glass" size="sm" onClick={onClearDone}>
            <Trash2 aria-hidden="true" /> {t("clearCompleted")}
          </Button>
        )}

        <Button variant="glass" size="icon" disabled={!canUndo} aria-label={t("undo")} title={`${t("undo")} (Ctrl+Z)`} onClick={onUndo}>
          <Undo2 aria-hidden="true" />
        </Button>

        <Button variant="glass" size="icon" className="bell" aria-label={t("alertsBell", { count: unreadAlerts })} onClick={onAlerts}>
          <Bell aria-hidden="true" />
          {unreadAlerts > 0 && (
            <span className="bell__badge" aria-hidden="true">
              {unreadAlerts > 9 ? "9+" : unreadAlerts}
            </span>
          )}
        </Button>

        <Button
          variant={timerRunning ? "solid" : "glass"}
          size="sm"
          className="focus-pill"
          onClick={onFocus}
          aria-label={timerRunning ? t("focusRunning") : t("focusTitle")}
        >
          <Timer aria-hidden="true" />
          <span className="focus-pill__text">{timerRunning ? formatClock(timerRemaining) : t("focusTitle")}</span>
        </Button>
      </div>
    </header>
  );
}

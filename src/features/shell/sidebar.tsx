import {
  CalendarClock,
  CheckCheck,
  ChartNoAxesColumn,
  Inbox,
  ListChecks,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { Counts } from "@/core/selectors";
import { viewKey, type View } from "@/core/selectors";
import { INBOX_ID, type TaskList } from "@/core/model";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n/en";

export const hrefFor = (view: View): string => `#/${viewKey(view).split(":").map(encodeURIComponent).join("/")}`;

const SMART: Array<{ kind: "inbox" | "today" | "upcoming" | "all" | "done"; icon: LucideIcon; label: MessageKey }> = [
  { kind: "today", icon: Sun, label: "navToday" },
  { kind: "upcoming", icon: CalendarClock, label: "navUpcoming" },
  { kind: "inbox", icon: Inbox, label: "navInbox" },
  { kind: "all", icon: ListChecks, label: "navAll" },
  { kind: "done", icon: CheckCheck, label: "navDone" },
];

interface Props {
  view: View;
  counts: Counts;
  lists: readonly TaskList[];
  tags: readonly string[];
  onNavigate(): void;
  onNewList(): void;
  onEditList(list: TaskList): void;
  onSettings(): void;
}

export function SidebarContent({ view, counts, lists, tags, onNavigate, onNewList, onEditList, onSettings }: Props) {
  const { t } = useI18n();
  const current = (v: View) => (viewKey(v) === viewKey(view) ? "page" : undefined);
  const userLists = lists.filter((l) => l.id !== INBOX_ID);

  return (
    <>
      <a className="brand" href="#/today" onClick={onNavigate}>
        <span className="brand__mark" aria-hidden="true">
          <Sun />
        </span>
        {t("brand")}
      </a>

      <nav aria-label={t("navMain")} className="nav">
        <ul>
          {SMART.map(({ kind, icon: Icon, label }) => {
            const count = kind === "done" ? 0 : counts[kind];
            return (
              <li key={kind}>
                <a href={hrefFor({ kind })} aria-current={current({ kind })} className="nav__link" onClick={onNavigate}>
                  <Icon aria-hidden="true" />
                  <span className="nav__text">{t(label)}</span>
                  {count > 0 && (
                    <span className={cn("nav__count", kind === "today" && counts.overdue > 0 && "nav__count--alert")}>{count}</span>
                  )}
                </a>
              </li>
            );
          })}
          <li>
            <a href={hrefFor({ kind: "stats" })} aria-current={current({ kind: "stats" })} className="nav__link" onClick={onNavigate}>
              <ChartNoAxesColumn aria-hidden="true" />
              <span className="nav__text">{t("navStats")}</span>
            </a>
          </li>
        </ul>

        <div className="nav__heading">
          <h2>{t("navLists")}</h2>
          <button type="button" className="icon-btn" aria-label={t("newList")} onClick={onNewList}>
            <Plus aria-hidden="true" />
          </button>
        </div>
        <ul>
          {userLists.map((list) => {
            const v: View = { kind: "list", id: list.id };
            return (
              <li key={list.id} className="nav__row">
                <a href={hrefFor(v)} aria-current={current(v)} className="nav__link" onClick={onNavigate}>
                  <i className="dot" style={{ background: list.color }} aria-hidden="true" />
                  <span className="nav__text">
                    {list.emoji} {list.name}
                  </span>
                  {(counts.lists[list.id] ?? 0) > 0 && <span className="nav__count">{counts.lists[list.id]}</span>}
                </a>
                <button
                  type="button"
                  className="icon-btn nav__edit"
                  aria-label={`${t("renameList")}: ${list.name}`}
                  onClick={() => onEditList(list)}
                >
                  <Pencil aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="nav__heading">
          <h2>{t("navTags")}</h2>
        </div>
        {tags.length === 0 ? (
          <p className="muted nav__empty">{t("noTags")}</p>
        ) : (
          <ul className="tag-cloud">
            {tags.map((tag) => {
              const v: View = { kind: "tag", tag };
              return (
                <li key={tag}>
                  <a href={hrefFor(v)} aria-current={current(v)} className="tag-link" onClick={onNavigate}>
                    #{tag} <span className="muted">{counts.tags[tag] ?? 0}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <button type="button" className="nav__link nav__settings" onClick={onSettings}>
        <SettingsIcon aria-hidden="true" />
        <span className="nav__text">{t("settings")}</span>
      </button>
    </>
  );
}

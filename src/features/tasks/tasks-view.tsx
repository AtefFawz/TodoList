import { useMemo, type Ref } from "react";
import { groupByDay, selectTasks, sortTasks, type View } from "@/core/selectors";
import type { Task } from "@/core/model";
import { useClock } from "@/app/contexts";
import { useI18n } from "@/i18n";
import { useData } from "@/state/context";
import { Composer } from "./composer";
import { EmptyState } from "./empty-state";
import { CompletedSection, GroupedTaskList, PlainTaskList, SortableTaskList } from "./task-list";
import { useTaskActions } from "./use-task-actions";

interface Props {
  view: View;
  query: string;
  composerRef: Ref<HTMLInputElement>;
  onOpen(task: Task): void;
}

export function TasksView({ view, query, composerRef, onOpen }: Props) {
  const { t, locale } = useI18n();
  const { today, now } = useClock();
  const data = useData((d) => d);
  const { toggle, describeDay } = useTaskActions();

  const lists = useMemo(() => new Map(data.lists.map((l) => [l.id, l])), [data.lists]);
  const selection = selectTasks(data, view, { today, query, now });
  const searching = query.trim().length > 0;
  const grouped = !searching && (view.kind === "today" || view.kind === "upcoming");
  const canReorder = !searching && data.settings.sort === "manual" && !grouped && view.kind !== "done";

  const common = { lists, showList: view.kind !== "list" && view.kind !== "inbox", onToggle: toggle, onOpen, describeDay };
  const groupLabel = (key: string): string => {
    switch (key) {
      case "overdue": return t("groupOverdue");
      case "today": return t("groupToday");
      case "tomorrow": return t("groupTomorrow");
      case "later": return t("groupLater");
      case "none": return t("groupNone");
      default: return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00`));
    }
  }; // prettier-ignore

  const empty = selection.open.length === 0 && selection.done.length === 0;

  return (
    <>
      {view.kind !== "done" && <Composer view={view} lists={data.lists} inputRef={composerRef} />}

      {empty ? (
        <EmptyState view={view} searching={searching} />
      ) : (
        <div className="view-body">
          {grouped ? (
            <GroupedTaskList groups={groupByDay(selection.open, today)} label={groupLabel} {...common} />
          ) : canReorder ? (
            <SortableTaskList tasks={selection.open} {...common} />
          ) : (
            selection.open.length > 0 && <PlainTaskList tasks={selection.open} {...common} />
          )}
          {view.kind === "done" ? (
            <PlainTaskList tasks={sortTasks(selection.done, "created").sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))} {...common} />
          ) : (
            <CompletedSection tasks={selection.done} {...common} />
          )}
        </div>
      )}
    </>
  );
}

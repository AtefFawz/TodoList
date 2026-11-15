import { CalendarClock, CheckCheck, Inbox, ListChecks, SearchX, Sun, Tag, type LucideIcon } from "lucide-react";
import type { View } from "@/core/selectors";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n/en";

const COPY: Record<string, { icon: LucideIcon; title: MessageKey; body: MessageKey }> = {
  inbox: { icon: Inbox, title: "emptyInbox", body: "emptyInboxBody" },
  today: { icon: Sun, title: "emptyToday", body: "emptyTodayBody" },
  upcoming: { icon: CalendarClock, title: "emptyUpcoming", body: "emptyUpcomingBody" },
  all: { icon: ListChecks, title: "emptyAll", body: "emptyAllBody" },
  done: { icon: CheckCheck, title: "emptyDone", body: "emptyDoneBody" },
  list: { icon: ListChecks, title: "emptyList", body: "emptyListBody" },
  tag: { icon: Tag, title: "emptyTag", body: "emptyTagBody" },
  search: { icon: SearchX, title: "emptySearch", body: "emptySearchBody" },
};

export function EmptyState({ view, searching }: { view: View; searching: boolean }) {
  const { t } = useI18n();
  const copy = COPY[searching ? "search" : view.kind] ?? COPY["all"]!;
  const Icon = copy.icon;
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden="true">
        <Icon />
      </div>
      <h2>{t(copy.title)}</h2>
      <p>{t(copy.body, view.kind === "tag" ? { tag: view.tag } : undefined)}</p>
    </div>
  );
}

import { useCallback } from "react";
import type { Task } from "@/core/model";
import { useCelebrate, useClock } from "@/app/contexts";
import { useToast } from "@/components/toast";
import { formatDay } from "@/lib/format";
import { useI18n } from "@/i18n";
import { useData, useDispatch, useHistory } from "@/state/context";

/** Task mutations with the right feedback attached: undo toasts, repeat messages, the all-done celebration. */
export function useTaskActions() {
  const dispatch = useDispatch();
  const { undo } = useHistory();
  const show = useToast();
  const { t, locale } = useI18n();
  const { today } = useClock();
  const celebrate = useCelebrate();
  const tasks = useData((d) => d.tasks);

  const toggle = useCallback(
    (task: Task) => {
      dispatch({ type: "toggle", id: task.id });
      if (task.done) return;
      const dueNow = task.due !== null && task.due <= today;
      const othersDue = tasks.some((x) => x.id !== task.id && !x.done && x.due !== null && x.due <= today);
      show({ message: t("taskCompleted"), actionLabel: t("undo"), onAction: undo });
      if (dueNow && !othersDue) celebrate();
    },
    [dispatch, today, tasks, show, t, undo, celebrate],
  );

  const remove = useCallback(
    (task: Task) => {
      dispatch({ type: "delete", id: task.id });
      show({ message: t("taskDeleted"), actionLabel: t("undo"), onAction: undo });
    },
    [dispatch, show, t, undo],
  );

  const describeDay = useCallback((day: string) => formatDay(day, today, locale, t), [today, locale, t]);

  return { toggle, remove, describeDay };
}

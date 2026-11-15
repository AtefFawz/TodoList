import { Bell, CalendarDays, Check, FileText, GripVertical, Pin, Repeat, Timer } from "lucide-react";
import { memo, type ComponentPropsWithoutRef, type Ref } from "react";
import { isOverdue, subtaskProgress } from "@/core/selectors";
import type { Task, TaskList } from "@/core/model";
import { INBOX_ID } from "@/core/model";
import { useClock } from "@/app/contexts";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { useI18n } from "@/i18n";

interface Props {
  task: Task;
  list: TaskList | undefined;
  /** Hide the list chip when the surrounding view already is that list. */
  showList: boolean;
  onToggle(task: Task): void;
  onOpen(task: Task): void;
  describeDay(day: string): string;
  /** Drag handle props from dnd-kit; omit when reordering is unavailable. */
  handle?: ComponentPropsWithoutRef<"button"> | undefined;
  rowRef?: Ref<HTMLLIElement> | undefined;
  style?: React.CSSProperties | undefined;
  dragging?: boolean | undefined;
}

function TaskRowBase({ task, list, showList, onToggle, onOpen, describeDay, handle, rowRef, style, dragging }: Props) {
  const { t, language, locale } = useI18n();
  const { now, today } = useClock();
  const overdue = isOverdue(task, now);
  const progress = subtaskProgress(task);
  const dueToday = task.due === today;

  return (
    <li
      ref={rowRef}
      style={style}
      className={cn("task", task.done && "task--done", dragging && "task--dragging")}
      data-priority={task.priority}
    >
      {handle && (
        <button type="button" className="task__handle" aria-label={t("dragHandle", { title: task.title })} {...handle}>
          <GripVertical aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={t(task.done ? "taskReopen" : "taskComplete", { title: task.title })}
        className="task__check"
        onClick={() => onToggle(task)}
      >
        <Check aria-hidden="true" />
      </button>
      <button type="button" className="task__main" onClick={() => onOpen(task)}>
        <span className="task__title">
          {task.pinned && <Pin className="task__pin" aria-label={t("taskPinned")} />}
          <span>{task.title}</span>
        </span>
        <span className="task__meta">
          {task.due && (
            <span className={cn("chip", overdue && "chip--danger", !overdue && dueToday && "chip--accent")}>
              <CalendarDays aria-hidden="true" />
              {describeDay(task.due)}
              {task.time && <span className="chip__time">{formatTime(task.time, locale)}</span>}
            </span>
          )}
          {task.repeat !== "none" && (
            <span className="chip" title={t(`repeat_${task.repeat}`)}>
              <Repeat aria-hidden="true" />
              <span className="sr-only">{t(`repeat_${task.repeat}`)}</span>
            </span>
          )}
          {progress.total > 0 && (
            <span className="chip" aria-label={t("subtasksProgress", { done: progress.done, total: progress.total })}>
              <span className="chip__bar" aria-hidden="true">
                <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </span>
              <span aria-hidden="true">
                {progress.done}/{progress.total}
              </span>
            </span>
          )}
          {task.reminderAt !== null && !task.done && (
            <span className={cn("chip", task.reminderAt <= now && "chip--danger")}>
              <Bell aria-hidden="true" />
              {formatDateTime(task.reminderAt, now, locale, t)}
            </span>
          )}
          {task.notes && (
            <span className="chip">
              <FileText aria-hidden="true" />
            </span>
          )}
          {task.focusMs >= 60_000 && (
            <span className="chip">
              <Timer aria-hidden="true" />
              {formatDuration(task.focusMs, language)}
            </span>
          )}
          {showList && list && list.id !== INBOX_ID && (
            <span className="chip chip--list">
              <i className="dot" style={{ background: list.color }} aria-hidden="true" />
              {list.emoji} {list.name}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="chip chip--tag">
              #{tag}
            </span>
          ))}
        </span>
      </button>
    </li>
  );
}

export const TaskRow = memo(TaskRowBase);

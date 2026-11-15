import { Check, Copy, Pin, PinOff, Plus, Timer, Trash2, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { addDays, type DayKey } from "@/core/dates";
import { allTags } from "@/core/selectors";
import { INBOX_ID, type Priority, type Task } from "@/core/model";
import type { Repeat } from "@/core/dates";
import { useClock } from "@/app/contexts";
import { Button } from "@/components/button";
import { cn } from "@/lib/cn";
import { formatDuration, fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import { useI18n } from "@/i18n";
import { useData, useDispatch } from "@/state/context";
import { useDraft } from "./use-draft";
import { useTaskActions } from "./use-task-actions";

const REPEATS: Repeat[] = ["none", "daily", "weekdays", "weekly", "monthly"];
const PRIORITIES: Priority[] = [0, 1, 2, 3];

interface Props {
  taskId: string;
  onClose(): void;
  onFocus(taskId: string): void;
}

/** Remounted per task (key), so drafts always start from the stored values. */
const tomorrowAtNine = (now: number): number => {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
};

export function TaskDetail({ taskId, onClose, onFocus }: Props) {
  const task = useData((d) => d.tasks.find((x) => x.id === taskId));
  if (!task) return null; // deleted (e.g. by undo): the parent closes the drawer
  return <Editor task={task} onClose={onClose} onFocus={onFocus} />;
}

function Editor({ task, onClose, onFocus }: { task: Task; onClose(): void; onFocus(id: string): void }) {
  const { t, language, locale } = useI18n();
  const { now, today } = useClock();
  const dispatch = useDispatch();
  const lists = useData((d) => d.lists);
  const tasks = useData((d) => d.tasks);
  const everyTag = useMemo(() => allTags({ tasks }), [tasks]);
  const { toggle, remove } = useTaskActions();
  const ids = {
    title: useId(),
    notes: useId(),
    date: useId(),
    time: useId(),
    reminder: useId(),
    list: useId(),
    repeat: useId(),
    tags: useId(),
    steps: useId(),
  };

  const patch = (
    changes: Parameters<typeof dispatch>[0] extends infer A ? (A extends { type: "update"; patch: infer P } ? P : never) : never,
  ) => dispatch({ type: "update", id: task.id, patch: changes });

  const title = useDraft(task.title, (v) => patch({ title: v }));
  const notes = useDraft(task.notes, (v) => patch({ notes: v }));
  const [tagDraft, setTagDraft] = useState("");
  const [stepDraft, setStepDraft] = useState("");

  const setDue = (due: DayKey | null) => patch({ due });
  const quick: Array<{ key: string; label: string; value: DayKey | null }> = [
    { key: "today", label: t("quickToday"), value: today },
    { key: "tomorrow", label: t("quickTomorrow"), value: addDays(today, 1) },
    { key: "next", label: t("quickNextWeek"), value: addDays(today, 7) },
    { key: "none", label: t("quickNoDate"), value: null },
  ];

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "");
    if (!tag || /\s/.test(tag)) return;
    patch({ tags: [...task.tags, tag] });
    setTagDraft("");
  };
  const onTagKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === "،") {
      event.preventDefault();
      addTag(tagDraft);
    } else if (event.key === "Backspace" && !tagDraft && task.tags.length) {
      patch({ tags: task.tags.slice(0, -1) });
    }
  };
  const addStep = () => {
    if (!stepDraft.trim()) return;
    dispatch({ type: "addSubtask", id: task.id, title: stepDraft });
    setStepDraft("");
  };

  const when = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(ms);

  return (
    <div className="detail">
      <header className="detail__header">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          className="task__check"
          data-priority={task.priority}
          aria-label={t(task.done ? "taskReopen" : "taskComplete", { title: task.title })}
          onClick={() => toggle(task)}
        >
          <Check aria-hidden="true" />
        </button>
        <h2 className="detail__heading">{t("detailTitle")}</h2>
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={task.pinned}
          aria-label={t(task.pinned ? "unpin" : "pin")}
          onClick={() => patch({ pinned: !task.pinned })}
        >
          {task.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t("close")} onClick={onClose}>
          <X aria-hidden="true" />
        </Button>
      </header>

      <div className="detail__body">
        <div className="field">
          <label htmlFor={ids.title}>{t("fieldTitle")}</label>
          <input
            id={ids.title}
            className="input input--title"
            value={title.value}
            maxLength={200}
            onChange={(e) => title.onChange(e.target.value)}
            onBlur={title.flush}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), title.flush())}
          />
        </div>

        <div className="field">
          <label htmlFor={ids.notes}>{t("fieldNotes")}</label>
          <textarea
            id={ids.notes}
            className="input"
            rows={3}
            value={notes.value}
            placeholder={t("fieldNotesPlaceholder")}
            onChange={(e) => notes.onChange(e.target.value)}
            onBlur={notes.flush}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor={ids.date}>{t("fieldDate")}</label>
            <input id={ids.date} type="date" className="input" value={task.due ?? ""} onChange={(e) => setDue(e.target.value || null)} />
          </div>
          <div className="field">
            <label htmlFor={ids.time}>{t("fieldTime")}</label>
            <input
              id={ids.time}
              type="time"
              className="input"
              value={task.time ?? ""}
              disabled={!task.due}
              onChange={(e) => patch({ time: e.target.value || null })}
            />
          </div>
        </div>
        <div className="quick" role="group" aria-label={t("fieldDate")}>
          {quick.map((q) => (
            <button
              key={q.key}
              type="button"
              className={cn("pill-btn", q.value === task.due && "is-active")}
              onClick={() => setDue(q.value)}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor={ids.reminder}>{t("fieldReminder")}</label>
          <input
            id={ids.reminder}
            type="datetime-local"
            className="input"
            value={toLocalInputValue(task.reminderAt)}
            onChange={(e) => patch({ reminderAt: fromLocalInputValue(e.target.value) })}
          />
          <div className="quick" role="group" aria-label={t("fieldReminder")}>
            <button type="button" className="pill-btn" onClick={() => patch({ reminderAt: now + 3_600_000 })}>
              {t("reminderInHour")}
            </button>
            <button type="button" className="pill-btn" onClick={() => patch({ reminderAt: tomorrowAtNine(now) })}>
              {t("reminderTomorrow")}
            </button>
            {task.reminderAt !== null && (
              <button type="button" className="pill-btn" onClick={() => patch({ reminderAt: null })}>
                {t("reminderClear")}
              </button>
            )}
          </div>
          {task.reminderAt === null && task.due && task.time && <p className="muted field__hint">{t("reminderAtDue")}</p>}
        </div>

        <div className="field">
          <span className="field__label" id={`${ids.date}-p`}>
            {t("fieldPriority")}
          </span>
          <div className="priority" role="radiogroup" aria-labelledby={`${ids.date}-p`}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={task.priority === p}
                data-priority={p}
                className={cn("pill-btn", "pill-btn--priority", task.priority === p && "is-active")}
                onClick={() => patch({ priority: p })}
              >
                {t(`priority${p}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor={ids.list}>{t("fieldList")}</label>
            <select id={ids.list} className="input" value={task.listId} onChange={(e) => patch({ listId: e.target.value })}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id === INBOX_ID ? t("navInbox") : `${l.emoji} ${l.name}`.trim()}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.repeat}>{t("fieldRepeat")}</label>
            <select id={ids.repeat} className="input" value={task.repeat} onChange={(e) => patch({ repeat: e.target.value as Repeat })}>
              {REPEATS.map((r) => (
                <option key={r} value={r}>
                  {t(`repeat_${r}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor={ids.tags}>{t("fieldTags")}</label>
          <div className="tag-editor">
            {task.tags.map((tag) => (
              <span key={tag} className="chip chip--tag">
                #{tag}
                <button
                  type="button"
                  aria-label={t("removeTag", { tag })}
                  onClick={() => patch({ tags: task.tags.filter((x) => x !== tag) })}
                >
                  <X aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              id={ids.tags}
              list={`${ids.tags}-list`}
              className="tag-editor__input"
              value={tagDraft}
              placeholder={t("addTagPlaceholder")}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={() => addTag(tagDraft)}
            />
            <datalist id={`${ids.tags}-list`}>
              {everyTag
                .filter((x) => !task.tags.includes(x))
                .map((x) => (
                  <option key={x} value={x} />
                ))}
            </datalist>
          </div>
        </div>

        <div className="field">
          <span className="field__label" id={ids.steps}>
            {t("fieldSubtasks")}
            {task.subtasks.length > 0 && (
              <span className="muted">
                {" "}
                · {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
              </span>
            )}
          </span>
          <ul className="steps" aria-labelledby={ids.steps}>
            {task.subtasks.map((s) => (
              <li key={s.id} className={cn("step", s.done && "step--done")}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.done}
                  aria-label={t("subtaskToggle", { title: s.title })}
                  className="task__check task__check--small"
                  onClick={() => dispatch({ type: "toggleSubtask", id: task.id, subtaskId: s.id })}
                >
                  <Check aria-hidden="true" />
                </button>
                <span className="step__title">{s.title}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t("removeSubtask")}
                  onClick={() => dispatch({ type: "deleteSubtask", id: task.id, subtaskId: s.id })}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="step-add">
            <Plus aria-hidden="true" />
            <input
              className="step-add__input"
              value={stepDraft}
              placeholder={t("addSubtask")}
              aria-label={t("addSubtask")}
              onChange={(e) => setStepDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStep())}
              maxLength={200}
            />
          </div>
        </div>
      </div>

      <footer className="detail__footer">
        <div className="detail__info muted">
          <span>{t("createdOn", { date: when(task.createdAt) })}</span>
          {task.doneAt !== null && <span>{t("completedOn", { date: when(task.doneAt) })}</span>}
          {task.focusMs >= 60_000 && <span>{t("focusSpent", { time: formatDuration(task.focusMs, language) })}</span>}
        </div>
        <div className="detail__actions">
          <Button variant="glass" size="sm" onClick={() => onFocus(task.id)}>
            <Timer aria-hidden="true" /> {t("startFocus")}
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() =>
              dispatch({
                type: "add",
                task: {
                  title: task.title,
                  notes: task.notes,
                  listId: task.listId,
                  priority: task.priority,
                  due: task.due,
                  time: task.time,
                  tags: task.tags,
                  repeat: task.repeat,
                  subtasks: task.subtasks.map((s) => s.title),
                },
              })
            }
          >
            <Copy aria-hidden="true" /> {t("duplicate")}
          </Button>
          <Button
            variant="glass"
            size="sm"
            className="btn--danger"
            onClick={() => {
              remove(task);
              onClose();
            }}
          >
            <Trash2 aria-hidden="true" /> {t("deleteTask")}
          </Button>
        </div>
      </footer>
    </div>
  );
}

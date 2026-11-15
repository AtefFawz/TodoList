import { diffDays, nextOccurrence, toDayKey, type DayKey } from "./dates";
import { INBOX_ID, type Data, type Priority, type Settings, type Subtask, type Task, type TaskList } from "./model";
import type { Repeat } from "./dates";

export interface NewTask {
  title: string;
  notes?: string;
  listId?: string;
  priority?: Priority;
  due?: DayKey | null;
  time?: string | null;
  reminderAt?: number | null;
  tags?: string[];
  repeat?: Repeat;
  subtasks?: string[];
}

export type TaskPatch = Partial<Omit<Task, "id" | "createdAt">>;

export type Action =
  | { type: "add"; task: NewTask }
  | { type: "update"; id: string; patch: TaskPatch }
  | { type: "toggle"; id: string }
  | { type: "snooze"; id: string; minutes: number }
  | { type: "delete"; id: string }
  | { type: "clearDone" }
  | { type: "addSubtask"; id: string; title: string }
  | { type: "toggleSubtask"; id: string; subtaskId: string }
  | { type: "deleteSubtask"; id: string; subtaskId: string }
  | { type: "reorder"; ids: string[] }
  | { type: "addList"; name: string; color: string; emoji?: string }
  | { type: "updateList"; id: string; patch: Partial<Omit<TaskList, "id">> }
  | { type: "deleteList"; id: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "focus"; id: string | null; ms: number }
  | { type: "replace"; data: Data };

/** Everything impure the reducer needs, injected so it stays deterministic and testable. */
export interface Context {
  now: number;
  today: DayKey;
  uid(): string;
}

export const cleanTags = (tags: readonly string[]): string[] => [...new Set(tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean))];

/** Moves an instant by whole calendar days, keeping the local wall-clock time (DST-safe). */
const shiftDays = (instant: number, days: number): number => {
  const d = new Date(instant);
  d.setDate(d.getDate() + days);
  return d.getTime();
};

const mapTask = (data: Data, id: string, fn: (task: Task) => Task): Data => ({
  ...data,
  tasks: data.tasks.map((t) => (t.id === id ? fn(t) : t)),
});

const bump = (record: Record<string, number>, key: string, delta: number): Record<string, number> => {
  const next = Math.max(0, (record[key] ?? 0) + delta);
  const rest = Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
  return next === 0 ? rest : { ...rest, [key]: next };
};

/** Pure state transition. Unknown ids are ignored rather than thrown on, so a stale UI can't crash the app. */
export function reduce(data: Data, action: Action, ctx: Context): Data {
  switch (action.type) {
    case "add": {
      const title = action.task.title.trim();
      if (!title) return data;
      const listId = data.lists.some((l) => l.id === action.task.listId) ? action.task.listId! : INBOX_ID;
      const order = data.tasks.reduce((max, t) => Math.max(max, t.order), 0) + 1;
      const task: Task = {
        id: ctx.uid(),
        title,
        notes: action.task.notes?.trim() ?? "",
        done: false,
        doneAt: null,
        createdAt: ctx.now,
        listId,
        priority: action.task.priority ?? 0,
        due: action.task.due ?? null,
        time: action.task.due ? (action.task.time ?? null) : null,
        reminderAt: action.task.reminderAt ?? null,
        tags: cleanTags(action.task.tags ?? []),
        subtasks: (action.task.subtasks ?? []).filter((s) => s.trim()).map((s) => ({ id: ctx.uid(), title: s.trim(), done: false })),
        repeat: action.task.repeat ?? "none",
        pinned: false,
        focusMs: 0,
        order,
      };
      return { ...data, tasks: [...data.tasks, task] };
    }

    case "update":
      return mapTask(data, action.id, (t) => {
        const next: Task = { ...t, ...action.patch };
        if (action.patch.title !== undefined) next.title = action.patch.title.trim() || t.title;
        if (action.patch.tags) next.tags = cleanTags(action.patch.tags);
        if (action.patch.due === null) next.time = null; // a time without a day is meaningless
        return next;
      });

    case "toggle": {
      const task = data.tasks.find((t) => t.id === action.id);
      if (!task) return data;
      if (task.done) {
        const day = task.doneAt === null ? ctx.today : toDayKey(new Date(task.doneAt));
        return { ...mapTask(data, task.id, (t) => ({ ...t, done: false, doneAt: null })), history: bump(data.history, day, -1) };
      }
      const history = bump(data.history, ctx.today, 1);
      if (task.repeat !== "none") {
        // A repeating task is never "done": completing it schedules the next occurrence and resets its checklist.
        const due = nextOccurrence(task.due, task.repeat, ctx.today);
        // An explicit reminder travels with the task: keep the same offset from the new date.
        const shift = diffDays(task.due ?? ctx.today, due ?? ctx.today);
        const reminderAt = task.reminderAt === null ? null : shiftDays(task.reminderAt, shift);
        return {
          ...mapTask(data, task.id, (t) => ({ ...t, due, reminderAt, subtasks: t.subtasks.map((s) => ({ ...s, done: false })) })),
          history,
        };
      }
      return { ...mapTask(data, task.id, (t) => ({ ...t, done: true, doneAt: ctx.now, reminderAt: null })), history };
    }

    case "snooze":
      return mapTask(data, action.id, (t) => ({ ...t, reminderAt: ctx.now + Math.max(1, action.minutes) * 60_000 }));

    case "delete":
      return data.tasks.some((t) => t.id === action.id) ? { ...data, tasks: data.tasks.filter((t) => t.id !== action.id) } : data;

    case "clearDone":
      return data.tasks.some((t) => t.done) ? { ...data, tasks: data.tasks.filter((t) => !t.done) } : data;

    case "addSubtask": {
      const title = action.title.trim();
      if (!title) return data;
      return mapTask(data, action.id, (t) => ({ ...t, subtasks: [...t.subtasks, { id: ctx.uid(), title, done: false }] }));
    }
    case "toggleSubtask":
      return mapTask(data, action.id, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s): Subtask => (s.id === action.subtaskId ? { ...s, done: !s.done } : s)),
      }));
    case "deleteSubtask":
      return mapTask(data, action.id, (t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== action.subtaskId) }));

    case "reorder": {
      const wanted = action.ids.filter((id) => data.tasks.some((t) => t.id === id));
      const slots = wanted.map((id) => data.tasks.find((t) => t.id === id)!.order).sort((a, b) => a - b);
      const orderOf = new Map(wanted.map((id, i) => [id, slots[i]!]));
      return { ...data, tasks: data.tasks.map((t) => (orderOf.has(t.id) ? { ...t, order: orderOf.get(t.id)! } : t)) };
    }

    case "addList": {
      const name = action.name.trim();
      if (!name) return data;
      return { ...data, lists: [...data.lists, { id: ctx.uid(), name, color: action.color, emoji: action.emoji ?? "" }] };
    }
    case "updateList":
      return { ...data, lists: data.lists.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)) };
    case "deleteList":
      if (action.id === INBOX_ID) return data;
      return {
        ...data,
        lists: data.lists.filter((l) => l.id !== action.id),
        tasks: data.tasks.map((t) => (t.listId === action.id ? { ...t, listId: INBOX_ID } : t)),
      };

    case "settings":
      return { ...data, settings: { ...data.settings, ...action.patch } };

    case "focus": {
      if (action.ms <= 0) return data;
      const withTask = action.id ? mapTask(data, action.id, (t) => ({ ...t, focusMs: t.focusMs + action.ms })) : data;
      return { ...withTask, focusHistory: { ...data.focusHistory, [ctx.today]: (data.focusHistory[ctx.today] ?? 0) + action.ms } };
    }

    case "replace":
      return action.data;
  }
}

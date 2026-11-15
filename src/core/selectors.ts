import { addDays, diffDays, dueAt, type DayKey } from "./dates";
import { INBOX_ID, type Data, type Task } from "./model";
import { normalize } from "./quick-add";

export type View =
  | { kind: "inbox" }
  | { kind: "today" }
  | { kind: "upcoming" }
  | { kind: "all" }
  | { kind: "done" }
  | { kind: "stats" }
  | { kind: "list"; id: string }
  | { kind: "tag"; tag: string };

export const viewKey = (view: View): string =>
  view.kind === "list" ? `list:${view.id}` : view.kind === "tag" ? `tag:${view.tag}` : view.kind;

export function parseViewKey(key: string): View {
  if (key.startsWith("list:")) return { kind: "list", id: key.slice(5) };
  if (key.startsWith("tag:")) return { kind: "tag", tag: key.slice(4) };
  switch (key) {
    case "inbox": case "today": case "upcoming": case "all": case "done": case "stats":
      return { kind: key };
    default:
      return { kind: "today" };
  }
} // prettier-ignore

export const isOverdue = (task: Task, now: number): boolean => !task.done && task.due !== null && dueAt(task.due, task.time) < now;

/** Case/diacritic-insensitive match across everything a user could remember about a task. */
export function matchesQuery(task: Task, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize([task.title, task.notes, ...task.tags, ...task.subtasks.map((s) => s.title)].join(" "));
  return terms.every((term) => haystack.includes(term));
}

export type Sort = "manual" | "due" | "priority" | "created";

export function sortTasks(tasks: readonly Task[], sort: Sort): Task[] {
  const byDue = (a: Task, b: Task) => {
    if (a.due === b.due) return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
    if (a.due === null) return 1;
    if (b.due === null) return -1;
    return a.due.localeCompare(b.due);
  };
  const compare: Record<Sort, (a: Task, b: Task) => number> = {
    manual: (a, b) => a.order - b.order,
    due: (a, b) => byDue(a, b) || b.priority - a.priority || a.order - b.order,
    priority: (a, b) => b.priority - a.priority || byDue(a, b) || a.order - b.order,
    created: (a, b) => b.createdAt - a.createdAt,
  };
  return [...tasks].sort((a, b) => Number(b.pinned) - Number(a.pinned) || compare[sort](a, b));
}

export interface Selection {
  open: Task[];
  done: Task[];
}

export function selectTasks(data: Data, view: View, options: { today: DayKey; query: string; now: number }): Selection {
  const { today, query } = options;
  const all = data.tasks;
  if (query.trim()) {
    const hits = all.filter((t) => matchesQuery(t, query));
    return {
      open: sortTasks(
        hits.filter((t) => !t.done),
        data.settings.sort,
      ),
      done: hits.filter((t) => t.done),
    };
  }
  const inScope = (t: Task): boolean => {
    switch (view.kind) {
      case "inbox": return t.listId === INBOX_ID;
      case "list": return t.listId === view.id;
      case "tag": return t.tags.includes(view.tag);
      default: return true;
    }
  }; // prettier-ignore
  const sort = data.settings.sort;
  switch (view.kind) {
    case "today":
      return {
        open: sortTasks(
          all.filter((t) => !t.done && t.due !== null && t.due <= today),
          "due",
        ),
        done: all.filter((t) => t.done && t.doneAt !== null && localDay(t.doneAt) === today),
      };
    case "upcoming":
      return {
        open: sortTasks(
          all.filter((t) => !t.done && t.due !== null && t.due > today),
          "due",
        ),
        done: [],
      };
    case "done":
      return { open: [], done: [...all.filter((t) => t.done)].sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)) };
    case "stats":
      return { open: [], done: [] };
    default:
      return {
        open: sortTasks(
          all.filter((t) => !t.done && inScope(t)),
          sort,
        ),
        done: all.filter((t) => t.done && inScope(t)).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
      };
  }
}

function localDay(ms: number): DayKey {
  const d = new Date(ms);
  return `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type GroupKey = "overdue" | "today" | "tomorrow" | "later" | "none" | DayKey;
export interface Group {
  key: GroupKey;
  tasks: Task[];
}

/** Buckets tasks by when they are due. Days within the next week get their own group; the rest collapse into "later". */
export function groupByDay(tasks: readonly Task[], today: DayKey): Group[] {
  const buckets = new Map<GroupKey, Task[]>();
  const push = (key: GroupKey, task: Task) => buckets.set(key, [...(buckets.get(key) ?? []), task]);
  for (const task of tasks) {
    if (task.due === null) push("none", task);
    else {
      const delta = diffDays(today, task.due);
      if (delta < 0) push("overdue", task);
      else if (delta === 0) push("today", task);
      else if (delta === 1) push("tomorrow", task);
      else if (delta <= 6) push(task.due, task);
      else push("later", task);
    }
  }
  const dated = [...buckets.keys()].filter((k) => /^\d{4}-/.test(k)).sort();
  const order: GroupKey[] = ["overdue", "today", "tomorrow", ...dated, "later", "none"];
  return order.flatMap((key) => (buckets.has(key) ? [{ key, tasks: buckets.get(key)! }] : []));
}

export interface Counts {
  inbox: number;
  today: number;
  upcoming: number;
  all: number;
  done: number;
  overdue: number;
  lists: Record<string, number>;
  tags: Record<string, number>;
}

export function computeCounts(data: Data, today: DayKey): Counts {
  const counts: Counts = { inbox: 0, today: 0, upcoming: 0, all: 0, done: 0, overdue: 0, lists: {}, tags: {} };
  for (const t of data.tasks) {
    if (t.done) {
      counts.done += 1;
      continue;
    }
    counts.all += 1;
    if (t.listId === INBOX_ID) counts.inbox += 1;
    counts.lists[t.listId] = (counts.lists[t.listId] ?? 0) + 1;
    for (const tag of t.tags) counts.tags[tag] = (counts.tags[tag] ?? 0) + 1;
    if (t.due !== null) {
      if (t.due <= today) counts.today += 1;
      else counts.upcoming += 1;
      if (t.due < today) counts.overdue += 1;
    }
  }
  return counts;
}

export function allTags(data: Pick<Data, "tasks">): string[] {
  return [...new Set(data.tasks.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b));
}

export function subtaskProgress(task: Task): { done: number; total: number } {
  return { done: task.subtasks.filter((s) => s.done).length, total: task.subtasks.length };
}

export { addDays };

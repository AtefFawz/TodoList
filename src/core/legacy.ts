import { isDayKey, toDayKey } from "./dates";
import { INBOX_ID, LIST_COLORS, defaultData, type Data, type Priority, type Task, type TaskList } from "./model";

/**
 * v1 stored a bare array under the key "data": `{ id, heading, description, complete }`
 * (new items were saved with a capital-C `Complete`, which the old UI never read: both spellings are accepted).
 */
export function migrateLegacyTasks(raw: unknown, now: number): Data | null {
  if (!Array.isArray(raw)) return null;
  const tasks: Task[] = [];
  raw.forEach((item: unknown, index) => {
    if (typeof item !== "object" || item === null) return;
    const o = item as Record<string, unknown>;
    const title = typeof o["heading"] === "string" ? o["heading"].trim() : typeof o["title"] === "string" ? o["title"].trim() : "";
    if (!title || typeof o["id"] !== "string") return;
    const done = o["complete"] === true || o["Complete"] === true;
    tasks.push({
      id: o["id"],
      title,
      notes: typeof o["description"] === "string" ? o["description"] : "",
      done,
      doneAt: done ? now : null,
      createdAt: now - (raw.length - index) * 1000,
      listId: INBOX_ID,
      priority: 0,
      due: null,
      time: null,
      reminderAt: null,
      tags: [],
      subtasks: [],
      repeat: "none",
      pinned: false,
      focusMs: 0,
      order: index + 1,
    });
  });
  return { ...defaultData(), tasks };
}

const NAWA_V5_COLORS: Record<string, string> = { العمل: "#7668e8", شخصي: "#e3a34c", التعلّم: "#35a6a0", الصحة: "#e17893" };
const PRIORITY_FROM_V5: Record<string, Priority> = { high: 3, medium: 2, low: 1 };

const instant = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Nawa 5.x stored `nawa.tasks.v2`: `{ title, description, completed, priority: high|medium|low, category, dueDate, reminderAt ISO }`.
 * Each distinct category becomes a list (keeping its colour), the 3-level priority maps onto the 1–3 scale,
 * and the reminder instant is preserved. Both v1 (`heading`/`complete`) and v5 spellings are accepted.
 */
export function migrateNawaV5(raw: unknown, now: number): Data | null {
  if (!Array.isArray(raw)) return null;
  const lists = new Map<string, TaskList>();
  const listFor = (label: string): string => {
    const name = label.trim().slice(0, 32);
    if (!name) return INBOX_ID;
    let list = lists.get(name);
    if (!list) {
      list = {
        id: `cat-${lists.size + 1}`,
        name,
        color: NAWA_V5_COLORS[name] ?? LIST_COLORS[(lists.size + 4) % LIST_COLORS.length]!,
        emoji: "",
      };
      lists.set(name, list);
    }
    return list.id;
  };

  const tasks: Task[] = [];
  const seen = new Set<string>();
  raw.forEach((item: unknown, index) => {
    if (typeof item !== "object" || item === null) return;
    const o = item as Record<string, unknown>;
    const titleRaw = o["title"] ?? o["heading"];
    const title = typeof titleRaw === "string" ? titleRaw.trim().slice(0, 120) : "";
    if (!title) return;
    let id = typeof o["id"] === "string" && o["id"].trim() ? o["id"].trim() : `task-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index}`;
    seen.add(id);
    const done = o["completed"] === true || o["complete"] === true || o["Complete"] === true;
    const createdAt = instant(o["createdAt"]) ?? now - (raw.length - index) * 1000;
    const dueRaw = o["dueDate"];
    tasks.push({
      id,
      title,
      notes: typeof o["description"] === "string" ? o["description"].trim().slice(0, 1000) : "",
      done,
      doneAt: done ? (instant(o["completedAt"]) ?? createdAt) : null,
      createdAt,
      listId: listFor(typeof o["category"] === "string" ? o["category"] : ""),
      priority: typeof o["priority"] === "string" ? (PRIORITY_FROM_V5[o["priority"]] ?? 0) : 0,
      due: typeof dueRaw === "string" && isDayKey(dueRaw) ? dueRaw : null,
      time: null,
      reminderAt: done ? null : instant(o["reminderAt"]),
      tags: [],
      subtasks: [],
      repeat: "none",
      pinned: false,
      focusMs: 0,
      order: index + 1,
    });
  });

  // Completion history so the new streak/insights start from the real past instead of zero.
  const history: Record<string, number> = {};
  for (const t of tasks) if (t.doneAt !== null) history[toDayKey(new Date(t.doneAt))] = (history[toDayKey(new Date(t.doneAt))] ?? 0) + 1;

  const base = defaultData();
  return { ...base, tasks, history, lists: [...base.lists, ...lists.values()] };
}

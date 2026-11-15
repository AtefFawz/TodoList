import { dueAt } from "./dates";
import type { Task } from "./model";

/** A reminder older than this is marked as handled but never replayed (the app was closed for a day). */
export const REMINDER_GRACE_MS = 24 * 60 * 60 * 1000;
export const MAX_DELIVERED = 500;
/** Android/iOS cap the pending-notification queue, so only the nearest reminders are scheduled. */
export const MAX_NATIVE_REMINDERS = 60;

/** When a task should remind: an explicit instant wins, otherwise its due time, otherwise never. */
export function reminderTime(task: Pick<Task, "done" | "reminderAt" | "due" | "time">): number | null {
  if (task.done) return null;
  if (task.reminderAt !== null) return task.reminderAt;
  if (task.due !== null && task.time !== null) return dueAt(task.due, task.time);
  return null;
}

export const reminderKey = (task: Task): string => `${task.id}:${reminderTime(task)}`;

export type Delivered = Record<string, number>;

export interface DueResult {
  /** Reminders to announce now. */
  due: Task[];
  delivered: Delivered;
  changed: boolean;
}

/**
 * Reminders that became due exactly once per (task, instant) pair.
 * Anything missed by more than {@link REMINDER_GRACE_MS} is recorded as delivered without being announced.
 */
export function collectDue(tasks: readonly Task[], delivered: Delivered, now: number): DueResult {
  const next: Delivered = { ...delivered };
  const due: Task[] = [];
  let changed = false;

  for (const task of tasks) {
    const at = reminderTime(task);
    if (at === null || at > now) continue;
    const key = reminderKey(task);
    if (key in next) continue;
    next[key] = now;
    changed = true;
    if (now - at <= REMINDER_GRACE_MS) due.push(task);
  }

  const keys = Object.keys(next);
  if (keys.length > MAX_DELIVERED) {
    const keep = new Set(keys.sort((a, b) => next[b]! - next[a]!).slice(0, MAX_DELIVERED));
    for (const key of Object.keys(next)) if (!keep.has(key)) delete next[key];
    changed = true;
  }
  return { due, delivered: next, changed };
}

/** The nearest future reminders, soonest first: exactly what gets scheduled with the operating system. */
export function upcomingReminders(tasks: readonly Task[], now: number, limit = MAX_NATIVE_REMINDERS): Array<{ task: Task; at: number }> {
  return tasks
    .flatMap((task) => {
      const at = reminderTime(task);
      return at !== null && at > now ? [{ task, at }] : [];
    })
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
}

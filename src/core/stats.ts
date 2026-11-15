import { addDays, type DayKey } from "./dates";
import type { Data } from "./model";

export interface Stats {
  /** Consecutive days with at least one completed task, ending today (or yesterday if nothing is done yet today). */
  streak: number;
  bestStreak: number;
  doneToday: number;
  /** The last 7 days, oldest first. */
  week: Array<{ day: DayKey; count: number; focusMs: number }>;
  weekTotal: number;
  totalCompleted: number;
  focusMsToday: number;
  focusMsTotal: number;
  open: number;
  overdue: number;
  openByPriority: [number, number, number, number];
  /** Average tasks completed per day over the last 7 days. */
  dailyAverage: number;
}

export function computeStats(data: Data, today: DayKey): Stats {
  const count = (day: DayKey) => data.history[day] ?? 0;

  let streak = 0;
  let cursor = count(today) > 0 ? today : addDays(today, -1);
  while (count(cursor) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const days = Object.keys(data.history)
    .filter((d) => count(d) > 0)
    .sort();
  let best = 0;
  let run = 0;
  let previous: DayKey | null = null;
  for (const day of days) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, count: count(day), focusMs: data.focusHistory[day] ?? 0 };
  });
  const weekTotal = week.reduce((sum, d) => sum + d.count, 0);

  const openTasks = data.tasks.filter((t) => !t.done);
  const openByPriority: [number, number, number, number] = [0, 0, 0, 0];
  for (const t of openTasks) openByPriority[t.priority] += 1;

  return {
    streak,
    bestStreak: Math.max(best, streak),
    doneToday: count(today),
    week,
    weekTotal,
    totalCompleted: Object.values(data.history).reduce((a, b) => a + b, 0),
    focusMsToday: data.focusHistory[today] ?? 0,
    focusMsTotal: Object.values(data.focusHistory).reduce((a, b) => a + b, 0),
    open: openTasks.length,
    overdue: openTasks.filter((t) => t.due !== null && t.due < today).length,
    openByPriority,
    dailyAverage: weekTotal / 7,
  };
}

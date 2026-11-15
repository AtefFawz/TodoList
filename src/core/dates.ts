/**
 * Calendar math on local-date keys ("YYYY-MM-DD"). Everything here is pure and takes "today" explicitly,
 * so behaviour never depends on the machine's clock or timezone.
 */
export type DayKey = string;

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string") return false;
  const m = KEY.exec(value);
  if (!m) return false;
  const d = fromDayKey(value);
  return toDayKey(d) === value;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function toDayKey(date: Date): DayKey {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local noon avoids DST edge cases when adding days. */
export function fromDayKey(key: DayKey): Date {
  const m = KEY.exec(key);
  if (!m) throw new RangeError(`Invalid day key: ${key}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + days);
  return toDayKey(d);
}

export function addMonths(key: DayKey, months: number): DayKey {
  const d = fromDayKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay)); // Jan 31 + 1 month = Feb 28/29, not Mar 3
  return toDayKey(d);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((fromDayKey(b).getTime() - fromDayKey(a).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: DayKey): number {
  return fromDayKey(key).getDay();
}

/** The next date strictly after `from` that falls on `target` (0 = Sunday). */
export function nextWeekday(from: DayKey, target: number): DayKey {
  const delta = (target - weekday(from) + 7) % 7;
  return addDays(from, delta === 0 ? 7 : delta);
}

export function startOfWeek(key: DayKey, weekStart: number): DayKey {
  return addDays(key, -((weekday(key) - weekStart + 7) % 7));
}

export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";

/**
 * The next occurrence of a repeating task. It advances from the later of the old due date and `today`,
 * so completing a task that was overdue by weeks does not leave it overdue again.
 */
export function nextOccurrence(due: DayKey | null, repeat: Repeat, today: DayKey): DayKey | null {
  if (repeat === "none") return null;
  const base = due !== null && diffDays(today, due) > 0 ? due : today;
  const anchor = due ?? today;
  switch (repeat) {
    case "daily":
      return addDays(base, 1);
    case "weekdays": {
      let next = addDays(base, 1);
      while (weekday(next) === 0 || weekday(next) === 6) next = addDays(next, 1); // skip Sat/Sun
      return next;
    }
    case "weekly": {
      let next = addDays(anchor, 7);
      while (diffDays(today, next) <= 0) next = addDays(next, 7);
      return next;
    }
    case "monthly": {
      let n = 1;
      let next = addMonths(anchor, n);
      while (diffDays(today, next) <= 0) next = addMonths(anchor, ++n);
      return next;
    }
  }
}

/** "HH:mm" validation and helpers. */
export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** Epoch ms of a task's due moment (end of day when it has no time). */
export function dueAt(due: DayKey, time: string | null): number {
  const d = fromDayKey(due);
  if (time) d.setHours(Math.floor(minutesOf(time) / 60), minutesOf(time) % 60, 0, 0);
  else d.setHours(23, 59, 59, 999);
  return d.getTime();
}

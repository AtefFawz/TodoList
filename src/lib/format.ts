import { addDays, diffDays, fromDayKey, toDayKey, type DayKey } from "@/core/dates";
import type { Translator } from "@/i18n";

/** "09:30" → "9:30 AM" / "٩:٣٠ ص" in the user's locale. */
export function formatTime(time: string, locale: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(2000, 0, 1, h ?? 0, m ?? 0);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
}

/** Relative where it helps (Today, Tomorrow, Yesterday), a weekday this week, otherwise a short date. */
export function formatDay(day: DayKey, today: DayKey, locale: string, t: Translator): string {
  const delta = diffDays(today, day);
  if (delta === 0) return t("dateToday");
  if (delta === 1) return t("dateTomorrow");
  if (delta === -1) return t("dateYesterday");
  const date = fromDayKey(day);
  if (delta > 1 && delta < 7) return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat(
    locale,
    sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" },
  ).format(date);
}

export const formatLongDate = (day: DayKey, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(fromDayKey(day));

export const formatShortWeekday = (day: DayKey, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: "short" }).format(fromDayKey(day));

/** 5400000 → "1h 30m" / "1 س 30 د". */
export function formatDuration(ms: number, language: "ar" | "en"): string {
  const minutes = Math.round(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const [hu, mu] = language === "ar" ? ["س", "د"] : ["h", "m"];
  if (h === 0) return `${m}${language === "ar" ? " " : ""}${mu}`;
  return m === 0 ? `${h} ${hu}` : `${h} ${hu} ${m} ${mu}`;
}

export { addDays };

/** "Today, 5:00 PM" · "Tomorrow, 9:00 AM" · "Nov 20, 8:30 PM". */
export function formatDateTime(instant: number, now: number, locale: string, t: Translator): string {
  const date = new Date(instant);
  const day = formatDay(toDayKey(date), toDayKey(new Date(now)), locale, t);
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
  return `${day}, ${time}`;
}

/** The value a `<input type="datetime-local">` expects, in local time. */
export function toLocalInputValue(instant: number | null): string {
  if (instant === null) return "";
  const d = new Date(instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

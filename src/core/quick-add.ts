import { addDays, addMonths, nextWeekday, type DayKey, type Repeat } from "./dates";
import type { Priority } from "./model";

/**
 * Natural-language quick add, in Arabic (incl. Egyptian) and English:
 *   "اشتري لبن بكرة 5م #بيت !عالي"   "Call mom tomorrow 6pm !high #family every week"
 * Unrecognised words stay in the title, so the parser never swallows meaning by accident.
 */
export interface ParsedTask {
  title: string;
  due: DayKey | null;
  time: string | null;
  priority: Priority;
  tags: string[];
  /** `@list` reference, unresolved. */
  list: string | null;
  repeat: Repeat;
}

export interface ParseOptions {
  today: DayKey;
  /** Current time as "HH:mm" (used to roll a bare time that already passed to tomorrow). */
  nowTime?: string;
  /** Field order for numeric dates like 3/12. Arabic users expect day/month. */
  dateOrder?: "dmy" | "mdy";
}

/** Fold Arabic spelling variants and digits so "الإثنين", "الاثنين" and "الاتنين" compare equal. */
export function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[،,.!?؟؛;:]+$/u, (m) => (word.startsWith("!") ? m : ""));
}

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
  الاحد: 0, الاثنين: 1, الاتنين: 1, الثنين: 1, الثلاثاء: 2, التلات: 2, الثلاثا: 2, الاربعاء: 3, الاربع: 3, الخميس: 4, الجمعه: 5, السبت: 6,
}; // prettier-ignore

/** Short English forms double as ordinary words ("sat", "sun"), so they only count after on/next/every. */
const AMBIGUOUS_ABBREVIATIONS = new Set(["sun", "mon", "tue", "tues", "wed", "thu", "thur", "thurs", "sat"]);

const TODAY = new Set(["today", "tonight", "اليوم", "النهارده", "النهاردة", "انهارده", "انهرده", "النهارضه"]);
const TOMORROW = new Set(["tomorrow", "tmrw", "tmr", "tomorow", "بكره", "بكرا", "غدا", "غدن"]);
const AFTER_TOMORROW = new Set(["بعد بكره", "بعد بكرا", "بعد غد", "بعد غدا"]);
const NEXT_WORD = new Set(["next", "القادم", "الجاي", "الجايه", "القادمه", "الجاى"]);
const PRIORITY_WORDS: Record<string, Priority> = {
  "1": 1, low: 1, منخفض: 1, بسيط: 1, "2": 2, med: 2, medium: 2, متوسط: 2, "3": 3, high: 3, urgent: 3, عالي: 3, مهم: 3, عاجل: 3, مستعجل: 3,
}; // prettier-ignore
const AM = new Set(["am", "a.m", "ص", "صباحا", "الصبح", "صباحاً"]);
const PM = new Set(["pm", "p.m", "م", "مساء", "مساءا", "بالليل", "العصر", "المغرب", "ليلا"]);

const UNIT_DAYS: Array<[RegExp, "day" | "week" | "month"]> = [
  [/^(day|days|يوم|ايام)$/, "day"],
  [/^(week|weeks|اسبوع|اسابيع)$/, "week"],
  [/^(month|months|شهر|شهور|اشهر)$/, "month"],
];

const REPEAT_PHRASES: Array<[string[], Repeat]> = [
  [["every", "day"], "daily"], [["كل", "يوم"], "daily"], [["daily"], "daily"], [["يوميا"], "daily"],
  [["every", "weekday"], "weekdays"], [["weekdays"], "weekdays"], [["ايام", "العمل"], "weekdays"],
  [["every", "week"], "weekly"], [["weekly"], "weekly"], [["كل", "اسبوع"], "weekly"], [["اسبوعيا"], "weekly"],
  [["every", "month"], "monthly"], [["monthly"], "monthly"], [["كل", "شهر"], "monthly"], [["شهريا"], "monthly"],
]; // prettier-ignore

function applyMeridiem(hour: number, marker: "am" | "pm" | null): number {
  if (marker === "pm" && hour < 12) return hour + 12;
  if (marker === "am" && hour === 12) return 0;
  return hour;
}

function formatTime(hour: number, minute: number): string | null {
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** A single token such as 5pm, 5:30pm, 17:30, 5م. Returns the time and whether it carried its own marker. */
function parseClock(token: string): { time: string; explicit: boolean } | null {
  const m = /^(\d{1,2})(?::(\d{2}))?(am|pm|ص|م)?$/.exec(token);
  if (!m) return null;
  const marker = m[3] === "am" || m[3] === "ص" ? "am" : m[3] ? "pm" : null;
  if (!marker && m[2] === undefined) return null; // a bare "5" is not a time on its own
  const hour = Number(m[1]);
  if (marker && (hour < 1 || hour > 12)) return null;
  const time = formatTime(applyMeridiem(hour, marker), Number(m[2] ?? 0));
  return time ? { time, explicit: marker !== null || m[2] !== undefined } : null;
}

export function parseQuickAdd(input: string, options: ParseOptions): ParsedTask {
  const words = input.trim().split(/\s+/).filter(Boolean);
  const norm = words.map(normalize);
  const used = new Array<boolean>(words.length).fill(false);

  const result: ParsedTask = { title: "", due: null, time: null, priority: 0, tags: [], list: null, repeat: "none" };
  const take = (from: number, count: number) => {
    for (let k = from; k < from + count; k++) used[k] = true;
  };
  const free = (from: number, count: number) => {
    for (let k = from; k < from + count; k++) if (used[k] || norm[k] === undefined) return false;
    return true;
  };
  const dateOrder = options.dateOrder ?? "dmy";

  for (let i = 0; i < words.length; i++) {
    if (used[i]) continue;
    const raw = words[i] ?? "";
    const w = norm[i] ?? "";
    const next = norm[i + 1];
    const next2 = norm[i + 2];

    // --- #tag, @list, !priority ------------------------------------------------------------
    if (/^#[\p{L}\p{N}_-]+$/u.test(raw)) {
      const tag = raw.slice(1);
      if (!result.tags.includes(tag)) result.tags.push(tag);
      take(i, 1);
      continue;
    }
    if (/^@[\p{L}\p{N}_-]+$/u.test(raw)) {
      result.list = raw.slice(1);
      take(i, 1);
      continue;
    }
    if (raw.startsWith("!")) {
      const bangs = /^(!{2,3})$/.exec(raw);
      if (bangs) {
        result.priority = bangs[1]!.length as Priority;
        take(i, 1);
        continue;
      }
      const level = PRIORITY_WORDS[w.slice(1)];
      if (level !== undefined) {
        result.priority = level;
        take(i, 1);
        continue;
      }
    }

    // --- repeat ---------------------------------------------------------------------------
    const phrase = REPEAT_PHRASES.find(([parts]) => free(i, parts.length) && parts.every((p, k) => norm[i + k] === p));
    if (phrase) {
      result.repeat = phrase[1];
      take(i, phrase[0].length);
      continue;
    }
    // "every monday" → weekly, anchored on that weekday
    if ((w === "every" || w === "كل") && next !== undefined && WEEKDAYS[next] !== undefined && free(i, 2)) {
      result.repeat = "weekly";
      result.due = nextWeekday(options.today, WEEKDAYS[next]!);
      take(i, 2);
      continue;
    }

    // --- relative dates ------------------------------------------------------------------
    if (next !== undefined && AFTER_TOMORROW.has(`${w} ${next}`) && free(i, 2)) {
      result.due = addDays(options.today, 2);
      take(i, 2);
      continue;
    }
    if (TODAY.has(w)) {
      result.due = options.today;
      take(i, 1);
      continue;
    }
    if (TOMORROW.has(w)) {
      result.due = addDays(options.today, 1);
      take(i, 1);
      continue;
    }
    // next week / الأسبوع الجاي, next month
    if (next !== undefined && free(i, 2)) {
      const nextFirst = NEXT_WORD.has(w) && UNIT_DAYS.some(([re]) => re.test(next));
      const unitFirst = NEXT_WORD.has(next) && /^(الاسبوع|الشهر)$/.test(w);
      const arabicNext = /^(الاسبوع|الشهر)$/.test(w) && NEXT_WORD.has(next);
      if (nextFirst || unitFirst || arabicNext) {
        const unit = nextFirst ? next : w;
        const isMonth = /month|شهر/.test(unit);
        result.due = isMonth ? addMonths(options.today, 1) : addDays(options.today, 7);
        take(i, 2);
        continue;
      }
    }
    // next monday / monday / يوم الاثنين / الأحد الجاي
    {
      let j = i;
      let skipNext = false;
      if (w === "next" && next !== undefined && WEEKDAYS[next] !== undefined) {
        j = i + 1;
        skipNext = true;
      } else if ((w === "on" || w === "يوم") && next !== undefined && WEEKDAYS[next] !== undefined) {
        j = i + 1;
      }
      const name = norm[j] ?? "";
      const day = WEEKDAYS[name];
      const bareAbbreviation = j === i && AMBIGUOUS_ABBREVIATIONS.has(name);
      if (day !== undefined && !bareAbbreviation && free(i, j - i + 1)) {
        let length = j - i + 1;
        const after = norm[i + length];
        if (!skipNext && after !== undefined && NEXT_WORD.has(after) && free(i, length + 1)) length += 1;
        result.due = nextWeekday(options.today, day);
        take(i, length);
        continue;
      }
    }
    // in 3 days / بعد 3 أيام / بعد يومين
    if ((w === "in" || w === "بعد") && next !== undefined && free(i, 3)) {
      const amount = /^\d+$/.test(next) ? Number(next) : null;
      const unitWord = next2;
      if (amount !== null && unitWord !== undefined) {
        const unit = UNIT_DAYS.find(([re]) => re.test(unitWord))?.[1];
        if (unit) {
          result.due =
            unit === "day"
              ? addDays(options.today, amount)
              : unit === "week"
                ? addDays(options.today, amount * 7)
                : addMonths(options.today, amount);
          take(i, 3);
          continue;
        }
      }
    }
    if (w === "بعد" && next !== undefined && free(i, 2)) {
      const dual: Record<string, number> = { يومين: 2, اسبوعين: 14, شهرين: 0 };
      if (next === "يومين" || next === "اسبوعين") {
        result.due = addDays(options.today, dual[next]!);
        take(i, 2);
        continue;
      }
      if (next === "شهرين") {
        result.due = addMonths(options.today, 2);
        take(i, 2);
        continue;
      }
    }

    // --- absolute dates ------------------------------------------------------------------
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w);
    if (iso) {
      const candidate = `${iso[1]}-${iso[2]}-${iso[3]}`;
      if (!Number.isNaN(Date.parse(candidate)) && new Date(`${candidate}T12:00:00`).getMonth() + 1 === Number(iso[2])) {
        result.due = candidate;
        take(i, 1);
        continue;
      }
    }
    const numeric = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/.exec(w);
    if (numeric) {
      const a = Number(numeric[1]);
      const b = Number(numeric[2]);
      const [day, month] = dateOrder === "dmy" ? [a, b] : [b, a];
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        let year = numeric[3] ? Number(numeric[3]) : Number(options.today.slice(0, 4));
        if (year < 100) year += 2000;
        let key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const valid = new Date(`${key}T12:00:00`).getDate() === day;
        if (valid) {
          if (!numeric[3] && key < options.today) key = `${year + 1}${key.slice(4)}`;
          result.due = key;
          take(i, 1);
          continue;
        }
      }
    }

    // --- time ------------------------------------------------------------------------------
    // "at 5pm" / "الساعة 5 م" / "5pm" / "17:30"
    {
      const hasPrefix = w === "at" || w === "الساعه" || w === "ساعه" || w === "عند";
      const start = hasPrefix ? i + 1 : i;
      const token = norm[start];
      if (token !== undefined && !used[start]) {
        const single = parseClock(token);
        if (single && !(norm[start + 1] && (AM.has(norm[start + 1]!) || PM.has(norm[start + 1]!)) && !/(am|pm|ص|م)$/.test(token))) {
          result.time = single.time;
          take(i, start - i + 1);
          continue;
        }
        const hourOnly = /^(\d{1,2})(?::(\d{2}))?$/.exec(token);
        const markerWord = norm[start + 1];
        if (hourOnly && markerWord !== undefined && !used[start + 1] && (AM.has(markerWord) || PM.has(markerWord))) {
          const marker = AM.has(markerWord) ? "am" : "pm";
          const hour = Number(hourOnly[1]);
          if (hour >= 1 && hour <= 12) {
            const time = formatTime(applyMeridiem(hour, marker), Number(hourOnly[2] ?? 0));
            if (time) {
              result.time = time;
              take(i, start - i + 2);
              continue;
            }
          }
        }
        // "الساعة 5" with no marker: read as 24h clock, but only after an explicit "at"/"الساعة"
        if (hasPrefix && hourOnly) {
          const time = formatTime(Number(hourOnly[1]), Number(hourOnly[2] ?? 0));
          if (time) {
            result.time = time;
            take(i, start - i + 1);
            continue;
          }
        }
      }
    }
  }

  // A time with no date means "the next time it's that o'clock".
  if (result.time && !result.due) {
    const now = options.nowTime;
    result.due = now !== undefined && result.time <= now ? addDays(options.today, 1) : options.today;
  }

  result.title = words
    .filter((_, k) => !used[k])
    .join(" ")
    .trim();
  return result;
}

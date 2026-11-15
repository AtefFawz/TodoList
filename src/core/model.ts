import { z } from "zod";
import { isDayKey, isTime } from "./dates";

export const PRIORITIES = [0, 1, 2, 3] as const;
export type Priority = (typeof PRIORITIES)[number];

const dayKey = z.string().refine(isDayKey, "Invalid date");
const time = z.string().refine(isTime, "Invalid time");

export const subtaskSchema = z.object({ id: z.string(), title: z.string(), done: z.boolean() });

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().default(""),
  done: z.boolean(),
  doneAt: z.number().nullable().default(null),
  createdAt: z.number(),
  listId: z.string(),
  priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(0),
  due: dayKey.nullable().default(null),
  time: time.nullable().default(null),
  tags: z.array(z.string()).default([]),
  subtasks: z.array(subtaskSchema).default([]),
  repeat: z.enum(["none", "daily", "weekdays", "weekly", "monthly"]).default("none"),
  pinned: z.boolean().default(false),
  /** Explicit reminder instant (epoch ms). When null, a task with a due time reminds at that time. */
  reminderAt: z.number().nullable().default(null),
  /** Time spent in focus sessions, in milliseconds. */
  focusMs: z.number().nonnegative().default(0),
  /** Manual order (ascending). */
  order: z.number().default(0),
});

export const listSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  emoji: z.string().default(""),
});

export const SORTS = ["manual", "due", "priority", "created"] as const;

export const settingsSchema = z.object({
  language: z.enum(["ar", "en"]).default("ar"),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  /** Show reminders inside the app (toast + notification centre). */
  inAppAlerts: z.boolean().default(true),
  /** Also deliver reminders through the operating system. Needs permission. */
  systemAlerts: z.boolean().default(false),
  /** Vibrate / buzz when a reminder arrives (native apps). */
  vibrate: z.boolean().default(true),
  sort: z.enum(SORTS).default("manual"),
  /** 0 = Sunday … 6 = Saturday. Saturday is the common week start in the region. */
  weekStart: z.number().int().min(0).max(6).default(6),
  focusMinutes: z.number().int().min(1).max(180).default(25),
  breakMinutes: z.number().int().min(1).max(60).default(5),
});

export const dataSchema = z.object({
  version: z.literal(3),
  tasks: z.array(taskSchema),
  lists: z.array(listSchema),
  /** Completed-task count per day: drives streaks and charts. */
  history: z.record(z.string(), z.number().int().nonnegative()).default({}),
  /** Focus milliseconds per day. */
  focusHistory: z.record(z.string(), z.number().nonnegative()).default({}),
  settings: settingsSchema,
});

export type Subtask = z.infer<typeof subtaskSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskList = z.infer<typeof listSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Data = z.infer<typeof dataSchema>;

export const INBOX_ID = "inbox";
export const LIST_COLORS = ["#7668e8", "#e3a34c", "#35a6a0", "#e17893", "#e46e69", "#0c8bd1", "#2f9e44", "#7c6f64"] as const;

/** First-run lists, named in the user's language. They are ordinary lists afterwards: rename or delete freely. */
export function seededData(language: "ar" | "en", makeId: () => string = () => crypto.randomUUID()): Data {
  const names = language === "ar" ? ["العمل", "شخصي", "التعلّم", "الصحة"] : ["Work", "Personal", "Learning", "Health"];
  const base = defaultData();
  return {
    ...base,
    settings: { ...base.settings, language },
    lists: [...base.lists, ...names.map((name, i) => ({ id: makeId(), name, color: LIST_COLORS[i + 1]!, emoji: "" }))],
  };
}

export function defaultData(): Data {
  return {
    version: 3,
    tasks: [],
    lists: [{ id: INBOX_ID, name: "", color: LIST_COLORS[0], emoji: "" }],
    history: {},
    focusHistory: {},
    settings: settingsSchema.parse({}),
  };
}

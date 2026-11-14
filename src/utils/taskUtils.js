import { DEFAULT_CATEGORIES, PRIORITIES } from "../data/categories";

export const STORAGE_KEY = "nawa.tasks.v2";
export const THEME_KEY = "nawa.theme";
export const TASK_SCHEMA_VERSION = 3;

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? value
    : "";
}

function validTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

export function normalizeTask(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rawTitle = raw.title ?? raw.heading;
  if (typeof rawTitle !== "string") return null;
  const title = rawTitle.trim().slice(0, 120);
  if (!title) return null;

  const completed =
    raw.completed === true || raw.complete === true || raw.Complete === true;
  const priority = PRIORITIES.some((item) => item.id === raw.priority)
    ? raw.priority
    : "medium";
  const rawCategory = typeof raw.category === "string" ? raw.category : "شخصي";
  const category = rawCategory.trim().slice(0, 32) || "شخصي";
  const description =
    typeof raw.description === "string"
      ? raw.description.trim().slice(0, 1000)
      : "";
  const createdAt = validTimestamp(raw.createdAt) || new Date().toISOString();
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim().slice(0, 100)
      : createId();
  const reminderAt = validTimestamp(raw.reminderAt);

  return {
    id,
    title,
    description,
    completed,
    priority,
    category,
    dueDate: validDate(raw.dueDate),
    reminderAt: completed ? "" : reminderAt,
    createdAt,
    updatedAt: validTimestamp(raw.updatedAt) || createdAt,
    completedAt: completed
      ? validTimestamp(raw.completedAt) || createdAt
      : null,
  };
}

export function normalizeTaskList(items) {
  if (!Array.isArray(items)) return null;
  const seenIds = new Set();
  return items
    .map((item) => {
      const task = normalizeTask(item);
      if (!task) return null;
      while (seenIds.has(task.id)) task.id = createId();
      seenIds.add(task.id);
      return task;
    })
    .filter(Boolean);
}

export function readTasks() {
  if (typeof window === "undefined") return [];
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      try {
        const parsed = JSON.parse(current);
        const normalized = normalizeTaskList(parsed);
        if (normalized) return normalized;
      } catch (error) {
        console.warn(
          "بيانات المهام الحالية غير صالحة، ستتم محاولة استعادة البيانات القديمة.",
          error,
        );
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    // One-time migration from the original project's `data` key.
    const legacy = window.localStorage.getItem("data");
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = normalizeTaskList(parsed) || [];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn("تعذّر قراءة المهام المحفوظة:", error);
  }
  return [];
}

export function saveTasks(tasks) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("تعذّر حفظ المهام:", error);
    return false;
  }
}

export function getTaskStats(tasks) {
  const today = localDateString();
  const completed = tasks.filter((task) => task.completed).length;
  const overdue = tasks.filter(
    (task) => !task.completed && task.dueDate && task.dueDate < today,
  ).length;
  const dueToday = tasks.filter((task) => {
    if (task.completed) return false;
    const reminderDate = task.reminderAt
      ? localDateString(new Date(task.reminderAt))
      : "";
    return task.dueDate === today || reminderDate === today;
  }).length;
  const active = tasks.length - completed;
  const withReminder = tasks.filter(
    (task) => !task.completed && task.reminderAt,
  ).length;
  return {
    total: tasks.length,
    completed,
    active,
    overdue,
    dueToday,
    withReminder,
    progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

export function formatDueDate(value, completed = false) {
  if (!value) return "من دون موعد";
  const today = localDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateString(tomorrowDate);
  if (value < today && !completed) return "متأخرة";
  if (value === today) return "اليوم";
  if (value === tomorrow) return "غدًا";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatReminderDate(value) {
  if (!value) return "بدون تذكير";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "بدون تذكير";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatReminderCompact(value, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = localDateString(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const dateKey = localDateString(date);
  const dayLabel =
    dateKey === today
      ? "اليوم"
      : dateKey === localDateString(tomorrowDate)
        ? "غدًا"
        : new Intl.DateTimeFormat("ar-EG", {
            day: "numeric",
            month: "short",
            ...(date.getFullYear() !== now.getFullYear()
              ? { year: "numeric" }
              : {}),
          }).format(date);
  const timeLabel = new Intl.DateTimeFormat("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${dayLabel}، ${timeLabel}`;
}

export function filterTasks(tasks, view, search, status, category) {
  const today = localDateString();
  const normalizedSearch = search.trim().toLocaleLowerCase("ar");

  return tasks.filter((task) => {
    // A reminder-only task belongs to its reminder day when no deadline exists.
    const reminderDate = task.reminderAt
      ? localDateString(new Date(task.reminderAt))
      : "";
    const isToday = task.dueDate === today || reminderDate === today;
    const scheduledDate = task.dueDate || reminderDate;
    const matchesView =
      view === "today"
        ? isToday && !task.completed
        : view === "upcoming"
          ? !isToday && scheduledDate > today && !task.completed
          : view === "completed"
            ? task.completed
            : view === "overdue"
              ? Boolean(task.dueDate && task.dueDate < today && !task.completed)
              : true;
    const matchesStatus =
      status === "all" ||
      (status === "active" && !task.completed) ||
      (status === "completed" && task.completed);
    const matchesCategory = !category || task.category === category;
    const matchesSearch =
      !normalizedSearch ||
      `${task.title} ${task.description} ${task.category}`
        .toLocaleLowerCase("ar")
        .includes(normalizedSearch);
    return matchesView && matchesStatus && matchesCategory && matchesSearch;
  });
}

export function sortTasks(tasks, sortBy) {
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    if (sortBy === "priority")
      return (
        priorityWeight[a.priority] - priorityWeight[b.priority] ||
        b.createdAt.localeCompare(a.createdAt)
      );
    if (sortBy === "oldest") return a.createdAt.localeCompare(b.createdAt);
    if (sortBy === "dueDate")
      return (a.dueDate || "9999-99-99").localeCompare(
        b.dueDate || "9999-99-99",
      );
    if (sortBy === "reminder")
      return (a.reminderAt || "9999").localeCompare(b.reminderAt || "9999");
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getCategoryColor(category) {
  const normalized = DEFAULT_CATEGORIES.find((item) => item.label === category);
  if (normalized) return normalized.color;
  let hash = 0;
  for (let index = 0; index < category.length; index += 1)
    hash = category.charCodeAt(index) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360} 58% 58%)`;
}

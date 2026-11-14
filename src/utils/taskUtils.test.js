import {
  filterTasks,
  getTaskStats,
  localDateString,
  normalizeTask,
  normalizeTaskList,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "./taskUtils";

const baseTask = {
  id: "task-1",
  title: "مهمة اختبار",
  description: "وصف تجريبي",
  priority: "high",
  category: "شخصي",
  dueDate: "",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
};

test("يرفض المهمة بدون عنوان صالح", () => {
  expect(normalizeTask({ ...baseTask, title: "   " })).toBeNull();
  expect(normalizeTask({ ...baseTask, title: 123 })).toBeNull();
});

test("يوحّد صيغ حالة الإكمال القديمة ويحافظ على توافق البيانات", () => {
  expect(normalizeTask({ ...baseTask, Complete: true }).completed).toBe(true);
  expect(normalizeTask({ ...baseTask, complete: true }).completed).toBe(true);
  expect(normalizeTask({ ...baseTask, completed: false }).completed).toBe(
    false,
  );
});

test("ينشئ معرّفات مختلفة للمهام ذات المعرّف المكرر", () => {
  const result = normalizeTaskList([baseTask, baseTask]);
  expect(result).toHaveLength(2);
  expect(result[0].id).not.toBe(result[1].id);
});

test("يتجاهل تاريخ الإنجاز غير الصحيح والتذكير غير الصحيح", () => {
  const result = normalizeTask({
    ...baseTask,
    dueDate: "2026-02-31",
    reminderAt: "not-a-date",
  });
  expect(result.dueDate).toBe("");
  expect(result.reminderAt).toBe("");
});

test("لا يحتفظ بتذكير لمهمة مكتملة", () => {
  const result = normalizeTask({
    ...baseTask,
    completed: true,
    reminderAt: "2026-01-02T10:00:00.000Z",
  });
  expect(result.reminderAt).toBe("");
});

test("يحسب الإحصائيات الأساسية بشكل متسق", () => {
  const today = localDateString();
  const stats = getTaskStats([
    normalizeTask({ ...baseTask, id: "a", completed: true }),
    normalizeTask({
      ...baseTask,
      id: "b",
      completed: false,
      dueDate: today,
      reminderAt: "2026-01-02T10:00:00.000Z",
    }),
  ]);
  expect(stats.total).toBe(2);
  expect(stats.completed).toBe(1);
  expect(stats.active).toBe(1);
  expect(stats.dueToday).toBe(1);
  expect(stats.withReminder).toBe(1);
  expect(stats.progress).toBe(50);
});

test("يطبق البحث والفلترة حسب حالة المهمة", () => {
  const tasks = [
    normalizeTask({
      ...baseTask,
      id: "a",
      title: "مراجعة التصميم",
      completed: false,
    }),
    normalizeTask({
      ...baseTask,
      id: "b",
      title: "تسليم التقرير",
      completed: true,
    }),
  ];
  expect(filterTasks(tasks, "all", "التصميم", "active", "")).toHaveLength(1);
  expect(filterTasks(tasks, "all", "", "completed", "")[0].id).toBe("b");
});

test("يحوّل موعد التذكير بين القيمة المحلية وISO دون فقدان الوقت", () => {
  const localValue = "2026-11-20T14:35";
  const isoValue = fromDateTimeLocalValue(localValue);
  expect(isoValue).not.toBe("");
  expect(toDateTimeLocalValue(isoValue)).toBe(localValue);
});

test("يعرض المهمة في اليوم المحدد بالتذكير عندما لا يوجد موعد إنجاز", () => {
  const reminderDate = new Date();
  reminderDate.setHours(18, 0, 0, 0);
  const task = normalizeTask({
    ...baseTask,
    id: "reminder-only",
    dueDate: "",
    reminderAt: reminderDate.toISOString(),
  });
  expect(filterTasks([task], "today", "", "all", "")).toHaveLength(1);
  expect(getTaskStats([task]).dueToday).toBe(1);
});

test("shows a task today when its reminder is due today even if its deadline is later", () => {
  const reminderToday = new Date();
  reminderToday.setHours(18, 0, 0, 0);
  const later = new Date();
  later.setDate(later.getDate() + 3);
  const task = normalizeTask({
    ...baseTask,
    id: "deadline-later-reminder-today",
    dueDate: localDateString(later),
    reminderAt: reminderToday.toISOString(),
  });

  expect(filterTasks([task], "today", "", "all", "")).toHaveLength(1);
  expect(filterTasks([task], "upcoming", "", "all", "")).toHaveLength(0);
  expect(getTaskStats([task]).dueToday).toBe(1);
});

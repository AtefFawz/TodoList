import { collectDueReminders, getReminderKey, REMINDER_GRACE_MS } from "./reminderUtils";

function reminderTask(overrides = {}) {
  return {
    id: "task-1",
    title: "مراجعة المشروع",
    completed: false,
    reminderAt: "2026-11-13T10:00:00.000Z",
    ...overrides,
  };
}

test("يلتقط التذكير المستحق مرة واحدة فقط", () => {
  const task = reminderTask();
  const first = collectDueReminders([task], {}, Date.parse("2026-11-13T10:05:00.000Z"));
  const second = collectDueReminders([task], first.delivered, Date.parse("2026-11-13T10:06:00.000Z"));
  expect(first.dueTasks).toHaveLength(1);
  expect(second.dueTasks).toHaveLength(0);
  expect(first.delivered[getReminderKey(task)]).toBe("2026-11-13T10:05:00.000Z");
});

test("لا يرسل تذكيرًا لمهمة مكتملة أو لموعد لم يحن", () => {
  const completed = reminderTask({ completed: true });
  const future = reminderTask({ id: "task-2", reminderAt: "2026-11-14T10:00:00.000Z" });
  const result = collectDueReminders([completed, future], {}, Date.parse("2026-11-13T10:05:00.000Z"));
  expect(result.dueTasks).toHaveLength(0);
  expect(result.changed).toBe(false);
});

test("يتجاهل التذكيرات القديمة جدًا مع وضع علامة أنها عولجت", () => {
  const now = Date.parse("2026-11-13T10:00:00.000Z");
  const oldTask = reminderTask({ reminderAt: new Date(now - REMINDER_GRACE_MS - 1000).toISOString() });
  const result = collectDueReminders([oldTask], {}, now);
  expect(result.dueTasks).toHaveLength(0);
  expect(result.changed).toBe(true);
  expect(result.delivered[getReminderKey(oldTask)]).toBe(new Date(now).toISOString());
});

test("يحافظ على سجل التذكيرات ضمن حد التخزين", () => {
  const stored = {};
  for (let index = 0; index < 510; index += 1) stored[`task-${index}:time`] = new Date(index * 1000).toISOString();
  const result = collectDueReminders([], stored);
  expect(Object.keys(result.delivered)).toHaveLength(500);
});

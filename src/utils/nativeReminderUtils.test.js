import {
  buildNativeReminderNotifications,
  stableNotificationId,
} from "./nativeReminderUtils";

const now = new Date("2026-11-13T12:00:00.000Z").getTime();

describe("native reminder scheduling", () => {
  test("creates stable positive 32-bit IDs", () => {
    const first = stableNotificationId("task-alpha");
    expect(first).toBe(stableNotificationId("task-alpha"));
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThanOrEqual(2147483647);
    expect(stableNotificationId("task-alpha")).not.toBe(
      stableNotificationId("task-beta"),
    );
  });

  test("only schedules valid future reminders for active tasks", () => {
    const tasks = [
      {
        id: "future",
        title: "مهمة مستقبلية",
        completed: false,
        reminderAt: "2026-11-13T12:30:00.000Z",
      },
      {
        id: "done",
        title: "مكتملة",
        completed: true,
        reminderAt: "2026-11-13T13:00:00.000Z",
      },
      {
        id: "past",
        title: "قديمة",
        completed: false,
        reminderAt: "2026-11-13T11:00:00.000Z",
      },
      {
        id: "bad",
        title: "تاريخ خاطئ",
        completed: false,
        reminderAt: "not-a-date",
      },
      { id: "missing", title: "بلا تذكير", completed: false, reminderAt: "" },
    ];

    const reminders = buildNativeReminderNotifications(tasks, now);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].body).toBe("مهمة مستقبلية");
    expect(reminders[0].extra).toEqual({
      nawa: "task-reminder",
      taskId: "future",
    });
    expect(reminders[0].schedule.at.toISOString()).toBe(
      "2026-11-13T12:30:00.000Z",
    );
    expect(reminders[0].schedule.allowWhileIdle).toBe(true);
    expect(reminders[0].channelId).toBe("nawa-task-reminders-vibrate");
    expect(reminders[0]).not.toHaveProperty("isExactNotification");
  });

  test("orders reminders by time and keeps iOS scheduled notifications below its OS limit", () => {
    const tasks = Array.from({ length: 90 }, (_, index) => ({
      id: `task-${index}`,
      title: `Task ${index}`,
      completed: false,
      reminderAt: new Date(now + (90 - index) * 60_000).toISOString(),
    }));
    const reminders = buildNativeReminderNotifications(tasks, now);
    expect(reminders).toHaveLength(60);
    expect(reminders[0].schedule.at.getTime()).toBeLessThan(
      reminders[1].schedule.at.getTime(),
    );
  });
});

test("does not include Android-only notification channel fields on iOS", () => {
  const reminder = buildNativeReminderNotifications(
    [
      {
        id: "ios-task",
        title: "موعد iOS",
        completed: false,
        reminderAt: "2026-11-13T12:30:00.000Z",
      },
    ],
    now,
    true,
    "ios",
  );

  expect(reminder).toHaveLength(1);
  expect(reminder[0]).not.toHaveProperty("channelId");
  expect(reminder[0]).not.toHaveProperty("smallIcon");
});

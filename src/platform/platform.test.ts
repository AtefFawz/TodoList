import { describe, expect, it } from "vitest";
import { reduce } from "@/core/actions";
import { defaultData, type Task } from "@/core/model";
import { MAX_NATIVE_REMINDERS } from "@/core/reminders";
import { buildNativeNotifications, channelId, stableNotificationId } from "./native-reminders";
import { getPlatform, isCapacitorNative, isNativeApp, syncNativeReminders } from "./runtime";

const NOW = new Date(2026, 10, 11, 12, 0).getTime();
const MIN = 60_000;
const tasksAt = (minutes: number[]): Task[] =>
  minutes.reduce(
    (d, m, i) =>
      reduce(
        d,
        { type: "add", task: { title: `Task ${i}`, reminderAt: NOW + m * MIN } },
        { now: NOW, today: "2026-11-11", uid: () => `t${i}` },
      ),
    defaultData(),
  ).tasks;

describe("stableNotificationId", () => {
  it("is deterministic and always a positive 32-bit integer", () => {
    expect(stableNotificationId("abc")).toBe(stableNotificationId("abc"));
    expect(stableNotificationId("abc")).not.toBe(stableNotificationId("abd"));
    for (const value of ["", "x", "ملاحظة", "a".repeat(500)]) {
      const id = stableNotificationId(value);
      expect(Number.isInteger(id) && id > 0 && id <= 2147483646).toBe(true);
    }
  });
});

describe("buildNativeNotifications", () => {
  const base = { now: NOW, vibrate: true, title: "Reminder" };

  it("schedules only future reminders, soonest first, with the task title as body", () => {
    const list = buildNativeNotifications(tasksAt([30, -5, 10]), { ...base, platform: "android" });
    expect(list.map((n) => n.body)).toEqual(["Task 2", "Task 0"]);
    expect(list[0]!.schedule).toEqual({ at: new Date(NOW + 10 * MIN), allowWhileIdle: true });
    expect(list[0]!.extra).toEqual({ nawa: "task-reminder", taskId: "t2" });
  });

  it("adds Android channel options only on Android and picks the vibration channel", () => {
    const [android] = buildNativeNotifications(tasksAt([5]), { ...base, platform: "android" });
    expect(android).toMatchObject({ channelId: channelId(true), smallIcon: "ic_stat_nawa" });
    const [silent] = buildNativeNotifications(tasksAt([5]), { ...base, vibrate: false, platform: "android" });
    expect(silent!.channelId).toBe("nawa-task-reminders-silent");
    const [ios] = buildNativeNotifications(tasksAt([5]), { ...base, platform: "ios" });
    expect(ios).not.toHaveProperty("channelId");
    expect(ios).not.toHaveProperty("smallIcon");
  });

  it("caps the queue to what the operating system can hold", () => {
    const many = tasksAt(Array.from({ length: MAX_NATIVE_REMINDERS + 25 }, (_, i) => i + 1));
    expect(buildNativeNotifications(many, { ...base, platform: "ios" })).toHaveLength(MAX_NATIVE_REMINDERS);
  });
});

describe("runtime detection (plain browser)", () => {
  it("reports the web and does nothing for native scheduling", async () => {
    expect(isCapacitorNative()).toBe(false);
    expect(getPlatform()).toBe("web");
    expect(isNativeApp()).toBe(false);
    await expect(
      syncNativeReminders([], { enabled: true, vibrate: true, title: "t", channelName: "c", channelDescription: "d" }),
    ).resolves.toEqual({ scheduled: 0, skipped: true });
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createChannel: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
  checkExactNotificationSetting: vi.fn(),
  changeExactNotificationSetting: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "android",
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    createChannel: mocks.createChannel,
    getPending: mocks.getPending,
    cancel: mocks.cancel,
    schedule: mocks.schedule,
    checkExactNotificationSetting: mocks.checkExactNotificationSetting,
    changeExactNotificationSetting: mocks.changeExactNotificationSetting,
  },
}));

import {
  getExactAlarmPermission,
  requestExactAlarmPermission,
  syncNativeReminders,
} from "./nativeRuntime";

describe("native notification runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPending.mockResolvedValue({ notifications: [] });
    mocks.createChannel.mockResolvedValue(undefined);
    mocks.cancel.mockResolvedValue(undefined);
    mocks.schedule.mockResolvedValue({ notifications: [] });
    mocks.checkExactNotificationSetting.mockResolvedValue({
      exact_alarm: "granted",
    });
    mocks.changeExactNotificationSetting.mockResolvedValue({
      exact_alarm: "granted",
    });
  });

  test.each([true, false])(
    "creates an Android notification channel safely when vibration is %s",
    async (vibrate) => {
      const reminderAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await syncNativeReminders(
        [
          {
            id: `android-task-${vibrate}`,
            title: "اختبار تذكير أندرويد",
            completed: false,
            reminderAt,
          },
        ],
        true,
        vibrate,
      );

      const channelId = vibrate
        ? "nawa-task-reminders-vibrate"
        : "nawa-task-reminders-silent";
      expect(result).toEqual({ scheduled: 1, skipped: false });
      expect(mocks.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: channelId,
          vibration: vibrate,
        }),
      );
      expect(mocks.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: [
            expect.objectContaining({
              title: "تذكير من نَواة",
              body: "اختبار تذكير أندرويد",
              channelId,
            }),
          ],
        }),
      );
    },
  );

  test("maps the exact-alarm permission returned by Android", async () => {
    mocks.checkExactNotificationSetting.mockResolvedValue({
      exact_alarm: "denied",
    });
    expect(await getExactAlarmPermission()).toBe("denied");

    mocks.changeExactNotificationSetting.mockResolvedValue({
      exact_alarm: "granted",
    });
    expect(await requestExactAlarmPermission()).toBe("granted");
    expect(mocks.changeExactNotificationSetting).toHaveBeenCalledTimes(1);
  });
});

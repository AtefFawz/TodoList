import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/core/model";
import {
  getExactAlarmPermission,
  getNotificationPermission,
  getPlatform,
  isCapacitorNative,
  onAppResume,
  onNotificationTapped,
  requestExactAlarmPermission,
  requestNotificationPermission,
  syncNativeReminders,
  type Permission,
} from "@/platform/runtime";

interface Options {
  tasks: readonly Task[];
  /** The user wants system notifications (setting) – permission is checked separately. */
  wanted: boolean;
  vibrate: boolean;
  title: string;
  channelName: string;
  channelDescription: string;
}

/** Permission state plus the bridge that keeps the operating system's reminder queue in step with the tasks. */
export function useDeviceNotifications({ tasks, wanted, vibrate, title, channelName, channelDescription }: Options) {
  const [permission, setPermission] = useState<Permission>("default");
  const [exactAlarm, setExactAlarm] = useState<Permission>(() => (getPlatform() === "android" ? "default" : "not-required"));

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      void Promise.all([getNotificationPermission(), getExactAlarmPermission()]).then(([p, e]) => {
        if (!alive) return;
        setPermission(p);
        setExactAlarm(e);
      });
    refresh();
    // The user may flip the permission in system settings and come back.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const enabled = wanted && permission === "granted";

  // Operating-system reminders (Android/iOS): rescheduled whenever the tasks, settings or permission change.
  useEffect(() => {
    if (!isCapacitorNative()) return;
    void syncNativeReminders(tasks, { enabled, vibrate, title, channelName, channelDescription });
  }, [tasks, enabled, vibrate, title, channelName, channelDescription]);

  // …and when the app returns to the foreground, to refill the capped queue.
  useEffect(() => {
    if (!isCapacitorNative()) return;
    let off: () => void = () => undefined;
    let alive = true;
    void onAppResume(() => void syncNativeReminders(tasks, { enabled, vibrate, title, channelName, channelDescription })).then((remove) => {
      if (alive) off = remove;
      else remove();
    });
    return () => {
      alive = false;
      off();
    };
  }, [tasks, enabled, vibrate, title, channelName, channelDescription]);

  // Tapping a native notification opens its task.
  useEffect(() => {
    let off: () => void = () => undefined;
    let alive = true;
    void onNotificationTapped((taskId) => window.dispatchEvent(new CustomEvent("nawa-open-task", { detail: { taskId } }))).then(
      (remove) => {
        if (alive) off = remove;
        else remove();
      },
    );
    return () => {
      alive = false;
      off();
    };
  }, []);

  const request = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);
  const requestExact = useCallback(async () => {
    const result = await requestExactAlarmPermission();
    setExactAlarm(result);
    return result;
  }, []);

  return { permission, exactAlarm, request, requestExact, enabled, native: isCapacitorNative() };
}

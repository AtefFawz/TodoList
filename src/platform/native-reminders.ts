import { upcomingReminders, MAX_NATIVE_REMINDERS } from "@/core/reminders";
import type { Task } from "@/core/model";

export const REMINDER_CHANNEL = "nawa-task-reminders";
export const channelId = (vibrate: boolean): string => `${REMINDER_CHANNEL}-${vibrate ? "vibrate" : "silent"}`;

/** Capacitor needs a 32-bit positive integer id: derive a stable one from the task id (FNV-1a). */
export function stableNotificationId(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 2147483646) + 1;
}

export interface NativeNotification {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle: true };
  extra: { nawa: "task-reminder"; taskId: string };
  channelId?: string;
  smallIcon?: string;
  iconColor?: string;
}

export interface BuildOptions {
  now: number;
  vibrate: boolean;
  platform: string;
  title: string;
  limit?: number;
}

/** The notifications to hand to the operating system: nearest first, capped, Android-only options only on Android. */
export function buildNativeNotifications(
  tasks: readonly Task[],
  { now, vibrate, platform, title, limit = MAX_NATIVE_REMINDERS }: BuildOptions,
): NativeNotification[] {
  return upcomingReminders(tasks, now, limit).map(({ task, at }) => ({
    id: stableNotificationId(task.id),
    title,
    body: task.title,
    schedule: { at: new Date(at), allowWhileIdle: true },
    ...(platform === "android" ? { channelId: channelId(vibrate), smallIcon: "ic_stat_nawa", iconColor: "#7668e8" } : {}),
    extra: { nawa: "task-reminder", taskId: task.id },
  }));
}

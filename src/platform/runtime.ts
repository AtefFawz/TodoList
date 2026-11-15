import { Capacitor } from "@capacitor/core";
import type { Task } from "@/core/model";
import { buildNativeNotifications, channelId, stableNotificationId } from "./native-reminders";

export type Platform = "web" | "android" | "ios" | "desktop";
export type Permission = "granted" | "denied" | "default" | "unsupported" | "error" | "not-required";

interface TauriWindow extends Window {
  __TAURI_INTERNALS__?: unknown;
}

export const isCapacitorNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
export const isTauriDesktop = (): boolean => typeof window !== "undefined" && Boolean((window as TauriWindow).__TAURI_INTERNALS__);

export function getPlatform(): Platform {
  if (isCapacitorNative()) return Capacitor.getPlatform() === "ios" ? "ios" : "android";
  return isTauriDesktop() ? "desktop" : "web";
}
export const isNativeApp = (): boolean => getPlatform() !== "web";

const mapPermission = (value: unknown): Permission => (value === "granted" ? "granted" : value === "denied" ? "denied" : "default");

const localNotifications = async () => (await import("@capacitor/local-notifications")).LocalNotifications;

// ------------------------------------------------------------------ permissions

export async function getNotificationPermission(): Promise<Permission> {
  try {
    if (isCapacitorNative()) return mapPermission((await (await localNotifications()).checkPermissions()).display);
    if (isTauriDesktop()) {
      const { isPermissionGranted } = await import("@tauri-apps/plugin-notification");
      return (await isPermissionGranted()) ? "granted" : "default";
    }
    return typeof Notification === "undefined" ? "unsupported" : mapPermission(Notification.permission);
  } catch (error) {
    console.warn("Could not read the notification permission:", error);
    return "default";
  }
}

/** Must be called from a user gesture on the web and on iOS. */
export async function requestNotificationPermission(): Promise<Permission> {
  try {
    if (isCapacitorNative()) return mapPermission((await (await localNotifications()).requestPermissions()).display);
    if (isTauriDesktop()) {
      const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
      return (await isPermissionGranted()) ? "granted" : mapPermission(await requestPermission());
    }
    if (typeof Notification === "undefined") return "unsupported";
    return mapPermission(await Notification.requestPermission());
  } catch (error) {
    console.warn("Could not request the notification permission:", error);
    return "error";
  }
}

/** Android 12+ gates exact alarms behind a separate "Alarms & reminders" switch. */
export async function getExactAlarmPermission(): Promise<Permission> {
  if (getPlatform() !== "android") return "not-required";
  try {
    const plugin = await localNotifications();
    if (typeof plugin.checkExactNotificationSetting !== "function") return "unsupported";
    return mapPermission((await plugin.checkExactNotificationSetting()).exact_alarm);
  } catch (error) {
    console.warn("Could not read the exact-alarm setting:", error);
    return "error";
  }
}

export async function requestExactAlarmPermission(): Promise<Permission> {
  if (getPlatform() !== "android") return "not-required";
  try {
    const plugin = await localNotifications();
    if (typeof plugin.changeExactNotificationSetting !== "function") return "unsupported";
    return mapPermission((await plugin.changeExactNotificationSetting()).exact_alarm);
  } catch (error) {
    console.warn("Could not open the exact-alarm setting:", error);
    return "error";
  }
}

// ------------------------------------------------------------------ native reminders

export interface SyncOptions {
  enabled: boolean;
  vibrate: boolean;
  /** Localised notification title. */
  title: string;
  channelName: string;
  channelDescription: string;
  now?: number;
}
export interface SyncResult {
  scheduled: number;
  skipped: boolean;
  error?: unknown;
}

async function ensureChannel(vibrate: boolean, name: string, description: string) {
  if (Capacitor.getPlatform() !== "android") return;
  await (await localNotifications()).createChannel({ id: channelId(vibrate), name, description, importance: 4, vibration: vibrate });
}

async function syncNow(tasks: readonly Task[], options: SyncOptions): Promise<SyncResult> {
  try {
    const plugin = await localNotifications();
    await ensureChannel(options.vibrate, options.channelName, options.channelDescription);

    // Only cancel what we scheduled: other plugins' notifications are none of our business.
    const pending = await plugin.getPending();
    const ours = (pending.notifications ?? [])
      .filter((n) => (n.extra as { nawa?: string } | undefined)?.nawa === "task-reminder")
      .map((n) => ({ id: n.id }));
    if (ours.length) await plugin.cancel({ notifications: ours });
    if (!options.enabled) return { scheduled: 0, skipped: false };

    const notifications = buildNativeNotifications(tasks, {
      now: options.now ?? Date.now(),
      vibrate: options.vibrate,
      platform: Capacitor.getPlatform(),
      title: options.title,
    });
    if (notifications.length) await plugin.schedule({ notifications });
    return { scheduled: notifications.length, skipped: false };
  } catch (error) {
    console.warn("Could not sync device reminders:", error);
    return { scheduled: 0, skipped: false, error };
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialised: a rapid series of edits can never let an older snapshot overwrite a newer one. */
export function syncNativeReminders(tasks: readonly Task[], options: SyncOptions): Promise<SyncResult> {
  if (!isCapacitorNative()) return Promise.resolve({ scheduled: 0, skipped: true });
  const run = queue.catch(() => undefined).then(() => syncNow(tasks, options));
  queue = run;
  return run;
}

// ------------------------------------------------------------------ showing notifications

export interface ShowOptions {
  title: string;
  body: string;
  taskId?: string;
  vibrate?: boolean;
  tag?: string;
  channelName?: string;
}

export async function showSystemNotification({
  title,
  body,
  taskId = "",
  vibrate = true,
  tag,
  channelName = "Nawa",
}: ShowOptions): Promise<boolean> {
  try {
    if (isCapacitorNative()) {
      const plugin = await localNotifications();
      await ensureChannel(vibrate, channelName, channelName);
      const isAndroid = Capacitor.getPlatform() === "android";
      await plugin.schedule({
        notifications: [
          {
            id: stableNotificationId(`instant-${taskId}-${Date.now()}`),
            title,
            body,
            schedule: { at: new Date(Date.now() + 350), allowWhileIdle: true },
            ...(isAndroid ? { channelId: channelId(vibrate), smallIcon: "ic_stat_nawa", iconColor: "#7668e8" } : {}),
            extra: { nawa: "instant", taskId },
          },
        ],
      });
      if (vibrate) await haptic();
      return true;
    }
    if (isTauriDesktop()) {
      const { sendNotification } = await import("@tauri-apps/plugin-notification");
      sendNotification({ title, body });
      return true;
    }
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
    const base = import.meta.env.BASE_URL;
    const options: NotificationOptions = {
      body,
      icon: `${base}logo192.png`,
      badge: `${base}logo192.png`,
      tag: tag ?? `nawa-${taskId || Date.now()}`,
      data: { taskId },
    };
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.active) {
      await registration.showNotification(title, options);
      return true;
    }
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent("nawa-open-task", { detail: { taskId } }));
    };
    return true;
  } catch (error) {
    console.warn("Could not show a system notification:", error);
    return false;
  }
}

/** Tapping a native reminder opens its task. Returns an unsubscribe function. */
export async function onNotificationTapped(callback: (taskId: string) => void): Promise<() => void> {
  if (!isCapacitorNative()) return () => undefined;
  try {
    const handle = await (
      await localNotifications()
    ).addListener("localNotificationActionPerformed", (event) => {
      const taskId = (event.notification.extra as { taskId?: string } | undefined)?.taskId;
      if (taskId) callback(taskId);
    });
    return () => void handle.remove();
  } catch (error) {
    console.warn("Could not listen for notification taps:", error);
    return () => undefined;
  }
}

/** Refill the OS queue whenever the app returns to the foreground. */
export async function onAppResume(callback: () => void): Promise<() => void> {
  if (!isCapacitorNative()) return () => undefined;
  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) callback();
    });
    return () => void handle.remove();
  } catch {
    return () => undefined;
  }
}

export async function haptic(kind: "impact" | "success" = "impact"): Promise<boolean> {
  try {
    if (isCapacitorNative()) {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      if (kind === "success") await Haptics.notification({ type: NotificationType.Success });
      else await Haptics.impact({ style: ImpactStyle.Medium });
      return true;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) return navigator.vibrate(kind === "success" ? [30] : [100, 50, 100]);
  } catch {
    // Not available on this device: nothing to do.
  }
  return false;
}

// ------------------------------------------------------------------ backup files

/** Desktop only: web uses a file input, Android/iOS use the file input too (WebView supports it). */
export async function pickBackupFile(): Promise<string | null> {
  if (!isTauriDesktop()) return null;
  const [{ open }, { readTextFile }] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/plugin-fs")]);
  const path = await open({ multiple: false, directory: false, filters: [{ name: "JSON", extensions: ["json"] }] });
  return typeof path === "string" ? readTextFile(path) : null;
}

export async function saveBackupFile(filename: string, contents: string, mime = "application/json"): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const file = await Filesystem.writeFile({ path: filename, data: contents, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: filename, url: file.uri, dialogTitle: filename });
      return true;
    } catch (error) {
      console.warn("Could not share the backup:", error);
      return false;
    }
  }
  if (isTauriDesktop()) {
    try {
      const [{ save }, { writeTextFile }] = await Promise.all([import("@tauri-apps/plugin-dialog"), import("@tauri-apps/plugin-fs")]);
      const ext = filename.split(".").pop() ?? "json";
      const path = await save({ defaultPath: filename, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
      if (!path) return false;
      await writeTextFile(path, contents);
      return true;
    } catch (error) {
      console.warn("Could not save the backup:", error);
      return false;
    }
  }
  const url = URL.createObjectURL(new Blob([contents], { type: `${mime};charset=utf-8` }));
  const anchor = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

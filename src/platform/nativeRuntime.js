import { Capacitor } from "@capacitor/core";
import { buildNativeReminderNotifications, stableNotificationId } from "../utils/nativeReminderUtils";

const REMINDER_CHANNEL_ID = "nawa-task-reminders";
let nativeReminderSyncQueue = Promise.resolve();

export function isCapacitorNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isTauriDesktop() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function getRuntimePlatform() {
  if (isCapacitorNative()) return Capacitor.getPlatform();
  if (isTauriDesktop()) return "desktop";
  return "web";
}

function mapPermission(value) {
  if (value === "granted") return "granted";
  if (value === "denied") return "denied";
  return "default";
}

export async function getNotificationPermission() {
  try {
    if (isCapacitorNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.checkPermissions();
      return mapPermission(result.display);
    }

    if (isTauriDesktop()) {
      const { isPermissionGranted } = await import("@tauri-apps/plugin-notification");
      return (await isPermissionGranted()) ? "granted" : "default";
    }

    return "Notification" in window ? mapPermission(window.Notification.permission) : "unsupported";
  } catch (error) {
    console.warn("تعذّر قراءة إذن الإشعارات:", error);
    return "default";
  }
}

export async function requestPlatformNotificationPermission() {
  try {
    if (isCapacitorNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.requestPermissions();
      return mapPermission(result.display);
    }

    if (isTauriDesktop()) {
      const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
      if (await isPermissionGranted()) return "granted";
      return mapPermission(await requestPermission());
    }

    if (!("Notification" in window)) return "unsupported";
    return mapPermission(await window.Notification.requestPermission());
  } catch (error) {
    console.warn("تعذّر طلب إذن الإشعارات:", error);
    return "error";
  }
}


async function getLocalNotifications() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

async function syncNativeRemindersNow(tasks, enabled, vibrate) {
  try {
    const LocalNotifications = await getLocalNotifications();
    const channelId = vibrate ? `${REMINDER_CHANNEL_ID}-vibrate` : `${REMINDER_CHANNEL_ID}-silent`;
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: channelId,
        name: vibrate ? "تذكيرات المهام مع الاهتزاز" : "تذكيرات المهام بدون اهتزاز",
        description: "تنبيهات المواعيد التي حددتها لمهامك في نَواة",
        importance: 4,
        vibration,
      });
    }

    const pending = await LocalNotifications.getPending();
    const ownedIds = (pending.notifications || [])
      .filter((item) => item.extra?.nawa === "task-reminder")
      .map((item) => ({ id: item.id }));
    if (ownedIds.length) await LocalNotifications.cancel({ notifications: ownedIds });

    if (!enabled) return { scheduled: 0, skipped: false };

    const notifications = buildNativeReminderNotifications(tasks, Date.now(), vibrate);
    if (notifications.length) {
      const result = await LocalNotifications.schedule({ notifications });
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      if (warnings.length) console.info("بعض تذكيرات نَواة قد تعمل بتوقيت تقريبي:", warnings);
    }
    return { scheduled: notifications.length, skipped: false };
  } catch (error) {
    console.warn("تعذّرت مزامنة تذكيرات الجهاز:", error);
    return { scheduled: 0, skipped: false, error };
  }
}

export function syncNativeReminders(tasks, enabled, vibrate = true) {
  if (!isCapacitorNative()) return Promise.resolve({ scheduled: 0, skipped: true });
  // Serialize updates so rapid edits cannot let an older reminder snapshot win the race.
  nativeReminderSyncQueue = nativeReminderSyncQueue
    .catch(() => undefined)
    .then(() => syncNativeRemindersNow(tasks, enabled, vibrate));
  return nativeReminderSyncQueue;
}

export async function showPlatformNotification({ title, body, taskId = "", vibrate = true, isTest = false }) {
  try {
    if (isCapacitorNative()) {
      const LocalNotifications = await getLocalNotifications();
      const channelId = vibrate ? `${REMINDER_CHANNEL_ID}-vibrate` : `${REMINDER_CHANNEL_ID}-silent`;
      if (Capacitor.getPlatform() === "android") {
        await LocalNotifications.createChannel({
          id: channelId,
          name: vibrate ? "إشعار فوري مع الاهتزاز" : "إشعار فوري بدون اهتزاز",
          description: "إشعارات من تطبيق نَواة",
          importance: 4,
          vibration,
        });
      }
      const notificationId = stableNotificationId(isTest ? `test-${Date.now()}` : `instant-${taskId}-${Date.now()}`);
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title,
          body,
          schedule: { at: new Date(Date.now() + 350), allowWhileIdle: true },
          foreground: true,
          channelId,
          smallIcon: "ic_stat_nawa",
          iconColor: "#7668e8",
          extra: { nawa: "instant", taskId },
        }],
      });
      if (vibrate) await triggerHaptics();
      return true;
    }

    if (isTauriDesktop()) {
      const { sendNotification } = await import("@tauri-apps/plugin-notification");
      sendNotification({ title, body });
      return true;
    }

    if (!("Notification" in window) || window.Notification.permission !== "granted") return false;
    const options = {
      body,
      icon: `${process.env.PUBLIC_URL || ""}/logo192.png`,
      badge: `${process.env.PUBLIC_URL || ""}/logo192.png`,
      tag: `nawa-${isTest ? "test" : "reminder"}-${taskId || Date.now()}`,
      renotify: false,
      data: { taskId },
    };

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active && typeof registration.showNotification === "function") {
        await registration.showNotification(title, options);
        return true;
      }
    }

    const notification = new window.Notification(title, options);
    notification.onclick = () => {
      window.focus();
      if (taskId) {
        const destination = new URL(window.location.href);
        destination.searchParams.set("task", taskId);
        window.location.assign(destination.href);
      }
    };
    return true;
  } catch (error) {
    console.warn("تعذّر عرض إشعار الجهاز:", error);
    return false;
  }
}

export async function addNativeNotificationActionListener(onTaskOpen) {
  if (!isCapacitorNative()) return null;
  try {
    const LocalNotifications = await getLocalNotifications();
    return await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const taskId = event?.notification?.extra?.taskId;
      if (taskId) onTaskOpen(taskId);
    });
  } catch (error) {
    console.warn("تعذّر ربط الضغط على إشعار الجهاز:", error);
    return null;
  }
}

export async function triggerHaptics() {
  try {
    if (isCapacitorNative()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) return navigator.vibrate([100, 50, 100]);
  } catch (error) {
    console.info("الاهتزاز غير متاح على هذا الجهاز:", error);
  }
  return false;
}

export async function pickBackupFile() {
  if (!isTauriDesktop()) return null;
  try {
    const [{ open }, { readTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const path = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "JSON Backup", extensions: ["json"] }],
    });
    if (!path || Array.isArray(path)) return null;
    return await readTextFile(path);
  } catch (error) {
    console.warn("تعذّر فتح ملف النسخة الاحتياطية:", error);
    throw error;
  }
}

export async function saveBackupFile(filename, contents) {
  if (isCapacitorNative()) {
    try {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const file = await Filesystem.writeFile({
        path: filename,
        data: contents,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: "نسخة احتياطية من نَواة",
        text: "احتفظ بنسخة من مهامك وإعداداتك.",
        url: file.uri,
        dialogTitle: "تصدير النسخة الاحتياطية",
      });
      return true;
    } catch (error) {
      console.warn("تعذّر فتح مشاركة النسخة الاحتياطية:", error);
      return false;
    }
  }

  if (isTauriDesktop()) {
    try {
      const [{ save }, { writeTextFile }] = await Promise.all([
        import("@tauri-apps/plugin-dialog"),
        import("@tauri-apps/plugin-fs"),
      ]);
      const path = await save({
        defaultPath: filename,
        filters: [{ name: "JSON Backup", extensions: ["json"] }],
      });
      if (!path) return false;
      await writeTextFile(path, contents);
      return true;
    } catch (error) {
      console.warn("تعذّر حفظ النسخة الاحتياطية من تطبيق سطح المكتب:", error);
      return false;
    }
  }

  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collectDueReminders } from "../utils/reminderUtils";
import {
  addNativeNotificationActionListener,
  getNotificationPermission,
  isCapacitorNative,
  requestPlatformNotificationPermission,
  showPlatformNotification,
  syncNativeReminders,
  triggerHaptics,
} from "../platform/nativeRuntime";

const NOTIFICATIONS_KEY = "nawa.notifications.v1";
const DELIVERED_KEY = "nawa.reminders.delivered.v1";
const SETTINGS_KEY = "nawa.notifications.settings.v1";
const MAX_NOTIFICATIONS = 80;

const DEFAULT_SETTINGS = {
  inAppEnabled: true,
  systemEnabled: false,
  vibrate: true,
};

function safeRead(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readSettings() {
  const stored = safeRead(SETTINGS_KEY, {});
  const values = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  return {
    inAppEnabled: values.inAppEnabled !== false,
    systemEnabled: values.systemEnabled === true,
    vibrate: values.vibrate !== false,
  };
}

function readDelivered() {
  const value = safeRead(DELIVERED_KEY, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readNotificationHistory() {
  const value = safeRead(NOTIFICATIONS_KEY, []);
  return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string").slice(0, MAX_NOTIFICATIONS) : [];
}

function getInitialPermission() {
  if (isCapacitorNative()) return "default";
  return typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported";
}

export default function useNotifications(tasks) {
  const [notifications, setNotifications] = useState(readNotificationHistory);
  const [settings, setSettings] = useState(readSettings);
  const [permission, setPermission] = useState(getInitialPermission);
  const deliveredRef = useRef(readDelivered());

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    let mounted = true;
    const syncPermission = async () => {
      const nextPermission = await getNotificationPermission();
      if (mounted) setPermission(nextPermission);
    };
    syncPermission();
    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);
    return () => {
      mounted = false;
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
    } catch (error) {
      console.warn("تعذّر حفظ سجل التنبيهات:", error);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("تعذّر حفظ إعدادات التنبيهات:", error);
    }
  }, [settings]);

  const showSystemNotification = useCallback(async (task) => showPlatformNotification({
    title: task.isTest ? "إشعارات نَواة تعمل بنجاح" : "تذكير من نَواة",
    body: task.isTest ? "تم الاتصال بنظام إشعارات جهازك بنجاح." : `حان وقت: ${task.title}`,
    taskId: task.isTest ? "" : task.id,
    vibrate: settings.vibrate,
    isTest: Boolean(task.isTest),
  }), [settings.vibrate]);

  const sendTestNotification = useCallback(async () => {
    if (permission !== "granted") return false;
    return showSystemNotification({ id: "nawa-test-notification", title: "اختبار", isTest: true });
  }, [permission, showSystemNotification]);

  // Native mobile reminders are scheduled by the operating system, not by a JS timer.
  useEffect(() => {
    if (!isCapacitorNative()) return undefined;
    syncNativeReminders(tasks, settings.systemEnabled && permission === "granted", settings.vibrate);
    return undefined;
  }, [tasks, settings.systemEnabled, settings.vibrate, permission]);

  // Refill the operating-system notification queue when the app returns to the foreground.
  useEffect(() => {
    if (!isCapacitorNative()) return undefined;
    let active = true;
    let listener = null;
    import("@capacitor/app").then(({ App: NativeApp }) => NativeApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) syncNativeReminders(tasks, settings.systemEnabled && permission === "granted", settings.vibrate);
    })).then((createdListener) => {
      listener = createdListener;
      if (!active) listener?.remove();
    }).catch((error) => console.warn("تعذّر متابعة حالة التطبيق:", error));
    return () => {
      active = false;
      listener?.remove();
    };
  }, [tasks, settings.systemEnabled, settings.vibrate, permission]);

  // Tapping a native Android/iOS reminder opens the related task inside the app.
  useEffect(() => {
    let active = true;
    let listener = null;
    addNativeNotificationActionListener((taskId) => {
      if (active) window.dispatchEvent(new CustomEvent("nawa-open-task", { detail: { taskId } }));
    }).then((createdListener) => {
      listener = createdListener;
      if (!active) listener?.remove();
    });
    return () => {
      active = false;
      listener?.remove();
    };
  }, []);

  // Permission prompts must be initiated by a direct user action.
  const requestPermission = useCallback(async () => {
    const result = await requestPlatformNotificationPermission();
    setPermission(result);
    if (result === "granted") setSettings((current) => ({ ...current, systemEnabled: true }));
    return result;
  }, []);

  useEffect(() => {
    const systemNotificationsEnabled = settings.systemEnabled && permission === "granted";
    if (!settings.inAppEnabled && !systemNotificationsEnabled) return undefined;

    const nativeMobile = isCapacitorNative();
    const scanReminders = () => {
      const now = Date.now();
      const storedDelivered = readDelivered();
      const mergedDelivered = { ...deliveredRef.current, ...storedDelivered };
      const result = collectDueReminders(tasks, mergedDelivered, now);
      const dueTasks = result.dueTasks;
      deliveredRef.current = result.delivered;
      if (result.changed) {
        try { window.localStorage.setItem(DELIVERED_KEY, JSON.stringify(result.delivered)); }
        catch (error) { console.warn("تعذّر حفظ حالة التذكيرات:", error); }
      }

      dueTasks.forEach((task) => {
        const id = `reminder:${task.id}:${task.reminderAt}`;
        const item = {
          id,
          type: "reminder",
          taskId: task.id,
          title: "حان موعد مهمتك",
          body: task.title,
          createdAt: new Date(now).toISOString(),
          read: false,
        };
        if (settings.inAppEnabled) {
          setNotifications((current) => current.some((entry) => entry.id === id) ? current : [item, ...current].slice(0, MAX_NOTIFICATIONS));
        }
        // Android/iOS already own scheduled reminders. Other runtimes notify when due.
        if (systemNotificationsEnabled && !nativeMobile) showSystemNotification(task);
        if (settings.vibrate) triggerHaptics();
      });
    };

    scanReminders();
    const interval = window.setInterval(scanReminders, 15000);
    const onVisibility = () => { if (document.visibilityState === "visible") scanReminders(); };
    window.addEventListener("focus", scanReminders);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", scanReminders);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tasks, settings.inAppEnabled, settings.systemEnabled, settings.vibrate, permission, showSystemNotification]);

  const updateSettings = useCallback((patch) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const markTaskRead = useCallback((taskId) => {
    setNotifications((current) => current.map((item) => item.taskId === taskId ? { ...item, read: true } : item));
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  return {
    notifications,
    unreadCount,
    settings,
    permission,
    requestPermission,
    sendTestNotification,
    updateSettings,
    markRead,
    markTaskRead,
    markAllRead,
    dismiss,
    dismissNotification: dismiss,
  };
}

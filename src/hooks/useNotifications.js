import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collectDueReminders } from "../utils/reminderUtils";

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

function getPermission() {
  return typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported";
}

export default function useNotifications(tasks) {
  const [notifications, setNotifications] = useState(readNotificationHistory);
  const [settings, setSettings] = useState(readSettings);
  const [permission, setPermission] = useState(getPermission);
  const deliveredRef = useRef(readDelivered());
  const registrationRef = useRef(null);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    const syncPermission = () => setPermission(getPermission());
    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);
    return () => {
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

  const showSystemNotification = useCallback(async (task) => {
    if (getPermission() !== "granted") return false;
    const options = {
      body: `حان وقت: ${task.title}`,
      icon: `${process.env.PUBLIC_URL || ""}/logo192.png`,
      badge: `${process.env.PUBLIC_URL || ""}/logo192.png`,
      tag: `nawa-${task.isTest ? "test" : "reminder"}-${task.id}`,
      renotify: false,
      data: { taskId: task.isTest ? "" : task.id },
      timestamp: Date.now(),
      vibrate: settings.vibrate ? [120, 60, 120] : undefined,
    };

    try {
      let shown = false;
      if ("serviceWorker" in navigator) {
        const registration = registrationRef.current || await navigator.serviceWorker.getRegistration();
        if (registration?.active && typeof registration.showNotification === "function") {
          registrationRef.current = registration;
          await registration.showNotification("تذكير من نَواة", options);
          shown = true;
        }
      }
      if (!shown) {
        const notification = new window.Notification("تذكير من نَواة", options);
        notification.onclick = () => {
          window.focus();
          if (!task.isTest && task.id) {
            const destination = new URL(window.location.href);
            destination.searchParams.set("task", task.id);
            window.location.assign(destination.href);
          }
        };
      }
      return true;
    } catch (error) {
      console.warn("تعذّر عرض إشعار الجهاز:", error);
      return false;
    }
  }, [settings.vibrate]);

  const sendTestNotification = useCallback(async () => {
    if (permission !== "granted") return false;
    return showSystemNotification({ id: "nawa-test-notification", title: "إشعارات الجهاز تعمل بنجاح", isTest: true });
  }, [permission, showSystemNotification]);

  // Ask permission only from a user gesture; browsers intentionally block unsolicited permission prompts.
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported";
    }
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === "granted") setSettings((current) => ({ ...current, systemEnabled: true }));
      return result;
    } catch (error) {
      console.warn("تعذّر طلب إذن الإشعارات:", error);
      setPermission(getPermission());
      return "error";
    }
  }, []);

  useEffect(() => {
    const systemNotificationsEnabled = settings.systemEnabled && permission === "granted";
    if (!settings.inAppEnabled && !systemNotificationsEnabled) return undefined;

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
        if (systemNotificationsEnabled) showSystemNotification(task);
        if (settings.vibrate && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate([100, 50, 100]);
        }
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

const MAX_NATIVE_REMINDERS = 60;

export function stableNotificationId(value) {
  const input = String(value || "nawa");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483646 + 1;
}

export function buildNativeReminderNotifications(tasks, now = Date.now(), vibrate = true) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .filter((task) => task && !task.completed && typeof task.id === "string" && task.reminderAt)
    .map((task) => ({ task, reminderTime: new Date(task.reminderAt) }))
    .filter(({ reminderTime }) => Number.isFinite(reminderTime.getTime()) && reminderTime.getTime() > now)
    .sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime())
    .slice(0, MAX_NATIVE_REMINDERS)
    .map(({ task, reminderTime }) => ({
      id: stableNotificationId(task.id),
      title: "تذكير من نَواة",
      body: task.title,
      schedule: { at: reminderTime, allowWhileIdle: true },
      foreground: true,
      channelId: vibrate ? "nawa-task-reminders-vibrate" : "nawa-task-reminders-silent",
      smallIcon: "ic_stat_nawa",
      iconColor: "#7668e8",
      isExactNotification: true,
      isExactMandatory: false,
      extra: { nawa: "task-reminder", taskId: task.id },
    }));
}

export const REMINDER_GRACE_MS = 24 * 60 * 60 * 1000;
const MAX_DELIVERED_REMINDERS = 500;

export function getReminderKey(task) {
  return `${task.id}:${task.reminderAt}`;
}

/**
 * Returns reminders that became due exactly once per task/reminder timestamp.
 * Old missed reminders are marked as processed but are not replayed after 24h.
 */
export function collectDueReminders(tasks, deliveredMap, now = Date.now()) {
  const delivered = { ...(deliveredMap || {}) };
  const dueTasks = [];
  let changed = false;

  tasks.forEach((task) => {
    if (!task || task.completed || !task.reminderAt) return;
    const reminderTime = Date.parse(task.reminderAt);
    if (!Number.isFinite(reminderTime) || reminderTime > now) return;

    const key = getReminderKey(task);
    if (delivered[key]) return;

    delivered[key] = new Date(now).toISOString();
    changed = true;
    if (now - reminderTime <= REMINDER_GRACE_MS) dueTasks.push(task);
  });

  const keys = Object.keys(delivered);
  if (keys.length > MAX_DELIVERED_REMINDERS) {
    keys.sort((a, b) => Date.parse(delivered[b]) - Date.parse(delivered[a]));
    const keep = new Set(keys.slice(0, MAX_DELIVERED_REMINDERS));
    Object.keys(delivered).forEach((key) => {
      if (!keep.has(key)) delete delivered[key];
    });
    changed = true;
  }

  return { dueTasks, delivered, changed };
}

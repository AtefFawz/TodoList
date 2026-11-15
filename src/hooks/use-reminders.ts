import { useEffect, useRef } from "react";
import { collectDue, type Delivered } from "@/core/reminders";
import type { Task } from "@/core/model";

const KEY = "nawa:delivered:v1";

function load(): Delivered {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Delivered) : {};
  } catch {
    return {};
  }
}
function save(delivered: Delivered) {
  try {
    localStorage.setItem(KEY, JSON.stringify(delivered));
  } catch {
    // storage unavailable: a reminder may repeat after a reload, which is acceptable
  }
}

/**
 * Announces each reminder exactly once while the app is running.
 * `now` is the app clock, so the scan re-runs every tick and whenever tasks change.
 */
export function useReminders(tasks: readonly Task[], now: number, enabled: boolean, onDue: (task: Task, at: number) => void) {
  const delivered = useRef<Delivered | null>(null);
  const latest = useRef(onDue);
  useEffect(() => {
    latest.current = onDue;
  });

  useEffect(() => {
    if (!enabled) return;
    delivered.current ??= load();
    const result = collectDue(tasks, delivered.current, now);
    delivered.current = result.delivered;
    if (result.changed) save(result.delivered);
    for (const task of result.due) latest.current(task, now);
  }, [tasks, now, enabled]);
}

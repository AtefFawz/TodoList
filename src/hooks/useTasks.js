import { useCallback, useEffect, useState } from "react";
import { createId, normalizeTask, normalizeTaskList, readTasks, saveTasks, STORAGE_KEY } from "../utils/taskUtils";

export default function useTasks() {
  const [tasks, setTasks] = useState(readTasks);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Keep multiple open tabs in sync without overwriting the newest version on mount.
  useEffect(() => {
    const syncFromOtherTab = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const incoming = normalizeTaskList(JSON.parse(event.newValue));
        if (incoming) {
          setTasks((current) => JSON.stringify(current) === JSON.stringify(incoming) ? current : incoming);
        }
      } catch (error) {
        console.warn("تعذّر مزامنة المهام من علامة تبويب أخرى:", error);
      }
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => window.removeEventListener("storage", syncFromOtherTab);
  }, []);

  const addTask = useCallback((values) => {
    const now = new Date().toISOString();
    const task = normalizeTask({ ...values, id: createId(), completed: false, createdAt: now, updatedAt: now });
    if (!task) return false;
    setTasks((current) => [task, ...current]);
    return task;
  }, []);

  const updateTask = useCallback((id, values) => {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task;
      const nextTask = normalizeTask({ ...task, ...values, updatedAt: new Date().toISOString() });
      return nextTask || task;
    }));
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task;
      const completed = !task.completed;
      return {
        ...task,
        completed,
        reminderAt: completed ? "" : task.reminderAt,
        completedAt: completed ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const deleteTask = useCallback((id) => setTasks((current) => current.filter((task) => task.id !== id)), []);

  const duplicateTask = useCallback((id) => {
    const original = tasks.find((task) => task.id === id);
    if (!original) return null;
    const now = new Date().toISOString();
    const duplicate = normalizeTask({
      ...original,
      id: createId(),
      title: `${original.title} (نسخة)`,
      completed: false,
      completedAt: null,
      reminderAt: "",
      createdAt: now,
      updatedAt: now,
    });
    if (duplicate) setTasks((current) => [duplicate, ...current]);
    return duplicate;
  }, [tasks]);

  const clearCompleted = useCallback(() => setTasks((current) => current.filter((task) => !task.completed)), []);

  const replaceTasks = useCallback((incoming) => {
    const normalized = normalizeTaskList(incoming);
    if (!normalized || (incoming.length > 0 && normalized.length === 0)) return false;
    setTasks(normalized);
    return normalized.length;
  }, []);

  return { tasks, addTask, updateTask, toggleTask, deleteTask, duplicateTask, clearCompleted, replaceTasks };
}

import { describe, expect, it } from "vitest";
import type { Context } from "@/core/actions";
import { INBOX_ID } from "@/core/model";
import { STORAGE_KEY, createTodoStore, migrateFromEarlierVersions } from "./app";

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
};
let n = 0;
const ctx = (): Context => ({ now: new Date(2026, 10, 11, 12).getTime(), today: "2026-11-11", uid: () => `id${++n}` });

describe("todo store", () => {
  it("persists changes and reloads them", () => {
    const storage = memory();
    const a = createTodoStore({ storage, context: ctx });
    a.dispatch({ type: "add", task: { title: "hello" } });
    const b = createTodoStore({ storage, context: ctx });
    expect(b.data.get().tasks.map((t) => t.title)).toEqual(["hello"]);
  });

  it("falls back to defaults on corrupt or invalid storage", () => {
    for (const bad of ["{not json", '{"version":1}', "null", "[]"]) {
      const storage = memory();
      storage.map.set(STORAGE_KEY, bad);
      expect(createTodoStore({ storage, context: ctx }).data.get().tasks).toEqual([]);
    }
  });

  it("migrates the legacy v1 array once", () => {
    const storage = memory();
    storage.map.set("data", JSON.stringify([{ id: "a", heading: "old task", description: "d", complete: true }]));
    const store = createTodoStore({ storage, context: ctx });
    expect(store.data.get().tasks[0]).toMatchObject({ id: "a", title: "old task", notes: "d", done: true, listId: INBOX_ID });
  });

  it("undoes and redoes task changes", () => {
    const store = createTodoStore({ storage: null, context: ctx });
    store.dispatch({ type: "add", task: { title: "a" } });
    const id = store.data.get().tasks[0]!.id;
    store.dispatch({ type: "delete", id });
    expect(store.data.get().tasks).toHaveLength(0);
    expect(store.undo()).toBe(true);
    expect(store.data.get().tasks).toHaveLength(1);
    expect(store.redo()).toBe(true);
    expect(store.data.get().tasks).toHaveLength(0);
    expect(store.redo()).toBe(false);
  });

  it("a new change clears the redo stack", () => {
    const store = createTodoStore({ storage: null, context: ctx });
    store.dispatch({ type: "add", task: { title: "a" } });
    store.undo();
    store.dispatch({ type: "add", task: { title: "b" } });
    expect(store.redo()).toBe(false);
  });

  it("undo never reverts preferences, and preferences are not undoable", () => {
    const store = createTodoStore({ storage: null, context: ctx });
    store.dispatch({ type: "add", task: { title: "a" } });
    store.dispatch({ type: "settings", patch: { language: "en" } });
    store.undo();
    expect(store.data.get().tasks).toHaveLength(0);
    expect(store.data.get().settings.language).toBe("en");
    expect(store.undo()).toBe(false);
  });

  it("ignores no-op actions in history", () => {
    const store = createTodoStore({ storage: null, context: ctx });
    store.dispatch({ type: "delete", id: "ghost" });
    expect(store.undo()).toBe(false);
  });

  it("caps history", () => {
    const store = createTodoStore({ storage: null, context: ctx });
    for (let i = 0; i < 80; i++) store.dispatch({ type: "add", task: { title: `t${i}` } });
    expect(store.history.get().past).toHaveLength(50);
  });
});

describe("upgrading from Nawa 5.x", () => {
  const stored = (entries: Record<string, string>) => ({ getItem: (k: string) => entries[k] ?? null });

  it("folds tasks, theme and alert preferences into one document", () => {
    const data = migrateFromEarlierVersions(
      stored({
        "nawa.tasks.v2": JSON.stringify([{ id: "a", title: "Old", completed: false, priority: "high", category: "العمل" }]),
        "nawa.theme": "dark",
        "nawa.notifications.settings.v1": JSON.stringify({ inAppEnabled: false, systemEnabled: true, vibrate: false }),
      }),
      Date.now(),
    )!;
    expect(data.tasks[0]).toMatchObject({ title: "Old", priority: 3 });
    expect(data.settings).toMatchObject({ theme: "dark", inAppAlerts: false, systemAlerts: true, vibrate: false });
  });

  it("falls back to the original v1 format, then to nothing", () => {
    const v1 = migrateFromEarlierVersions(stored({ data: JSON.stringify([{ id: "1", heading: "Ancient", Complete: true }]) }), Date.now())!;
    expect(v1.tasks[0]).toMatchObject({ title: "Ancient", done: true });
    expect(migrateFromEarlierVersions(stored({}), Date.now())).toBeUndefined();
    expect(migrateFromEarlierVersions(stored({ "nawa.tasks.v2": "{broken" }), Date.now())).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { MAX_ALERTS, createAlertsStore } from "./alerts";

const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};
const alert = (id: string, taskId = "t") => ({ id, taskId, title: "Due", body: `body ${id}`, at: 1 });

describe("alerts store", () => {
  it("adds newest first, ignores duplicate ids and tracks unread", () => {
    const s = createAlertsStore(memory());
    s.push(alert("a"));
    s.push(alert("b"));
    s.push(alert("a"));
    expect(s.state.get().items.map((i) => i.id)).toEqual(["b", "a"]);
    s.markRead("a");
    expect(s.state.get().items.filter((i) => !i.read)).toHaveLength(1);
    s.markAllRead();
    expect(s.state.get().items.every((i) => i.read)).toBe(true);
  });

  it("marks by task, dismisses and clears", () => {
    const s = createAlertsStore(memory());
    s.push(alert("a", "t1"));
    s.push(alert("b", "t2"));
    s.markTaskRead("t1");
    expect(s.state.get().items.find((i) => i.id === "a")!.read).toBe(true);
    s.dismiss("b");
    expect(s.state.get().items).toHaveLength(1);
    s.clear();
    expect(s.state.get().items).toEqual([]);
  });

  it("is bounded and persisted", () => {
    const storage = memory();
    const s = createAlertsStore(storage);
    for (let i = 0; i < MAX_ALERTS + 10; i += 1) s.push(alert(`id${i}`));
    expect(s.state.get().items).toHaveLength(MAX_ALERTS);
    expect(createAlertsStore(storage).state.get().items).toHaveLength(MAX_ALERTS);
  });

  it("recovers from corrupt storage", () => {
    const storage = memory();
    storage.setItem("nawa:alerts:v1", "{ not json");
    expect(createAlertsStore(storage).state.get().items).toEqual([]);
  });
});

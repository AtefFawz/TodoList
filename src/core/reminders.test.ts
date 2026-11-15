import { describe, expect, it } from "vitest";
import { reduce, type Action, type Context } from "./actions";
import { defaultData, seededData, type Data, type Task } from "./model";
import { MAX_DELIVERED, REMINDER_GRACE_MS, collectDue, reminderKey, reminderTime, upcomingReminders } from "./reminders";
import { migrateNawaV5 } from "./legacy";
import { parseImport } from "./transfer";

const NOON = new Date(2026, 10, 11, 12, 0).getTime();
const TODAY = "2026-11-11";
const ctx = (now = NOON): Context => {
  let n = 0;
  return { now, today: TODAY, uid: () => `id${++n}` };
};
const run = (data: Data, actions: Action[], c = ctx()) => actions.reduce((d, a) => reduce(d, a, c), data);
const add = (task: Partial<Parameters<typeof reduce>[1] & { type: "add" }>["task"] & { title: string }) =>
  run(defaultData(), [{ type: "add", task }]).tasks[0]!;
const MIN = 60_000;

describe("reminderTime", () => {
  it("prefers an explicit instant, falls back to the due time, never fires for done tasks", () => {
    const explicit = add({ title: "a", due: TODAY, time: "18:00", reminderAt: NOON + 5 * MIN });
    expect(reminderTime(explicit)).toBe(NOON + 5 * MIN);
    const byDue = add({ title: "b", due: TODAY, time: "18:00" });
    expect(reminderTime(byDue)).toBe(new Date(2026, 10, 11, 18, 0).getTime());
    expect(reminderTime(add({ title: "c", due: TODAY }))).toBeNull(); // a day without a time has no moment
    expect(reminderTime({ ...explicit, done: true })).toBeNull();
  });
});

describe("collectDue", () => {
  const task = (over: Partial<Task> = {}): Task => ({ ...add({ title: "t", reminderAt: NOON - MIN }), ...over });

  it("announces a due reminder once", () => {
    const first = collectDue([task()], {}, NOON);
    expect(first.due).toHaveLength(1);
    expect(first.changed).toBe(true);
    const second = collectDue([task()], first.delivered, NOON + MIN);
    expect(second.due).toHaveLength(0);
    expect(second.changed).toBe(false);
  });

  it("ignores the future and completed tasks", () => {
    expect(collectDue([task({ reminderAt: NOON + MIN })], {}, NOON).due).toHaveLength(0);
    expect(collectDue([task({ done: true })], {}, NOON).due).toHaveLength(0);
  });

  it("marks reminders missed by more than a day as handled without replaying them", () => {
    const stale = task({ reminderAt: NOON - REMINDER_GRACE_MS - MIN });
    const result = collectDue([stale], {}, NOON);
    expect(result.due).toHaveLength(0);
    expect(Object.keys(result.delivered)).toEqual([reminderKey(stale)]);
  });

  it("re-announces when the reminder moves (snooze) because the key includes the instant", () => {
    const original = task();
    const { delivered } = collectDue([original], {}, NOON);
    const snoozed = { ...original, reminderAt: NOON + 10 * MIN };
    expect(collectDue([snoozed], delivered, NOON + 11 * MIN).due).toHaveLength(1);
  });

  it("keeps the delivered map bounded, newest first", () => {
    const delivered = Object.fromEntries(Array.from({ length: MAX_DELIVERED + 20 }, (_, i) => [`k${i}`, i]));
    const result = collectDue([], delivered, NOON);
    expect(Object.keys(result.delivered)).toHaveLength(MAX_DELIVERED);
    expect(result.delivered["k0"]).toBeUndefined();
    expect(result.delivered[`k${MAX_DELIVERED + 19}`]).toBeDefined();
  });
});

describe("upcomingReminders", () => {
  it("returns the nearest future reminders, soonest first, capped", () => {
    const tasks = [60, 5, 30, -10].map((m, i) => ({ ...add({ title: `t${i}`, reminderAt: NOON + m * MIN }), id: `t${i}` }));
    expect(upcomingReminders(tasks, NOON).map((r) => r.task.id)).toEqual(["t1", "t2", "t0"]);
    expect(upcomingReminders(tasks, NOON, 2)).toHaveLength(2);
  });
});

describe("reducer: reminders", () => {
  it("snooze moves the reminder to now + minutes", () => {
    const d = run(defaultData(), [
      { type: "add", task: { title: "x", reminderAt: NOON - MIN } },
      { type: "snooze", id: "id1", minutes: 10 },
    ]);
    expect(d.tasks[0]!.reminderAt).toBe(NOON + 10 * MIN);
  });

  it("completing clears the reminder; completing a repeating task shifts it to the next occurrence", () => {
    const once = run(defaultData(), [
      { type: "add", task: { title: "x", reminderAt: NOON + MIN } },
      { type: "toggle", id: "id1" },
    ]);
    expect(once.tasks[0]!.reminderAt).toBeNull();

    const reminder = new Date(2026, 10, 11, 17, 30).getTime();
    const repeating = run(defaultData(), [
      { type: "add", task: { title: "x", due: TODAY, repeat: "daily", reminderAt: reminder } },
      { type: "toggle", id: "id1" },
    ]);
    expect(repeating.tasks[0]!.due).toBe("2026-11-12");
    expect(repeating.tasks[0]!.reminderAt).toBe(new Date(2026, 10, 12, 17, 30).getTime());
    expect(repeating.tasks[0]!.done).toBe(false);
  });
});

describe("migration from Nawa 5.x", () => {
  const v5 = [
    {
      id: "a",
      title: "Report",
      description: "d",
      completed: false,
      priority: "high",
      category: "العمل",
      dueDate: "2026-11-12",
      reminderAt: "2026-11-12T08:00:00.000Z",
      createdAt: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "b",
      title: "Run",
      completed: true,
      priority: "low",
      category: "الصحة",
      completedAt: "2026-11-10T07:00:00.000Z",
      createdAt: "2026-11-02T10:00:00.000Z",
    },
    { id: "c", title: "Misc", completed: false, priority: "weird", category: "  " },
    { id: "a", title: "Duplicate id", completed: false },
    { title: "" },
    "junk",
  ];

  it("turns categories into lists, maps priorities and keeps reminders", () => {
    const data = migrateNawaV5(v5, NOON)!;
    expect(data.tasks.map((t) => t.title)).toEqual(["Report", "Run", "Misc", "Duplicate id"]);
    expect(new Set(data.tasks.map((t) => t.id)).size).toBe(4);
    const names = data.lists.map((l) => l.name);
    expect(names).toContain("العمل");
    expect(names).toContain("الصحة");
    const [report, run_, misc] = data.tasks as [Task, Task, Task];
    expect(data.lists.find((l) => l.id === report.listId)!.name).toBe("العمل");
    expect(misc.listId).toBe("inbox");
    expect([report.priority, run_.priority, misc.priority]).toEqual([3, 1, 0]);
    expect(report.reminderAt).toBe(Date.parse("2026-11-12T08:00:00.000Z"));
    expect(run_.done).toBe(true);
    expect(run_.reminderAt).toBeNull();
    expect(Object.values(data.history).reduce((a, b) => a + b, 0)).toBe(1); // streak history survives
  });

  it("is what import falls back to, so old backups still load", () => {
    const imported = parseImport(JSON.stringify(v5), NOON)!;
    expect(imported.tasks).toHaveLength(4);
    expect(parseImport("not json", NOON)).toBeNull();
    expect(parseImport(JSON.stringify({ nope: 1 }), NOON)).toBeNull();
  });
});

describe("seededData", () => {
  it("creates the four starter lists in the user's language", () => {
    let n = 0;
    const ar = seededData("ar", () => `l${++n}`);
    expect(ar.lists.map((l) => l.name)).toEqual(["", "العمل", "شخصي", "التعلّم", "الصحة"]);
    expect(ar.settings.language).toBe("ar");
    expect(seededData("en").lists.map((l) => l.name)).toContain("Work");
  });
});

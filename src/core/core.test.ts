import { describe, expect, it } from "vitest";
import { reduce, type Action, type Context } from "./actions";
import { addDays, addMonths, diffDays, dueAt, isDayKey, nextOccurrence, nextWeekday, toDayKey, weekday } from "./dates";
import { migrateLegacyTasks } from "./legacy";
import { INBOX_ID, defaultData, type Data } from "./model";
import { allTags, computeCounts, groupByDay, isOverdue, matchesQuery, parseViewKey, selectTasks, sortTasks, viewKey } from "./selectors";
import { computeStats } from "./stats";
import { exportCsv, exportJson, parseImport } from "./transfer";

const TODAY = "2026-11-11"; // Wednesday
const NOON = new Date(2026, 10, 11, 12, 0).getTime();

function makeCtx(overrides: Partial<Context> = {}): Context {
  let n = 0;
  return { now: NOON, today: TODAY, uid: () => `id${++n}`, ...overrides };
}
const run = (data: Data, actions: Action[], ctx = makeCtx()) => actions.reduce((d, a) => reduce(d, a, ctx), data);
const withTasks = (...titles: string[]) =>
  run(
    defaultData(),
    titles.map((title) => ({ type: "add", task: { title } }) as Action),
  );

describe("dates", () => {
  it("round-trips keys and validates them", () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(isDayKey("2026-02-29")).toBe(false);
    expect(isDayKey("2028-02-29")).toBe(true);
    expect(isDayKey("2026-1-5")).toBe(false);
    expect(isDayKey(42)).toBe(false);
  });
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("clamps month arithmetic to the end of shorter months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
  });
  it("survives DST changes", () => {
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
    expect(diffDays("2026-10-24", "2026-10-26")).toBe(2);
  });
  it("finds the next weekday strictly after the given date", () => {
    expect(weekday(TODAY)).toBe(3);
    expect(nextWeekday(TODAY, 3)).toBe("2026-11-18");
    expect(nextWeekday(TODAY, 4)).toBe("2026-11-12");
  });
  it("computes due moments", () => {
    expect(new Date(dueAt("2026-11-11", "09:30")).getHours()).toBe(9);
    expect(new Date(dueAt("2026-11-11", null)).getHours()).toBe(23);
  });
});

describe("nextOccurrence", () => {
  it("returns null for non-repeating tasks", () => expect(nextOccurrence(TODAY, "none", TODAY)).toBeNull());
  it("daily: tomorrow, or the day after a future due date", () => {
    expect(nextOccurrence(TODAY, "daily", TODAY)).toBe("2026-11-12");
    expect(nextOccurrence("2026-11-20", "daily", TODAY)).toBe("2026-11-21");
  });
  it("daily: an overdue task does not stay overdue", () => {
    expect(nextOccurrence("2026-10-01", "daily", TODAY)).toBe("2026-11-12");
  });
  it("weekly keeps the weekday and lands in the future", () => {
    expect(nextOccurrence("2026-11-09", "weekly", TODAY)).toBe("2026-11-16"); // was Monday
    expect(nextOccurrence("2026-10-05", "weekly", TODAY)).toBe("2026-11-16");
  });
  it("monthly keeps the day of month", () => {
    expect(nextOccurrence("2026-10-15", "monthly", TODAY)).toBe("2026-11-15");
    expect(nextOccurrence("2026-01-31", "monthly", TODAY)).toBe("2026-11-30");
  });
  it("weekdays skips Saturday and Sunday", () => {
    expect(nextOccurrence("2026-11-13", "weekdays", "2026-11-13")).toBe("2026-11-16"); // Fri → Mon
    expect(nextOccurrence("2026-11-11", "weekdays", TODAY)).toBe("2026-11-12");
  });
  it("a repeating task without a date starts counting from today", () => {
    expect(nextOccurrence(null, "daily", TODAY)).toBe("2026-11-12");
  });
});

describe("reduce: tasks", () => {
  it("adds trimmed tasks at the end and ignores blanks", () => {
    const d = run(defaultData(), [
      { type: "add", task: { title: "  first " } },
      { type: "add", task: { title: "second", tags: ["#a", "a", " b "] } },
      { type: "add", task: { title: "   " } },
    ]);
    expect(d.tasks.map((t) => t.title)).toEqual(["first", "second"]);
    expect(d.tasks[1]!.tags).toEqual(["a", "b"]);
    expect(d.tasks[1]!.order).toBeGreaterThan(d.tasks[0]!.order);
  });
  it("falls back to the inbox for unknown lists and drops a time without a date", () => {
    const d = run(defaultData(), [{ type: "add", task: { title: "x", listId: "ghost", time: "10:00" } }]);
    expect(d.tasks[0]).toMatchObject({ listId: INBOX_ID, time: null });
  });
  it("updates, trims titles, and never blanks a title", () => {
    let d = withTasks("a");
    const id = d.tasks[0]!.id;
    d = run(d, [{ type: "update", id, patch: { title: "  b  " } }]);
    expect(d.tasks[0]!.title).toBe("b");
    d = run(d, [{ type: "update", id, patch: { title: "   " } }]);
    expect(d.tasks[0]!.title).toBe("b");
  });
  it("clearing the due date also clears the time", () => {
    let d = run(defaultData(), [{ type: "add", task: { title: "x", due: TODAY, time: "10:00" } }]);
    d = run(d, [{ type: "update", id: d.tasks[0]!.id, patch: { due: null } }]);
    expect(d.tasks[0]).toMatchObject({ due: null, time: null });
  });
  it("ignores unknown ids", () => {
    const d = withTasks("a");
    expect(
      run(d, [
        { type: "toggle", id: "nope" },
        { type: "delete", id: "nope" },
        { type: "update", id: "nope", patch: { pinned: true } },
      ]),
    ).toEqual(d);
  });
  it("deletes and clears completed", () => {
    let d = withTasks("a", "b", "c");
    d = run(d, [
      { type: "toggle", id: d.tasks[0]!.id },
      { type: "delete", id: d.tasks[1]!.id },
    ]);
    expect(d.tasks).toHaveLength(2);
    d = run(d, [{ type: "clearDone" }]);
    expect(d.tasks.map((t) => t.title)).toEqual(["c"]);
  });
});

describe("reduce: completion", () => {
  it("completes, records history, and reverses cleanly", () => {
    let d = withTasks("a");
    const id = d.tasks[0]!.id;
    d = run(d, [{ type: "toggle", id }]);
    expect(d.tasks[0]).toMatchObject({ done: true, doneAt: NOON });
    expect(d.history[TODAY]).toBe(1);
    d = run(d, [{ type: "toggle", id }]);
    expect(d.tasks[0]).toMatchObject({ done: false, doneAt: null });
    expect(d.history).toEqual({});
  });
  it("un-completing credits the day it was completed, not today", () => {
    let d = withTasks("a");
    const id = d.tasks[0]!.id;
    d = run(d, [{ type: "toggle", id }], makeCtx({ now: new Date(2026, 10, 9, 10).getTime(), today: "2026-11-09" }));
    expect(d.history).toEqual({ "2026-11-09": 1 });
    d = run(d, [{ type: "toggle", id }]);
    expect(d.history).toEqual({});
  });
  it("a repeating task advances instead of finishing, and resets its checklist", () => {
    let d = run(defaultData(), [{ type: "add", task: { title: "water", due: TODAY, repeat: "daily", subtasks: ["a", "b"] } }]);
    const id = d.tasks[0]!.id;
    d = run(d, [{ type: "toggleSubtask", id, subtaskId: d.tasks[0]!.subtasks[0]!.id }]);
    d = run(d, [{ type: "toggle", id }]);
    expect(d.tasks[0]).toMatchObject({ done: false, due: "2026-11-12" });
    expect(d.tasks[0]!.subtasks.every((s) => !s.done)).toBe(true);
    expect(d.history[TODAY]).toBe(1);
  });
});

describe("reduce: subtasks, ordering, lists, settings, focus", () => {
  it("manages subtasks", () => {
    let d = withTasks("a");
    const id = d.tasks[0]!.id;
    d = run(d, [
      { type: "addSubtask", id, title: "x" },
      { type: "addSubtask", id, title: " " },
      { type: "addSubtask", id, title: "y" },
    ]);
    expect(d.tasks[0]!.subtasks.map((s) => s.title)).toEqual(["x", "y"]);
    const sub = d.tasks[0]!.subtasks[0]!.id;
    d = run(d, [{ type: "toggleSubtask", id, subtaskId: sub }]);
    expect(d.tasks[0]!.subtasks[0]!.done).toBe(true);
    d = run(d, [{ type: "deleteSubtask", id, subtaskId: sub }]);
    expect(d.tasks[0]!.subtasks.map((s) => s.title)).toEqual(["y"]);
  });
  it("reorders a subset without disturbing other tasks", () => {
    const d = withTasks("a", "b", "c", "d");
    const [a, b, c, dd] = d.tasks.map((t) => t.id) as [string, string, string, string];
    const next = run(d, [{ type: "reorder", ids: [c, a] }]); // c and a swap slots
    expect(sortTasks(next.tasks, "manual").map((t) => t.title)).toEqual(["c", "b", "a", "d"]);
    expect(next.tasks.find((t) => t.id === b)!.order).toBe(d.tasks[1]!.order);
    expect(next.tasks.find((t) => t.id === dd)!.order).toBe(d.tasks[3]!.order);
  });
  it("creates, edits and deletes lists; deleting moves tasks to the inbox; the inbox is permanent", () => {
    let d = run(defaultData(), [
      { type: "addList", name: " Work ", color: "#fff" },
      { type: "addList", name: "", color: "#fff" },
    ]);
    expect(d.lists.map((l) => l.name)).toEqual(["", "Work"]);
    const id = d.lists[1]!.id;
    d = run(d, [
      { type: "add", task: { title: "t", listId: id } },
      { type: "updateList", id, patch: { name: "Job" } },
    ]);
    expect(d.lists[1]!.name).toBe("Job");
    d = run(d, [
      { type: "deleteList", id },
      { type: "deleteList", id: INBOX_ID },
    ]);
    expect(d.lists).toHaveLength(1);
    expect(d.tasks[0]!.listId).toBe(INBOX_ID);
  });
  it("updates settings", () => {
    const d = run(defaultData(), [{ type: "settings", patch: { language: "en", sort: "due" } }]);
    expect(d.settings).toMatchObject({ language: "en", sort: "due", theme: "system" });
  });
  it("records focus time on the task and the day", () => {
    let d = withTasks("a");
    const id = d.tasks[0]!.id;
    d = run(d, [
      { type: "focus", id, ms: 1500 },
      { type: "focus", id: null, ms: 500 },
      { type: "focus", id, ms: 0 },
    ]);
    expect(d.tasks[0]!.focusMs).toBe(1500);
    expect(d.focusHistory[TODAY]).toBe(2000);
  });
});

describe("selectors", () => {
  const build = () =>
    run(defaultData(), [
      { type: "add", task: { title: "overdue", due: "2026-11-09", priority: 1 } },
      { type: "add", task: { title: "today late", due: TODAY, time: "18:00", priority: 3 } },
      { type: "add", task: { title: "today early", due: TODAY, time: "08:00" } },
      { type: "add", task: { title: "tomorrow", due: "2026-11-12", tags: ["home"] } },
      { type: "add", task: { title: "next month", due: "2026-12-20" } },
      { type: "add", task: { title: "someday", tags: ["home", "idea"] } },
      { type: "addList", name: "Work", color: "#000" },
    ]);
  const opts = { today: TODAY, query: "", now: NOON };

  it("today includes overdue; upcoming excludes them", () => {
    const d = build();
    expect(selectTasks(d, { kind: "today" }, opts).open.map((t) => t.title)).toEqual(["overdue", "today early", "today late"]);
    expect(selectTasks(d, { kind: "upcoming" }, opts).open.map((t) => t.title)).toEqual(["tomorrow", "next month"]);
  });
  it("filters by tag and list, and splits done tasks out", () => {
    let d = build();
    expect(selectTasks(d, { kind: "tag", tag: "home" }, opts).open).toHaveLength(2);
    d = run(d, [{ type: "toggle", id: d.tasks[5]!.id }]);
    const sel = selectTasks(d, { kind: "inbox" }, opts);
    expect(sel.done.map((t) => t.title)).toEqual(["someday"]);
    expect(sel.open).toHaveLength(5);
    expect(selectTasks(d, { kind: "done" }, opts).done).toHaveLength(1);
    expect(selectTasks(d, { kind: "list", id: d.lists[1]!.id }, opts).open).toHaveLength(0);
  });
  it("shows tasks completed today in the Today view", () => {
    let d = build();
    d = run(d, [{ type: "toggle", id: d.tasks[2]!.id }]);
    expect(selectTasks(d, { kind: "today" }, opts).done.map((t) => t.title)).toEqual(["today early"]);
  });
  it("search ignores the view and is diacritic/case insensitive, with all terms required", () => {
    let d = build();
    d = run(d, [
      { type: "add", task: { title: "اشتري لبن", tags: ["بيت"] } },
      { type: "add", task: { title: "Café run", notes: "oat milk" } },
    ]);
    expect(selectTasks(d, { kind: "today" }, { ...opts, query: "TOMORROW" }).open.map((t) => t.title)).toEqual(["tomorrow"]);
    expect(selectTasks(d, { kind: "inbox" }, { ...opts, query: "لبن بيت" }).open).toHaveLength(1);
    expect(selectTasks(d, { kind: "inbox" }, { ...opts, query: "oat milk" }).open).toHaveLength(1);
    expect(selectTasks(d, { kind: "inbox" }, { ...opts, query: "oat soda" }).open).toHaveLength(0);
    expect(matchesQuery(d.tasks[0]!, "")).toBe(true);
  });
  it("sorts: pinned first, then by the chosen order", () => {
    let d = build();
    d = run(d, [{ type: "update", id: d.tasks[4]!.id, patch: { pinned: true } }]);
    expect(sortTasks(d.tasks, "due")[0]!.title).toBe("next month");
    const byPriority = sortTasks(
      d.tasks.filter((t) => !t.pinned),
      "priority",
    ).map((t) => t.title);
    expect(byPriority[0]).toBe("today late");
    expect(
      sortTasks(
        d.tasks.filter((t) => !t.pinned),
        "due",
      )
        .map((t) => t.title)
        .at(-1),
    ).toBe("someday");
  });
  it("groups by due day", () => {
    const d = build();
    const groups = groupByDay(sortTasks(d.tasks, "due"), TODAY);
    expect(groups.map((g) => g.key)).toEqual(["overdue", "today", "tomorrow", "later", "none"]);
    expect(groups[1]!.tasks).toHaveLength(2);
    const near = groupByDay([{ ...d.tasks[0]!, due: "2026-11-15" }], TODAY);
    expect(near[0]!.key).toBe("2026-11-15");
  });
  it("counts per view, list and tag", () => {
    const c = computeCounts(build(), TODAY);
    expect(c).toMatchObject({ inbox: 6, today: 3, upcoming: 2, all: 6, done: 0, overdue: 1 });
    expect(c.tags).toEqual({ home: 2, idea: 1 });
    expect(allTags(build())).toEqual(["home", "idea"]);
  });
  it("detects overdue tasks by date and time", () => {
    const d = build();
    const early = d.tasks[2]!; // today 08:00; now is noon
    expect(isOverdue(early, NOON)).toBe(true);
    expect(isOverdue(d.tasks[1]!, NOON)).toBe(false);
    expect(isOverdue({ ...early, done: true }, NOON)).toBe(false);
  });
  it("round-trips view keys and falls back safely", () => {
    for (const v of [{ kind: "today" }, { kind: "list", id: "x" }, { kind: "tag", tag: "بيت" }, { kind: "stats" }] as const) {
      expect(parseViewKey(viewKey(v))).toEqual(v);
    }
    expect(parseViewKey("garbage")).toEqual({ kind: "today" });
  });
});

describe("stats", () => {
  const dataWith = (history: Record<string, number>, focus: Record<string, number> = {}): Data => ({
    ...defaultData(),
    history,
    focusHistory: focus,
  });

  it("counts a streak ending today", () => {
    const s = computeStats(dataWith({ "2026-11-11": 2, "2026-11-10": 1, "2026-11-09": 4, "2026-11-07": 1 }), TODAY);
    expect(s.streak).toBe(3);
    expect(s.doneToday).toBe(2);
  });
  it("keeps the streak alive until the end of today", () => {
    expect(computeStats(dataWith({ "2026-11-10": 1, "2026-11-09": 1 }), TODAY).streak).toBe(2);
    expect(computeStats(dataWith({ "2026-11-08": 1 }), TODAY).streak).toBe(0);
  });
  it("tracks the best streak separately", () => {
    const s = computeStats(dataWith({ "2026-10-01": 1, "2026-10-02": 1, "2026-10-03": 1, "2026-10-04": 1, "2026-11-11": 1 }), TODAY);
    expect(s).toMatchObject({ streak: 1, bestStreak: 4 });
  });
  it("builds a 7-day window, oldest first", () => {
    const s = computeStats(dataWith({ "2026-11-05": 3, "2026-11-11": 1 }, { "2026-11-11": 60_000 }), TODAY);
    expect(s.week.map((d) => d.day)[0]).toBe("2026-11-05");
    expect(s.week).toHaveLength(7);
    expect(s.weekTotal).toBe(4);
    expect(s.focusMsToday).toBe(60_000);
    expect(s.totalCompleted).toBe(4);
  });
  it("summarises open work", () => {
    const d = run(defaultData(), [
      { type: "add", task: { title: "a", priority: 3, due: "2026-11-01" } },
      { type: "add", task: { title: "b", priority: 3 } },
      { type: "add", task: { title: "c" } },
    ]);
    expect(computeStats(d, TODAY)).toMatchObject({ open: 3, overdue: 1, openByPriority: [1, 0, 0, 2] });
  });
});

describe("legacy migration and import/export", () => {
  it("migrates the v1 array, tolerating both complete spellings and junk", () => {
    const d = migrateLegacyTasks(
      [
        { id: "1", heading: "نَواة", description: "", complete: false },
        { id: "2", heading: "  done  ", description: "x", complete: true },
        { id: "3", heading: "typo", description: "", Complete: true },
        { id: "4", heading: "" },
        null,
        "junk",
      ],
      NOON,
    )!;
    expect(d.tasks.map((t) => [t.id, t.title, t.done])).toEqual([
      ["1", "نَواة", false],
      ["2", "done", true],
      ["3", "typo", true],
    ]);
    expect(d.tasks.every((t) => t.listId === INBOX_ID)).toBe(true);
    expect(migrateLegacyTasks({ not: "an array" }, NOON)).toBeNull();
  });
  it("round-trips a full export", () => {
    const d = run(defaultData(), [{ type: "add", task: { title: "x", due: TODAY, tags: ["a"], subtasks: ["s"] } }]);
    expect(parseImport(exportJson(d), NOON)).toEqual(d);
  });
  it("imports v1 files and rejects garbage without throwing", () => {
    expect(parseImport(JSON.stringify([{ id: "1", heading: "a", description: "", complete: false }]), NOON)!.tasks).toHaveLength(1);
    expect(parseImport("not json", NOON)).toBeNull();
    expect(parseImport('{"version":99}', NOON)).toBeNull();
  });
  it("rejects tasks with invalid dates", () => {
    const d = run(defaultData(), [{ type: "add", task: { title: "x" } }]);
    const bad = JSON.parse(exportJson(d));
    bad.tasks[0].due = "2026-13-45";
    expect(parseImport(JSON.stringify(bad), NOON)).toBeNull();
  });
  it("exports CSV with quoting and formula-injection protection", () => {
    const d = run(defaultData(), [{ type: "add", task: { title: '=HYPERLINK("x")', notes: 'say "hi", ok' } }]);
    const csv = exportCsv(d);
    expect(csv.split("\n")[0]).toBe("title,notes,done,list,priority,due,time,reminder,tags,repeat,subtasks");
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"say ""hi"", ok"');
  });
});

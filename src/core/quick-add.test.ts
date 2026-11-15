import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quick-add";

// Wednesday 2026-11-11
const TODAY = "2026-11-11";
const parse = (text: string, extra: Partial<Parameters<typeof parseQuickAdd>[1]> = {}) => parseQuickAdd(text, { today: TODAY, ...extra });

describe("quick add: titles", () => {
  it("keeps plain text untouched", () => {
    const r = parse("Buy milk");
    expect(r).toMatchObject({ title: "Buy milk", due: null, time: null, priority: 0, tags: [], repeat: "none" });
  });
  it("does not eat ordinary words that look like abbreviations", () => {
    expect(parse("Sat down with Sun Tzu").due).toBeNull();
    expect(parse("اتكلم مع احد الاصدقاء").due).toBeNull();
  });
  it("returns an empty title when everything was metadata", () => {
    expect(parse("tomorrow !high").title).toBe("");
  });
});

describe("quick add: dates", () => {
  it.each([
    ["Call mom today", "2026-11-11"],
    ["Call mom tomorrow", "2026-11-12"],
    ["Call mom tmrw", "2026-11-12"],
    ["Call mom next week", "2026-11-18"],
    ["Call mom next month", "2026-12-11"],
    ["Call mom in 3 days", "2026-11-14"],
    ["Call mom in 2 weeks", "2026-11-25"],
    ["Call mom in 1 month", "2026-12-11"],
    ["Call mom on monday", "2026-11-16"],
    ["Call mom wednesday", "2026-11-18"], // same weekday means next week, never today
    ["Call mom next fri", "2026-11-13"],
    ["Call mom on sat", "2026-11-14"],
    ["Call mom 2026-12-25", "2026-12-25"],
    ["Call mom 25/12", "2026-12-25"],
    ["Call mom 3/1", "2027-01-03"], // already passed this year → next year
  ])("%s → %s", (text, due) => {
    expect(parse(text).due).toBe(due);
  });

  it("reads numeric dates as month/day for English users when asked", () => {
    expect(parse("Party 12/25", { dateOrder: "mdy" }).due).toBe("2026-12-25");
  });
  it("rejects impossible dates", () => {
    expect(parse("Pay 31/2").due).toBeNull();
    expect(parse("Pay 2026-02-30").due).toBeNull();
  });

  it.each([
    ["اشتري لبن النهارده", "2026-11-11"],
    ["اشتري لبن اليوم", "2026-11-11"],
    ["اشتري لبن بكرة", "2026-11-12"],
    ["اشتري لبن بكره", "2026-11-12"],
    ["اشتري لبن غدًا", "2026-11-12"],
    ["اشتري لبن بعد بكرة", "2026-11-13"],
    ["اشتري لبن بعد 3 ايام", "2026-11-14"],
    ["اشتري لبن بعد ٣ أيام", "2026-11-14"],
    ["اشتري لبن بعد يومين", "2026-11-13"],
    ["اشتري لبن بعد اسبوعين", "2026-11-25"],
    ["اشتري لبن بعد شهرين", "2027-01-11"],
    ["اشتري لبن الاسبوع الجاي", "2026-11-18"],
    ["اشتري لبن الأسبوع القادم", "2026-11-18"],
    ["اشتري لبن يوم الجمعة", "2026-11-13"],
    ["اشتري لبن الخميس", "2026-11-12"],
    ["اشتري لبن الاتنين الجاي", "2026-11-16"],
    ["اشتري لبن 25/12", "2026-12-25"],
  ])("%s → %s", (text, due) => {
    const r = parse(text);
    expect(r.due).toBe(due);
    expect(r.title).toBe("اشتري لبن");
  });
});

describe("quick add: time", () => {
  it.each([
    ["Meet 5pm", "17:00"],
    ["Meet 5:30pm", "17:30"],
    ["Meet 5 pm", "17:00"],
    ["Meet 12am", "00:00"],
    ["Meet 12pm", "12:00"],
    ["Meet at 17:45", "17:45"],
    ["Meet 9am", "09:00"],
    ["Meet 9 am", "09:00"],
    ["اجتماع 5م", "17:00"],
    ["اجتماع 5 م", "17:00"],
    ["اجتماع الساعة 5 مساء", "17:00"],
    ["اجتماع الساعة 9 صباحا", "09:00"],
    ["اجتماع 6:30 م", "18:30"],
    ["اجتماع الساعة 14:00", "14:00"],
    ["اجتماع ٥ م", "17:00"],
  ])("%s → %s", (text, time) => {
    const r = parse(text, { nowTime: "08:00" });
    expect(r.time).toBe(time);
    expect(r.title).toBe(text.startsWith("Meet") ? "Meet" : "اجتماع");
  });

  it("does not treat a bare number as a time", () => {
    const r = parse("Buy 5 apples");
    expect(r.time).toBeNull();
    expect(r.title).toBe("Buy 5 apples");
  });
  it("rejects invalid clocks", () => {
    expect(parse("Meet 13pm").time).toBeNull();
    expect(parse("Meet 25:00").time).toBeNull();
  });
  it("a time without a date means the next time that clock shows", () => {
    expect(parse("Meet 5pm", { nowTime: "10:00" }).due).toBe("2026-11-11");
    expect(parse("Meet 9am", { nowTime: "10:00" }).due).toBe("2026-11-12");
  });
  it("keeps an explicit date when a time is also given", () => {
    const r = parse("Meet tomorrow 5pm", { nowTime: "23:00" });
    expect(r).toMatchObject({ due: "2026-11-12", time: "17:00", title: "Meet" });
  });
});

describe("quick add: tags, lists, priority, repeat", () => {
  it("extracts tags and lists in any language", () => {
    const r = parse("اشتري لبن #بيت #shopping @مشتريات");
    expect(r.tags).toEqual(["بيت", "shopping"]);
    expect(r.list).toBe("مشتريات");
    expect(r.title).toBe("اشتري لبن");
  });
  it("deduplicates tags", () => {
    expect(parse("x #a #a").tags).toEqual(["a"]);
  });
  it.each([
    ["x !high", 3],
    ["x !3", 3],
    ["x !!!", 3],
    ["x !عالي", 3],
    ["x !medium", 2],
    ["x !!", 2],
    ["x !متوسط", 2],
    ["x !low", 1],
    ["x !منخفض", 1],
    ["x !whatever", 0],
  ])("%s → priority %i", (text, priority) => {
    expect(parse(text).priority).toBe(priority);
  });
  it("an unknown !word stays in the title", () => {
    expect(parse("wow !whatever").title).toBe("wow !whatever");
  });
  it.each([
    ["Water plants every day", "daily"],
    ["Water plants daily", "daily"],
    ["Water plants every week", "weekly"],
    ["Water plants every month", "monthly"],
    ["Standup every weekday", "weekdays"],
    ["اسقي الزرع كل يوم", "daily"],
    ["اسقي الزرع كل اسبوع", "weekly"],
    ["اسقي الزرع كل شهر", "monthly"],
    ["اسقي الزرع يوميا", "daily"],
  ])("%s → %s", (text, repeat) => {
    expect(parse(text).repeat).toBe(repeat);
  });
  it("'every monday' repeats weekly starting next Monday", () => {
    expect(parse("Gym every monday")).toMatchObject({ repeat: "weekly", due: "2026-11-16", title: "Gym" });
    expect(parse("جيم كل الاثنين")).toMatchObject({ repeat: "weekly", due: "2026-11-16", title: "جيم" });
  });
});

describe("quick add: everything at once", () => {
  it("parses a full Egyptian Arabic sentence", () => {
    expect(parse("اشتري لبن بكرة 5م #بيت !عالي", { nowTime: "09:00" })).toEqual({
      title: "اشتري لبن",
      due: "2026-11-12",
      time: "17:00",
      priority: 3,
      tags: ["بيت"],
      list: null,
      repeat: "none",
    });
  });
  it("parses a full English sentence", () => {
    expect(parse("Call mom tomorrow 6pm !high #family every week", { nowTime: "09:00" })).toEqual({
      title: "Call mom",
      due: "2026-11-12",
      time: "18:00",
      priority: 3,
      tags: ["family"],
      list: null,
      repeat: "weekly",
    });
  });
  it("is stable on empty and whitespace input", () => {
    expect(parse("").title).toBe("");
    expect(parse("   ").title).toBe("");
  });
});

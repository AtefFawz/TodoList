import { describe, expect, it } from "vitest";
import { ar } from "./ar";
import { en } from "./en";
import { createTranslator, interpolate } from "./index";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  it("Arabic has every English key, plus only extra plural categories", () => {
    const arabic = Object.keys(ar);
    for (const key of Object.keys(en)) expect(arabic, key).toContain(key);
    const extras = arabic.filter((k) => !(k in en));
    for (const key of extras) {
      expect(key, key).toMatch(/_(zero|two|few|many)$/);
      expect(key.replace(/_(zero|two|few|many)$/, "_other") in en, `${key} needs an _other fallback`).toBe(true);
    }
  });
  it("use compatible placeholders (plural families may drop {count} for fixed forms)", () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      const english = new Set(placeholders(en[key]));
      expect(
        placeholders(ar[key]).filter((p) => !english.has(p) && p !== "count"),
        key,
      ).toEqual([]);
      if (!key.includes("_")) expect(placeholders(ar[key]), key).toEqual(placeholders(en[key]));
    }
  });
  it("have no empty strings", () => {
    for (const value of [...Object.values(en), ...Object.values(ar)] as string[]) expect(value.trim().length).toBeGreaterThan(0);
  });
});

describe("translator", () => {
  it("interpolates and leaves unknown placeholders visible", () => {
    expect(interpolate("Hi {name}, {x}", { name: "Atef" })).toBe("Hi Atef, {x}");
  });
  it("pluralises English", () => {
    const t = createTranslator("en");
    expect(t.plural("openCount", 1)).toBe("1 open task");
    expect(t.plural("openCount", 3)).toBe("3 open tasks");
  });
  it.each([
    [0, "لا مهام مفتوحة"],
    [1, "مهمة مفتوحة واحدة"],
    [2, "مهمتان مفتوحتان"],
    [5, "5 مهام مفتوحة"],
    [11, "11 مهمة مفتوحة"],
    [100, "100 مهمة مفتوحة"],
  ])("pluralises Arabic: %i", (count, expected) => {
    expect(createTranslator("ar").plural("openCount", count)).toBe(expected);
  });
  it("falls back to _other when a category is missing", () => {
    expect(createTranslator("en").plural("overdueBy", 0)).toBe("0 days overdue");
  });
});

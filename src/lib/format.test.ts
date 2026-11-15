import { describe, expect, it } from "vitest";
import { createTranslator, intlLocale } from "@/i18n";
import { formatDay, formatDuration, formatTime } from "./format";

const today = "2026-11-11";
describe("format", () => {
  const en = createTranslator("en");
  const ar = createTranslator("ar");
  it("formats days relatively", () => {
    expect(formatDay("2026-11-11", today, "en-US", en)).toBe("Today");
    expect(formatDay("2026-11-12", today, "en-US", en)).toBe("Tomorrow");
    expect(formatDay("2026-11-10", today, "en-US", en)).toBe("Yesterday");
    expect(formatDay("2026-11-14", today, "en-US", en)).toBe("Saturday");
    expect(formatDay("2026-12-25", today, "en-US", en)).toBe("Dec 25");
    expect(formatDay("2027-01-05", today, "en-US", en)).toBe("Jan 5, 2027");
    expect(formatDay("2026-11-12", today, intlLocale("ar"), ar)).toBe("غدًا");
  });
  it("formats times in the locale, using Western digits for Arabic", () => {
    expect(formatTime("17:30", "en-US")).toMatch(/5:30\s?PM/);
    expect(formatTime("17:30", intlLocale("ar"))).toMatch(/5:30/);
  });
  it("formats durations", () => {
    expect(formatDuration(25 * 60_000, "en")).toBe("25m");
    expect(formatDuration(90 * 60_000, "en")).toBe("1 h 30 m");
    expect(formatDuration(120 * 60_000, "en")).toBe("2 h");
    expect(formatDuration(45 * 60_000, "ar")).toBe("45 د");
  });
});

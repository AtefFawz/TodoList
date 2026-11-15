import { describe, expect, it } from "vitest";
import { elapsedFocusMs, formatClock, idleFocus, pause, remainingMs, reset, resume, skip, start, tick } from "./focus";

const D = { focusMs: 25 * 60_000, breakMs: 5 * 60_000 };

describe("focus timer", () => {
  it("starts idle with the full duration", () => {
    expect(idleFocus(D)).toMatchObject({ mode: "focus", status: "idle", remainingMs: D.focusMs });
  });
  it("counts down from an absolute end time", () => {
    const s = start(idleFocus(D), 1000, "t1");
    expect(s).toMatchObject({ status: "running", endsAt: 1000 + D.focusMs, taskId: "t1" });
    expect(remainingMs(s, 1000 + 60_000)).toBe(D.focusMs - 60_000);
    expect(remainingMs(s, 10 ** 12)).toBe(0);
  });
  it("pause freezes the remaining time and resume continues from it", () => {
    let s = start(idleFocus(D), 0);
    s = pause(s, 10 * 60_000);
    expect(s).toMatchObject({ status: "paused", endsAt: null, remainingMs: 15 * 60_000 });
    expect(remainingMs(s, 99 * 60_000)).toBe(15 * 60_000);
    s = resume(s, 100 * 60_000);
    expect(s.endsAt).toBe(100 * 60_000 + 15 * 60_000);
  });
  it("start and pause are idempotent", () => {
    const running = start(idleFocus(D), 0);
    expect(start(running, 5)).toBe(running);
    expect(pause(idleFocus(D), 0)).toEqual(idleFocus(D));
    expect(resume(idleFocus(D), 0)).toEqual(idleFocus(D));
  });
  it("finishing a focus session credits its full length and moves to a break", () => {
    const s = start(idleFocus(D, "focus", "t1"), 0);
    expect(tick(s, D.focusMs - 1, D).finished).toBeNull();
    const done = tick(s, D.focusMs, D);
    expect(done.finished).toEqual({ mode: "focus", ms: D.focusMs });
    expect(done.state).toMatchObject({ mode: "break", status: "idle", remainingMs: D.breakMs, taskId: "t1" });
  });
  it("finishing a break returns to focus", () => {
    const s = start(idleFocus(D, "break"), 0);
    const done = tick(s, D.breakMs, D);
    expect(done.finished?.mode).toBe("break");
    expect(done.state.mode).toBe("focus");
  });
  it("catches up after a long sleep", () => {
    const s = start(idleFocus(D), 0);
    expect(tick(s, 8 * 3_600_000, D).finished).not.toBeNull();
  });
  it("reports elapsed focus time for partial sessions, never for breaks", () => {
    const s = start(idleFocus(D), 0);
    expect(elapsedFocusMs(s, 5 * 60_000, D)).toBe(5 * 60_000);
    expect(elapsedFocusMs(start(idleFocus(D, "break"), 0), 60_000, D)).toBe(0);
  });
  it("reset keeps the mode; skip flips it", () => {
    const s = pause(start(idleFocus(D), 0), 1000);
    expect(reset(s, D)).toMatchObject({ mode: "focus", status: "idle", remainingMs: D.focusMs });
    expect(skip(s, D)).toMatchObject({ mode: "break", status: "idle", remainingMs: D.breakMs });
  });
  it("formats the clock", () => {
    expect(formatClock(25 * 60_000)).toBe("25:00");
    expect(formatClock(61_000)).toBe("01:01");
    expect(formatClock(100)).toBe("00:01"); // never shows 00:00 while still running
    expect(formatClock(0)).toBe("00:00");
  });
});

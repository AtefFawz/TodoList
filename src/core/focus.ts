/**
 * Pomodoro state machine. Pure: time is passed in, and a running timer stores its absolute end time,
 * so it stays correct across tab throttling, refreshes and sleeping laptops.
 */
export type FocusMode = "focus" | "break";
export type FocusStatus = "idle" | "running" | "paused";

export interface FocusState {
  mode: FocusMode;
  status: FocusStatus;
  /** Epoch ms when a running timer finishes. */
  endsAt: number | null;
  /** Time left when idle or paused. */
  remainingMs: number;
  taskId: string | null;
}

export interface Durations {
  focusMs: number;
  breakMs: number;
}

const durationOf = (mode: FocusMode, d: Durations) => (mode === "focus" ? d.focusMs : d.breakMs);

export const idleFocus = (d: Durations, mode: FocusMode = "focus", taskId: string | null = null): FocusState => ({
  mode,
  status: "idle",
  endsAt: null,
  remainingMs: durationOf(mode, d),
  taskId,
});

export const remainingMs = (s: FocusState, now: number): number =>
  s.status === "running" && s.endsAt !== null ? Math.max(0, s.endsAt - now) : s.remainingMs;

export const start = (s: FocusState, now: number, taskId: string | null = s.taskId): FocusState =>
  s.status === "running" ? s : { ...s, taskId, status: "running", endsAt: now + s.remainingMs };

export const pause = (s: FocusState, now: number): FocusState =>
  s.status === "running" ? { ...s, status: "paused", endsAt: null, remainingMs: remainingMs(s, now) } : s;

export const resume = (s: FocusState, now: number): FocusState => (s.status === "paused" ? start(s, now) : s);

/** How much of the current focus session actually elapsed (zero for breaks). */
export const elapsedFocusMs = (s: FocusState, now: number, d: Durations): number =>
  s.mode === "focus" ? Math.max(0, d.focusMs - remainingMs(s, now)) : 0;

export const reset = (s: FocusState, d: Durations): FocusState => idleFocus(d, s.mode, s.taskId);

/** Jump to the other mode without running it. */
export const skip = (s: FocusState, d: Durations): FocusState => idleFocus(d, s.mode === "focus" ? "break" : "focus", s.taskId);

export interface TickResult {
  state: FocusState;
  /** Set when a session just finished. */
  finished: { mode: FocusMode; ms: number } | null;
}

export function tick(s: FocusState, now: number, d: Durations): TickResult {
  if (s.status !== "running" || s.endsAt === null || now < s.endsAt) return { state: s, finished: null };
  return { state: idleFocus(d, s.mode === "focus" ? "break" : "focus", s.taskId), finished: { mode: s.mode, ms: durationOf(s.mode, d) } };
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

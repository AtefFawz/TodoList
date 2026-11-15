import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { z } from "zod";
import {
  elapsedFocusMs,
  idleFocus,
  pause,
  remainingMs,
  reset,
  resume,
  skip,
  start,
  tick,
  type Durations,
  type FocusState,
} from "@/core/focus";
import { createPersistedStore, type Store } from "@/state/store";

const schema = z.object({
  mode: z.enum(["focus", "break"]),
  status: z.enum(["idle", "running", "paused"]),
  endsAt: z.number().nullable(),
  remainingMs: z.number().nonnegative(),
  taskId: z.string().nullable(),
});

const DEFAULTS: Durations = { focusMs: 25 * 60_000, breakMs: 5 * 60_000 };

let shared: Store<FocusState> | null = null;
/** One timer per browser profile, persisted so a refresh or a closed tab does not lose the session. */
function focusStore(): Store<FocusState> {
  shared ??= createPersistedStore({ key: "nawa:focus", schema, defaults: () => idleFocus(DEFAULTS) });
  return shared;
}

export interface FocusTimer {
  state: FocusState;
  remaining: number;
  durations: Durations;
  start(taskId?: string | null): void;
  pause(): void;
  resume(): void;
  reset(): void;
  skip(): void;
  selectTask(taskId: string | null): void;
}

interface Options {
  focusMinutes: number;
  breakMinutes: number;
  now: number;
  /** Called with the focus milliseconds to credit (a finished session, or the elapsed part of an abandoned one). */
  onFocus(taskId: string | null, ms: number): void;
  onFinished(mode: "focus" | "break", taskId: string | null): void;
}

export function useFocusTimer({ focusMinutes, breakMinutes, now, onFocus, onFinished }: Options): FocusTimer {
  const store = focusStore();
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const durations = useMemo<Durations>(
    () => ({ focusMs: focusMinutes * 60_000, breakMs: breakMinutes * 60_000 }),
    [focusMinutes, breakMinutes],
  );

  // Keep latest callbacks without re-subscribing.
  const callbacks = useRef({ onFocus, onFinished });
  useEffect(() => {
    callbacks.current = { onFocus, onFinished };
  });

  // Finish sessions. `now` ticks while the timer is mounted; the check is cheap and idempotent.
  useEffect(() => {
    const current = store.get();
    const result = tick(current, Date.now(), durations);
    if (!result.finished) return;
    store.set(result.state);
    if (result.finished.mode === "focus") callbacks.current.onFocus(current.taskId, result.finished.ms);
    callbacks.current.onFinished(result.finished.mode, current.taskId);
  }, [now, durations, store]);

  const abandon = useCallback(
    (next: (s: FocusState) => FocusState) => {
      const current = store.get();
      const elapsed = elapsedFocusMs(current, Date.now(), durations);
      if (elapsed >= 60_000) callbacks.current.onFocus(current.taskId, elapsed); // ignore accidental sub-minute starts
      store.set(next(current));
    },
    [store, durations],
  );

  return {
    state,
    remaining: remainingMs(state, now),
    durations,
    start: (taskId) =>
      store.set((s) =>
        start(s.status === "idle" ? idleFocus(durations, s.mode, s.taskId) : s, Date.now(), taskId === undefined ? s.taskId : taskId),
      ),
    pause: () => store.set((s) => pause(s, Date.now())),
    resume: () => store.set((s) => resume(s, Date.now())),
    reset: () => abandon((s) => reset(s, durations)),
    skip: () => abandon((s) => skip(s, durations)),
    selectTask: (taskId) => store.set((s) => ({ ...s, taskId })),
  };
}

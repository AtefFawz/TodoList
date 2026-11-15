import { useEffect, useState } from "react";
import { toDayKey, type DayKey } from "@/core/dates";

export interface Clock {
  now: number;
  today: DayKey;
}

/** The current time, refreshed every `intervalMs`, so "today" rolls over at midnight without a reload. */
export function useNow(intervalMs = 30_000): Clock {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    const onVisible = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return { now, today: toDayKey(new Date(now)) };
}

import { createContext, useContext } from "react";
import type { Clock } from "@/hooks/use-now";

const ClockContext = createContext<Clock | null>(null);
export const ClockProvider = ClockContext.Provider;
export function useClock(): Clock {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error("useClock must be used inside <ClockProvider>");
  return clock;
}

/** Called when the last task due today is completed. */
const CelebrateContext = createContext<() => void>(() => undefined);
export const CelebrateProvider = CelebrateContext.Provider;
export const useCelebrate = () => useContext(CelebrateContext);

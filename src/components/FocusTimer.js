import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

const SESSION_SECONDS = 25 * 60;
const TIMER_STORAGE_KEY = "nawa.focus.timer.v1";

function readTimerState() {
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw)
      return {
        endAt: null,
        remainingSeconds: SESSION_SECONDS,
        completedSessions: 0,
        lastCompletedAt: null,
      };
    const stored = JSON.parse(raw);
    const parsedEndAt =
      typeof stored.endAt === "string" &&
      Number.isFinite(Date.parse(stored.endAt))
        ? new Date(stored.endAt).toISOString()
        : null;
    const remaining = Number.isFinite(stored.remainingSeconds)
      ? Math.max(
          0,
          Math.min(SESSION_SECONDS, Math.floor(stored.remainingSeconds)),
        )
      : SESSION_SECONDS;
    const completed = Number.isFinite(stored.completedSessions)
      ? Math.max(0, Math.floor(stored.completedSessions))
      : 0;
    const lastCompletedAt =
      typeof stored.lastCompletedAt === "string" &&
      Number.isFinite(Date.parse(stored.lastCompletedAt))
        ? new Date(stored.lastCompletedAt).toISOString()
        : null;
    return {
      endAt: parsedEndAt,
      remainingSeconds: remaining,
      completedSessions: completed,
      lastCompletedAt,
    };
  } catch {
    return {
      endAt: null,
      remainingSeconds: SESSION_SECONDS,
      completedSessions: 0,
      lastCompletedAt: null,
    };
  }
}

export default function FocusTimer({ onComplete }) {
  const [timerState, setTimerState] = useState(readTimerState);
  const [now, setNow] = useState(Date.now);
  const lastCompletionRef = useRef(timerState.lastCompletedAt);

  const seconds = useMemo(() => {
    if (!timerState.endAt) return timerState.remainingSeconds;
    return Math.max(0, Math.ceil((Date.parse(timerState.endAt) - now) / 1000));
  }, [timerState.endAt, timerState.remainingSeconds, now]);

  const running = Boolean(timerState.endAt) && seconds > 0;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify(timerState),
      );
    } catch (error) {
      console.warn("تعذّر حفظ جلسة التركيز:", error);
    }
  }, [timerState]);

  useEffect(() => {
    if (!timerState.endAt) return undefined;
    const updateClock = () => setNow(Date.now());
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    window.addEventListener("focus", updateClock);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", updateClock);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, [timerState.endAt]);

  useEffect(() => {
    if (!timerState.endAt || now < Date.parse(timerState.endAt)) return;
    const completionAt = new Date(now).toISOString();
    setTimerState((current) => {
      if (!current.endAt || Date.parse(current.endAt) > now) return current;
      return {
        ...current,
        endAt: null,
        remainingSeconds: SESSION_SECONDS,
        completedSessions: current.completedSessions + 1,
        lastCompletedAt: completionAt,
      };
    });
  }, [timerState.endAt, now]);

  useEffect(() => {
    if (
      !timerState.lastCompletedAt ||
      timerState.lastCompletedAt === lastCompletionRef.current
    )
      return;
    lastCompletionRef.current = timerState.lastCompletedAt;
    onComplete?.();
  }, [timerState.lastCompletedAt, onComplete]);

  const toggleTimer = () => {
    if (timerState.endAt) {
      const remaining = Math.max(
        0,
        Math.ceil((Date.parse(timerState.endAt) - Date.now()) / 1000),
      );
      if (remaining === 0) {
        setNow(Date.now());
        return;
      }
      setTimerState((current) => ({
        ...current,
        endAt: null,
        remainingSeconds: remaining,
      }));
      return;
    }

    const remaining =
      timerState.remainingSeconds > 0
        ? timerState.remainingSeconds
        : SESSION_SECONDS;
    const startedAt = Date.now();
    setNow(startedAt);
    setTimerState((current) => ({
      ...current,
      endAt: new Date(startedAt + remaining * 1000).toISOString(),
    }));
  };

  const resetTimer = () => {
    setTimerState((current) => ({
      ...current,
      endAt: null,
      remainingSeconds: SESSION_SECONDS,
    }));
    setNow(Date.now());
  };

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  const progress = ((SESSION_SECONDS - seconds) / SESSION_SECONDS) * 100;

  return (
    <section className="widget focus-widget">
      <div className="widget-heading">
        <div>
          <span className="eyebrow">مساحة هادئة</span>
          <h3>جلسة تركيز</h3>
        </div>
        <span className="widget-icon">
          <Icon name="spark" size={18} />
        </span>
      </div>
      <div
        className="timer-face"
        style={{ "--timer-progress": `${progress}%` }}
      >
        <div className="timer-inner">
          <strong>
            {minutes}:{remainingSeconds}
          </strong>
          <span>{running ? "أنت في قمة تركيزك" : "جاهز للبدء؟"}</span>
        </div>
      </div>
      <div className="timer-controls">
        <button
          className="timer-main-button"
          onClick={toggleTimer}
          aria-label={running ? "إيقاف مؤقت" : "بدء التركيز"}
        >
          <Icon name={running ? "pause" : "play"} size={17} />
          {running ? "إيقاف مؤقت" : "ابدأ التركيز"}
        </button>
        <button
          className="timer-reset"
          onClick={resetTimer}
          aria-label="إعادة ضبط المؤقت"
        >
          <Icon name="reset" size={17} />
        </button>
      </div>
      <div className="session-note">
        <span className="session-dots">
          {Array.from({ length: 4 }, (_, index) => (
            <i
              key={index}
              className={
                index < completedSessionsModulo(timerState.completedSessions)
                  ? "session-done"
                  : ""
              }
            />
          ))}
        </span>
        <span>{timerState.completedSessions} جلسات مكتملة</span>
      </div>
    </section>
  );
}

function completedSessionsModulo(count) {
  return count % 5;
}

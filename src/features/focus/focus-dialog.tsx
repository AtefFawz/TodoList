import { Coffee, Pause, Play, RotateCcw, SkipForward, Target, X } from "lucide-react";
import { useId } from "react";
import { formatClock } from "@/core/focus";
import type { Task } from "@/core/model";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import type { FocusTimer } from "@/hooks/use-focus-timer";
import { useI18n } from "@/i18n";

interface Props {
  open: boolean;
  onClose(): void;
  timer: FocusTimer;
  tasks: readonly Task[];
}

const R = 88;
const C = 2 * Math.PI * R;

export function FocusDialog({ open, onClose, timer, tasks }: Props) {
  const { t } = useI18n();
  const selectId = useId();
  const { state, remaining, durations } = timer;
  const total = state.mode === "focus" ? durations.focusMs : durations.breakMs;
  const progress = total === 0 ? 0 : 1 - remaining / total;
  const running = state.status === "running";
  const paused = state.status === "paused";
  const BreakIcon = state.mode === "break" ? Coffee : Target;

  return (
    <Modal open={open} onClose={onClose} label={t("focusTitle")} variant="center">
      <div className="panel focus" data-mode={state.mode}>
        <header className="panel__header">
          <h2>
            <BreakIcon aria-hidden="true" /> {t(state.mode === "focus" ? "focusSession" : "focusBreak")}
          </h2>
          <Button variant="ghost" size="icon" aria-label={t("close")} onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="focus__dial">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r={R} className="focus__track" />
            <circle
              cx="100"
              cy="100"
              r={R}
              className="focus__arc"
              strokeDasharray={`${C * progress} ${C}`}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="focus__time" role="timer" aria-live="off" aria-label={t("focusRemaining", { time: formatClock(remaining) })}>
            {formatClock(remaining)}
          </div>
        </div>

        {state.mode === "focus" && (
          <div className="field">
            <label htmlFor={selectId}>{t("focusTask")}</label>
            <select id={selectId} className="input" value={state.taskId ?? ""} onChange={(e) => timer.selectTask(e.target.value || null)}>
              <option value="">{t("focusNoTask")}</option>
              {tasks.slice(0, 200).map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="focus__controls">
          {running ? (
            <Button variant="solid" size="md" onClick={timer.pause}>
              <Pause aria-hidden="true" /> {t("focusPause")}
            </Button>
          ) : (
            <Button variant="solid" size="md" onClick={() => (paused ? timer.resume() : timer.start())}>
              <Play aria-hidden="true" /> {t(paused ? "focusResume" : "focusStart")}
            </Button>
          )}
          <Button variant="glass" size="md" onClick={timer.reset}>
            <RotateCcw aria-hidden="true" /> {t("focusReset")}
          </Button>
          <Button variant="glass" size="md" onClick={timer.skip}>
            <SkipForward aria-hidden="true" /> {t("focusSkip")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

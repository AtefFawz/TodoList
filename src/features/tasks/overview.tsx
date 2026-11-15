import { AlertTriangle, BellRing, CheckCheck, ListTodo, Sparkles } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useClock } from "@/app/contexts";
import { reminderTime } from "@/core/reminders";
import { isOverdue } from "@/core/selectors";
import { useI18n } from "@/i18n";
import { useData } from "@/state/context";

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "accent" | "success" | "danger" | "warn";
}) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value.toLocaleString()}</span>
    </div>
  );
}

/** The friendly dashboard strip above the task list: greeting, today's progress and four numbers that matter. */
export function Overview() {
  const { t } = useI18n();
  const { now, today } = useClock();
  const tasks = useData((d) => d.tasks);
  const history = useData((d) => d.history);

  const figures = useMemo(() => {
    const open = tasks.filter((x) => !x.done);
    const dueToday = open.filter((x) => x.due === today).length;
    const doneToday = history[today] ?? 0;
    return {
      open: open.length,
      overdue: open.filter((x) => isOverdue(x, now)).length,
      reminders: open.filter((x) => (reminderTime(x) ?? 0) > now).length,
      doneToday,
      planned: dueToday + doneToday,
      percent: dueToday + doneToday === 0 ? 0 : Math.round((doneToday / (dueToday + doneToday)) * 100),
    };
  }, [tasks, history, today, now]);

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? t("greetMorning") : hour < 18 ? t("greetAfternoon") : t("greetEvening");

  return (
    <section className="overview" aria-label={t("overviewProgress")}>
      <div className="overview__hero">
        <div className="overview__text">
          <p className="overview__eyebrow">
            <Sparkles aria-hidden="true" /> {t("overviewTagline")}
          </p>
          <h2 className="overview__greeting">{greeting}</h2>
          <p className="overview__body">
            {figures.planned === 0
              ? t("overviewProgressEmpty")
              : t("overviewProgressBody", { done: figures.doneToday, total: figures.planned })}
          </p>
        </div>
        <div className="overview__meter" role="img" aria-label={`${t("overviewProgress")}: ${figures.percent}%`}>
          <strong>{figures.percent.toLocaleString()}%</strong>
          <span className="overview__track" aria-hidden="true">
            <i style={{ width: `${figures.percent}%` }} />
          </span>
        </div>
      </div>
      <div className="overview__stats">
        <Stat icon={<ListTodo />} label={t("statOpen")} value={figures.open} tone="accent" />
        <Stat icon={<CheckCheck />} label={t("statDoneToday")} value={figures.doneToday} tone="success" />
        <Stat icon={<AlertTriangle />} label={t("statOverdue")} value={figures.overdue} tone="danger" />
        <Stat icon={<BellRing />} label={t("statReminders")} value={figures.reminders} tone="warn" />
      </div>
    </section>
  );
}

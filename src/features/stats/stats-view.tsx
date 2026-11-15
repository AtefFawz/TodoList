import { CheckCheck, Clock, Flame, ListTodo, TrendingUp, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { computeStats } from "@/core/stats";
import { useClock } from "@/app/contexts";
import { formatDuration, formatShortWeekday } from "@/lib/format";
import { useI18n } from "@/i18n";
import { useData } from "@/state/context";

function Ring({ value, total, label }: { value: number; total: number; label: string }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const share = total === 0 ? 0 : Math.min(1, value / total);
  return (
    <svg className="ring" viewBox="0 0 104 104" role="img" aria-label={label}>
      <circle cx="52" cy="52" r={R} className="ring__track" />
      <circle cx="52" cy="52" r={R} className="ring__value" strokeDasharray={`${C * share} ${C}`} transform="rotate(-90 52 52)" />
      <text x="52" y="58" textAnchor="middle" className="ring__text">
        {value}
      </text>
    </svg>
  );
}

export function StatsView() {
  const { t, language, locale } = useI18n();
  const { today } = useClock();
  const data = useData((d) => d);
  const stats = useMemo(() => computeStats(data, today), [data, today]);
  const max = Math.max(1, ...stats.week.map((d) => d.count));
  const priorityMax = Math.max(1, ...stats.openByPriority);
  const dueToday = data.tasks.filter((x) => !x.done && x.due !== null && x.due <= today).length;

  return (
    <div className="stats">
      <div className="stats__grid">
        <section className="card card--hero">
          <Ring value={stats.doneToday} total={stats.doneToday + dueToday} label={`${t("statToday")}: ${stats.doneToday}`} />
          <div>
            <h2 className="card__label">{t("statToday")}</h2>
            <p className="card__big">{stats.doneToday}</p>
            <p className="muted">{t.plural("openCount", dueToday)}</p>
          </div>
        </section>

        <section className="card">
          <h2 className="card__label">
            <Flame aria-hidden="true" /> {t("statStreak")}
          </h2>
          <p className="card__big">{stats.streak}</p>
          <p className="muted">{stats.streak === 0 ? t("statStreakBody_zero") : t("statStreakBody_other", { best: stats.bestStreak })}</p>
        </section>

        <section className="card">
          <h2 className="card__label">
            <Clock aria-hidden="true" /> {t("statFocusToday")}
          </h2>
          <p className="card__big">{formatDuration(stats.focusMsToday, language)}</p>
          <p className="muted">
            {t("statFocusTotal")}: {formatDuration(stats.focusMsTotal, language)}
          </p>
        </section>

        <section className="card card--wide">
          <h2 className="card__label">
            <TrendingUp aria-hidden="true" /> {t("statWeek")}
          </h2>
          <p className="muted">{t.plural("statWeekTotal", stats.weekTotal)}</p>
          <ul className="bars" aria-label={t("chartLabel")}>
            {stats.week.map((d) => (
              <li key={d.day} className={d.day === today ? "bar is-today" : "bar"}>
                <span className="bar__value">{d.count}</span>
                <span className="bar__fill" style={{ height: `${Math.max(d.count === 0 ? 4 : 10, (d.count / max) * 100)}%` }} />
                <span className="bar__label">{formatShortWeekday(d.day, locale)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="card__label">
            <CheckCheck aria-hidden="true" /> {t("statTotal")}
          </h2>
          <p className="card__big">{stats.totalCompleted}</p>
          <p className="muted">
            {t("statAverage")}: {stats.dailyAverage.toFixed(1)}
          </p>
        </section>

        <section className="card">
          <h2 className="card__label">
            <ListTodo aria-hidden="true" /> {t("statOpen")}
          </h2>
          <p className="card__big">{stats.open}</p>
          <p className={stats.overdue > 0 ? "danger" : "muted"}>
            {stats.overdue > 0 && <TriangleAlert aria-hidden="true" className="inline-icon" />} {t("statOverdue")}: {stats.overdue}
          </p>
        </section>

        <section className="card card--wide">
          <h2 className="card__label">{t("statPriority")}</h2>
          <ul className="hbars">
            {([3, 2, 1, 0] as const).map((p) => (
              <li key={p} data-priority={p}>
                <span className="hbars__label">{t(`priority${p}`)}</span>
                <span className="hbars__track">
                  <i style={{ width: `${(stats.openByPriority[p] / priorityMax) * 100}%` }} />
                </span>
                <span className="hbars__value">{stats.openByPriority[p]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

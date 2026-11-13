import Icon from "./Icon";
import { localDateString } from "../utils/taskUtils";

export default function WeeklyActivity({ tasks }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const count = tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return Number.isFinite(completedDate.getTime()) && localDateString(completedDate) === key;
    }).length;
    return { label: new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(date), count, today: index === 6 };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <section className="widget activity-widget">
      <div className="widget-heading"><div><span className="eyebrow">تقدّمك</span><h3>نشاط الأسبوع</h3></div><span className="widget-icon"><Icon name="calendar" size={18} /></span></div>
      <div className="activity-chart" aria-label="عدد المهام المكتملة خلال آخر سبعة أيام">
        {days.map((day) => <div className="activity-day" key={day.label}><span className="activity-count">{day.count || ""}</span><div className="activity-track"><i style={{ height: `${Math.max(day.count ? 12 : 5, (day.count / max) * 100)}%` }} /></div><span className={day.today ? "activity-today" : ""}>{day.label}</span></div>)}
      </div>
      <p className="activity-caption">كل إنجاز، مهما كان صغيرًا، يستحق التقدير.</p>
    </section>
  );
}

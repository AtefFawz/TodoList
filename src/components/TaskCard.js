import Icon from "./Icon";
import { formatDueDate, formatReminderCompact, formatReminderDate, getCategoryColor, localDateString } from "../utils/taskUtils";

const priorityLabels = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

export default function TaskCard({ task, onToggle, onEdit, onDelete, onDuplicate }) {
  const overdue = !task.completed && task.dueDate && task.dueDate < localDateString();
  return (
    <article className={`task-card ${task.completed ? "task-completed" : ""}`}>
      <button className={`task-check ${task.completed ? "is-checked" : ""}`} onClick={() => onToggle(task.id)} aria-label={task.completed ? "إعادة فتح المهمة" : "تحديد المهمة كمكتملة"}>
        {task.completed && <Icon name="check" size={15} strokeWidth={2.7} />}
      </button>
      <div className="task-content">
        <div className="task-title-line">
          <h3>{task.title}</h3>
          <span className={`priority-dot priority-${task.priority}`} title={`أولوية ${priorityLabels[task.priority]}`} />
        </div>
        {task.description && <p className="task-description">{task.description}</p>}
        <div className="task-meta">
          <span className="task-category"><i style={{ "--category-color": getCategoryColor(task.category) }} />{task.category}</span>
          <span className={`task-due ${overdue ? "due-overdue" : ""}`}><Icon name="calendar" size={13} />{formatDueDate(task.dueDate, task.completed)}</span>
          {task.reminderAt && !task.completed && <span className="task-reminder-meta" title={formatReminderDate(task.reminderAt)}><Icon name="bell" size={13} />{formatReminderCompact(task.reminderAt)}</span>}
          <span className={`priority-label priority-text-${task.priority}`}>{priorityLabels[task.priority]}</span>
        </div>
      </div>
      <div className="task-actions">
        <button className="task-action" onClick={() => onDuplicate(task.id)} aria-label="نسخ المهمة" title="نسخ"><Icon name="copy" size={16} /></button>
        <button className="task-action" onClick={() => onEdit(task)} aria-label="تعديل المهمة" title="تعديل"><Icon name="edit" size={16} /></button>
        <button className="task-action task-delete" onClick={() => onDelete(task)} aria-label="حذف المهمة" title="حذف"><Icon name="trash" size={16} /></button>
      </div>
    </article>
  );
}

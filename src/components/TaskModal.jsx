import { useEffect, useState } from "react";
import Icon from "./Icon";
import { PRIORITIES } from "../data/categories";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "../utils/taskUtils";

const emptyForm = {
  title: "",
  description: "",
  priority: "medium",
  category: "شخصي",
  dueDate: "",
  reminderAt: "",
};

export default function TaskModal({ open, onClose, onSave, task, categories }) {
  const [form, setForm] = useState(emptyForm);
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(
      task
        ? {
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            dueDate: task.dueDate,
            reminderAt: toDateTimeLocalValue(task.reminderAt),
          }
        : emptyForm,
    );
    setCustomCategory("");
  }, [open, task]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    onSave({
      ...form,
      title,
      reminderAt: fromDateTimeLocalValue(form.reminderAt),
      category: customCategory.trim() || form.category,
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        dir="rtl"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {task ? "تحديث التفاصيل" : "ابدأ خطوة جديدة"}
            </span>
            <h2 id="task-modal-title">
              {task ? "تعديل المهمة" : "مهمة جديدة"}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="field-label" htmlFor="task-title">
            عنوان المهمة <span>*</span>
          </label>
          <input
            id="task-title"
            className="form-input title-input"
            autoFocus
            maxLength={120}
            placeholder="مثال: إنهاء تصميم الصفحة الرئيسية"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            required
          />

          <label className="field-label" htmlFor="task-description">
            وصف أو ملاحظات <small>اختياري</small>
          </label>
          <textarea
            id="task-description"
            className="form-input form-textarea"
            rows={3}
            maxLength={1000}
            placeholder="أضف تفاصيل تساعدك على تنفيذ المهمة..."
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />

          <div className="form-grid">
            <div>
              <label className="field-label" htmlFor="task-priority">
                الأولوية
              </label>
              <select
                id="task-priority"
                className="form-input"
                value={form.priority}
                onChange={(event) => update("priority", event.target.value)}
              >
                {PRIORITIES.map((priority) => (
                  <option value={priority.id} key={priority.id}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="task-category">
                التصنيف
              </label>
              <select
                id="task-category"
                className="form-input"
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
              >
                {categories.map((category) => (
                  <option value={category.label} key={category.label}>
                    {category.label}
                  </option>
                ))}
                {!categories.some(
                  (category) => category.label === form.category,
                ) && <option value={form.category}>{form.category}</option>}
              </select>
            </div>
          </div>
          <div className="custom-category-wrap">
            <label className="field-label" htmlFor="custom-category">
              أو أضف تصنيفًا جديدًا
            </label>
            <input
              id="custom-category"
              className="form-input"
              maxLength={32}
              placeholder="اسم التصنيف الجديد"
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
            />
          </div>
          <div className="form-grid form-dates-grid">
            <div>
              <label className="field-label" htmlFor="task-date">
                موعد الإنجاز
              </label>
              <input
                id="task-date"
                className="form-input date-input"
                type="date"
                value={form.dueDate}
                onChange={(event) => update("dueDate", event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="task-reminder">
                تاريخ ووقت التنبيه
              </label>
              <input
                id="task-reminder"
                className="form-input date-input"
                type="datetime-local"
                value={form.reminderAt}
                onChange={(event) => update("reminderAt", event.target.value)}
              />
            </div>
          </div>
          <p className="reminder-hint">
            <Icon name="bell" size={14} /> سيظهر تنبيه في الوقت المحدد، ويمكن
            إظهار إشعار على الجهاز بعد السماح به من المتصفح.
          </p>

          <div className="modal-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={!form.title.trim()}
            >
              <Icon name={task ? "check" : "plus"} size={18} />
              {task ? "حفظ التعديلات" : "إضافة المهمة"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

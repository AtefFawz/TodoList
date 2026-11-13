import Icon from "./Icon";
import { formatReminderDate } from "../utils/taskUtils";

export default function NotificationCenter({
  open,
  onClose,
  notifications,
  unreadCount,
  permission,
  onRequestPermission,
  onMarkAllRead,
  onMarkRead,
  onDismiss,
  onOpenTask,
  onSnooze,
}) {
  if (!open) return null;

  const permissionCopy = permission === "granted"
    ? "إشعارات الجهاز مفعّلة. ستظهر التنبيهات أثناء استخدام التطبيق."
    : permission === "denied"
      ? "تم حظر الإشعارات من المتصفح. افتح إعدادات الموقع واسمح بها يدويًا."
      : permission === "unsupported"
        ? "المتصفح الحالي لا يدعم إشعارات الجهاز. سيظل سجل التنبيهات داخل التطبيق متاحًا."
        : "فعّل إشعارات الجهاز لتصلك التذكيرات خارج نافذة التطبيق أثناء تشغيله.";

  return (
    <>
      <button className="panel-dismiss-layer" onClick={onClose} aria-label="إغلاق التنبيهات" />
      <section className="notification-center" aria-label="مركز التنبيهات" dir="rtl">
        <div className="notification-center-head">
          <div>
            <span className="eyebrow">ابقَ على اطلاع</span>
            <h2>التنبيهات <span>{unreadCount > 0 ? unreadCount : ""}</span></h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button>
        </div>

        {permission !== "granted" && (
          <div className="notification-permission">
            <div className="permission-icon"><Icon name="bell" size={19} /></div>
            <div className="permission-copy"><strong>إشعارات الجهاز</strong><p>{permissionCopy}</p></div>
            {permission === "default" && <button className="button button-primary" onClick={onRequestPermission}>تفعيل</button>}
          </div>
        )}

        <div className="notification-list-heading">
          <strong>آخر التنبيهات</strong>
          {unreadCount > 0 && <button onClick={onMarkAllRead}>تحديد الكل كمقروء</button>}
        </div>

        <div className="notification-list">
          {notifications.length ? notifications.map((item) => (
            <article className={`notification-item ${item.read ? "is-read" : "is-unread"}`} key={item.id}>
              <span className="notification-item-icon"><Icon name={item.type === "reminder" ? "bell" : "check"} size={17} /></span>
              <button className="notification-item-main" onClick={() => { onMarkRead(item.id); onOpenTask(item.taskId); }}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <small>{formatReminderDate(item.createdAt)}</small>
              </button>
              <div className="notification-item-actions">
                {!item.read && <span className="unread-indicator" />}
                <button className="task-action" onClick={() => onDismiss(item.id)} aria-label="إزالة التنبيه"><Icon name="close" size={14} /></button>
                {item.type === "reminder" && <button className="task-action" onClick={() => onSnooze(item)} aria-label="تأجيل التذكير عشر دقائق" title="تأجيل 10 دقائق"><Icon name="clock" size={15} /></button>}
              </div>
            </article>
          )) : (
            <div className="notifications-empty"><div><Icon name="bell" size={25} /></div><strong>لا توجد تنبيهات حتى الآن</strong><p>أضف تذكيرًا إلى أي مهمة وسيظهر هنا وقت استحقاقه.</p></div>
          )}
        </div>
        {notifications.length > 0 && <button className="notification-clear" onClick={onMarkAllRead}>وضع الكل كمقروء</button>}
      </section>
    </>
  );
}

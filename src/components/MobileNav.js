import Icon from "./Icon";

const items = [
  { id: "today", label: "اليوم", icon: "calendar" },
  { id: "all", label: "مهامي", icon: "grid" },
  { id: "add", label: "إضافة", icon: "plus" },
  { id: "notifications", label: "التنبيهات", icon: "bell" },
];

export default function MobileNav({ view, onNavigate, onAdd, onNotifications, unreadCount }) {
  return (
    <nav className="mobile-nav" aria-label="التنقل السريع">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`mobile-nav-item ${item.id === view ? "active" : ""} ${item.id === "add" ? "mobile-nav-add" : ""}`}
          onClick={() => item.id === "add" ? onAdd() : item.id === "notifications" ? onNotifications() : onNavigate(item.id)}
          aria-label={item.label}
        >
          <span className="mobile-nav-icon"><Icon name={item.icon} size={20} />{item.id === "notifications" && unreadCount > 0 && <i>{unreadCount > 9 ? "9+" : unreadCount}</i>}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

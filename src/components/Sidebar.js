import Icon from "./Icon";

const navigation = [
  { id: "all", label: "كل المهام", icon: "grid", countKey: "total" },
  { id: "today", label: "مهام اليوم", icon: "calendar", countKey: "dueToday" },
  { id: "upcoming", label: "القادمة", icon: "clock" },
  { id: "overdue", label: "متأخرة", icon: "alert", countKey: "overdue", alert: true },
  { id: "completed", label: "مكتملة", icon: "check", countKey: "completed" },
];

export default function Sidebar({
  view,
  onNavigate,
  stats,
  categories,
  selectedCategory,
  onSelectCategory,
  onAdd,
  onExport,
  onImport,
  onSettings,
  mobileOpen,
  onClose,
}) {
  const runSidebarAction = (action) => {
    if (typeof action === "function") action();
    onClose?.();
  };

  return (
    <>
      {mobileOpen && <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="إغلاق القائمة" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="check" size={22} strokeWidth={2.6} /></div>
          <div>
            <div className="brand-name">نَواة<span>.</span></div>
            <div className="brand-caption">مساحة إنجازك اليومية</div>
          </div>
          <button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="إغلاق القائمة"><Icon name="close" /></button>
        </div>

        <button type="button" className="sidebar-add" onClick={() => runSidebarAction(onAdd)}>
          <Icon name="plus" size={19} />
          <span>مهمة جديدة</span>
          <kbd>N</kbd>
        </button>

        <div className="sidebar-section-label">مساحة العمل</div>
        <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-item ${view === item.id && !selectedCategory ? "active" : ""}`}
              onClick={() => runSidebarAction(() => onNavigate?.(item.id))}
              aria-current={view === item.id && !selectedCategory ? "page" : undefined}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.countKey && stats[item.countKey] > 0 && <span className={`nav-count ${item.alert ? "nav-count-alert" : ""}`}>{stats[item.countKey]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section-heading">
          <span className="sidebar-section-label">التصنيفات</span>
          <span className="category-total">{categories.length}</span>
        </div>
        <nav className="sidebar-nav category-nav" aria-label="التصنيفات">
          {categories.map((category) => (
            <button
              type="button"
              key={category.label}
              className={`nav-item category-item ${selectedCategory === category.label ? "active" : ""}`}
              onClick={() => runSidebarAction(() => onSelectCategory?.(category.label))}
              aria-pressed={selectedCategory === category.label}
            >
              <span className="category-dot" style={{ "--category-color": category.color }} />
              <span>{category.label}</span>
            </button>
          ))}
          {categories.length === 0 && <p className="sidebar-empty">ستظهر تصنيفاتك هنا</p>}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Icon name="spark" size={17} /></div>
            <p>خطوة صغيرة كل يوم تصنع فرقًا كبيرًا.</p>
            <span>استمر، أنت تتقدم ✦</span>
          </div>
          <button type="button" className="nav-item utility-item" onClick={() => runSidebarAction(onExport)}><Icon name="download" size={18} /><span>تصدير نسخة احتياطية</span></button>
          <button type="button" className="nav-item utility-item" onClick={() => runSidebarAction(onImport)}><Icon name="upload" size={18} /><span>استيراد مهام</span></button>
          <button type="button" className="nav-item utility-item" onClick={() => runSidebarAction(onSettings)}><Icon name="settings" size={18} /><span>الإعدادات</span></button>
          <div className="sidebar-footer"><span className="footer-status" /> بياناتك محفوظة على جهازك</div>
        </div>
      </aside>
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import Icon from "./components/Icon";
import Sidebar from "./components/Sidebar";
import TaskModal from "./components/TaskModal";
import TaskCard from "./components/TaskCard";
import FocusTimer from "./components/FocusTimer";
import WeeklyActivity from "./components/WeeklyActivity";
import NotificationCenter from "./components/NotificationCenter";
import MobileNav from "./components/MobileNav";
import useTasks from "./hooks/useTasks";
import useNotifications from "./hooks/useNotifications";
import usePwa from "./hooks/usePwa";
import { DEFAULT_CATEGORIES } from "./data/categories";
import { pickBackupFile, saveBackupFile } from "./platform/nativeRuntime";
import {
  filterTasks,
  getCategoryColor,
  getTaskStats,
  localDateString,
  sortTasks,
  THEME_KEY,
} from "./utils/taskUtils";

const VIEW_TITLES = {
  all: {
    title: "كل المهام",
    subtitle: "رتّب أولوياتك، وخلّي كل خطوة تقرّبك من هدفك.",
  },
  today: {
    title: "مهام اليوم",
    subtitle: "ابدأ بالأهم، وأنهِ يومك وأنت راضٍ عن إنجازك.",
  },
  upcoming: {
    title: "المهام القادمة",
    subtitle: "استعد للخطوات القادمة وخطط لوقتك بهدوء.",
  },
  overdue: {
    title: "مهام تحتاج انتباهك",
    subtitle: "لا بأس بالتأخير؛ المهم أن تبدأ من جديد.",
  },
  completed: {
    title: "إنجازاتك",
    subtitle: "هنا كل خطوة أنهيتها وكل تقدم حققته.",
  },
};

function readTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function App() {
  const {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    duplicateTask,
    clearCompleted,
    replaceTasks,
  } = useTasks();
  const {
    notifications: notificationItems,
    unreadCount,
    settings: notificationSettings,
    permission: notificationPermission,
    requestPermission,
    exactAlarmPermission,
    requestExactAlarm,
    sendTestNotification,
    updateSettings,
    markRead,
    markTaskRead,
    markAllRead,
    dismiss: dismissNotification,
  } = useNotifications(tasks);
  const pwa = usePwa();
  const [theme, setTheme] = useState(readTheme);
  const [view, setView] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toast, setToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showLaunchSplash, setShowLaunchSplash] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const importInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const previousUnreadCount = useRef(unreadCount);

  const stats = useMemo(() => getTaskStats(tasks), [tasks]);
  const categories = useMemo(() => {
    const names = new Set([
      ...DEFAULT_CATEGORIES.map((category) => category.label),
      ...tasks.map((task) => task.category),
    ]);
    return Array.from(names).map((label) => ({
      label,
      color: getCategoryColor(label),
    }));
  }, [tasks]);
  const filteredTasks = useMemo(
    () =>
      sortTasks(
        filterTasks(tasks, view, search, status, selectedCategory),
        sortBy,
      ),
    [tasks, view, search, status, selectedCategory, sortBy],
  );
  const page = selectedCategory
    ? {
        title: selectedCategory,
        subtitle: `كل المهام الموجودة في تصنيف ${selectedCategory}.`,
      }
    : VIEW_TITLES[view];
  const todayLabel = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const notify = useCallback((message) => setToast(message), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor)
      themeColor.setAttribute(
        "content",
        theme === "dark" ? "#11121a" : "#f5f6fa",
      );
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.warn("تعذّر حفظ المظهر", error);
    }
    if (pwa.native && pwa.platform !== "desktop") {
      import("@capacitor/status-bar")
        .then(({ StatusBar, Style }) => {
          StatusBar.setStyle({
            style: theme === "dark" ? Style.Light : Style.Dark,
          }).catch(() => {});
          StatusBar.setBackgroundColor({
            color: theme === "dark" ? "#11121a" : "#f5f6fa",
          }).catch(() => {});
        })
        .catch(() => {});
    }
  }, [theme, pwa.native, pwa.platform]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (unreadCount > previousUnreadCount.current) {
      const latest = notificationItems.find((item) => !item.read);
      if (latest) notify(`${latest.title}: ${latest.body}`);
    }
    previousUnreadCount.current = unreadCount;
  }, [unreadCount, notificationItems, notify]);

  useEffect(() => {
    if (!pwa.installed) return undefined;
    setShowLaunchSplash(true);
    const timeout = window.setTimeout(() => setShowLaunchSplash(false), 700);
    return () => window.clearTimeout(timeout);
  }, [pwa.installed]);

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("nawa-app-update", onUpdate);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("nawa-app-update", onUpdate);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage
        .persist()
        .catch((error) => console.warn("تعذّر طلب الاحتفاظ بالتخزين:", error));
    }
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingTask(null);
    setModalOpen(true);
  }, []);

  const handleFocusComplete = useCallback(() => {
    notify("انتهت جلسة التركيز! خذ استراحة قصيرة ثم ابدأ من جديد.");
  }, [notify]);

  const openTaskById = useCallback(
    (taskId) => {
      const task = tasks.find((item) => item.id === taskId);
      if (taskId) markTaskRead(taskId);
      setShowAlerts(false);
      if (!task) {
        notify("المهمة لم تعد موجودة؛ ربما تم حذفها.");
        return;
      }
      setView("all");
      setSelectedCategory("");
      setEditingTask(task);
      setModalOpen(true);
    },
    [tasks, markTaskRead, notify],
  );

  useEffect(() => {
    const onNativeTaskOpen = (event) => {
      const taskId = event.detail?.taskId;
      if (taskId) openTaskById(taskId);
    };
    window.addEventListener("nawa-open-task", onNativeTaskOpen);
    return () => window.removeEventListener("nawa-open-task", onNativeTaskOpen);
  }, [openTaskById]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task");
    const requestedView = params.get("view");
    const shouldCreate = params.get("new") === "1";
    if (taskId) openTaskById(taskId);
    if (
      ["all", "today", "upcoming", "overdue", "completed"].includes(
        requestedView,
      )
    )
      setView(requestedView);
    if (shouldCreate) openCreateModal();
    if (!taskId && !requestedView && !shouldCreate) return;
    params.delete("task");
    params.delete("view");
    params.delete("new");
    const query = params.toString();
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [openTaskById, openCreateModal]);

  useEffect(() => {
    if (!pwa.native || pwa.platform !== "android") return undefined;
    let active = true;
    let listener = null;
    import("@capacitor/app")
      .then(({ App: NativeApp }) =>
        NativeApp.addListener("backButton", () => {
          if (modalOpen) {
            setModalOpen(false);
            setEditingTask(null);
            return;
          }
          if (settingsOpen) {
            setSettingsOpen(false);
            return;
          }
          if (showAlerts) {
            setShowAlerts(false);
            return;
          }
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
            return;
          }
          if (selectedCategory || view !== "all") {
            setSelectedCategory("");
            setView("all");
            setStatus("all");
            return;
          }
          NativeApp.exitApp();
        }),
      )
      .then((createdListener) => {
        listener = createdListener;
        if (!active) listener?.remove();
      })
      .catch((error) =>
        console.warn("تعذّر تفعيل زر الرجوع في Android:", error),
      );
    return () => {
      active = false;
      listener?.remove();
    };
  }, [
    pwa.native,
    pwa.platform,
    modalOpen,
    settingsOpen,
    showAlerts,
    mobileMenuOpen,
    selectedCategory,
    view,
  ]);

  useEffect(() => {
    const handleShortcuts = (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setShowAlerts(false);
        setSettingsOpen(false);
        return;
      }
      if (modalOpen || settingsOpen) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        !typing &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        openCreateModal();
      }
    };
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [openCreateModal, modalOpen, settingsOpen]);

  const handleSaveTask = (values) => {
    if (editingTask) {
      updateTask(editingTask.id, values);
      notify("تم تحديث المهمة بنجاح");
    } else {
      const created = addTask(values);
      if (!created) {
        notify("تعذّر إضافة المهمة. تأكد من كتابة عنوان صحيح.");
        return;
      }
      notify(
        values.reminderAt
          ? "تمت إضافة المهمة وضبط التذكير"
          : "تمت إضافة المهمة إلى قائمتك",
      );
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleDelete = (task) => {
    const accepted = window.confirm(
      `هل تريد حذف المهمة «${task.title}»؟ لا يمكن التراجع عن هذا الإجراء.`,
    );
    if (!accepted) return;
    deleteTask(task.id);
    notify("تم حذف المهمة");
  };

  const handleToggle = (id) => {
    const task = tasks.find((item) => item.id === id);
    toggleTask(id);
    notify(
      task?.completed
        ? "تمت إعادة فتح المهمة"
        : "أحسنت! تمت إضافة إنجاز جديد 🎉",
    );
  };

  const exportBackup = async () => {
    const backup = {
      app: "Nawa Tasks",
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      tasks,
    };
    const filename = `nawa-backup-${localDateString()}.json`;
    try {
      const saved = await saveBackupFile(
        filename,
        JSON.stringify(backup, null, 2),
      );
      if (saved) notify("تم تجهيز النسخة الاحتياطية");
      else notify("لم يتم حفظ النسخة الاحتياطية أو تم إلغاء المشاركة");
    } catch (error) {
      console.warn("تعذّر تصدير النسخة الاحتياطية:", error);
      notify("تعذّر تصدير النسخة الاحتياطية");
    }
  };

  const importBackupText = async (contents) => {
    try {
      const parsed = JSON.parse(contents);
      const incoming = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.tasks)
          ? parsed.tasks
          : null;
      if (!incoming) throw new Error("الملف لا يحتوي على قائمة مهام صالحة.");
      if (
        !window.confirm(
          `سيتم استبدال مهامك الحالية بـ ${incoming.length} مهمة من الملف. هل تريد المتابعة؟`,
        )
      )
        return;
      const importedCount = replaceTasks(incoming);
      if (importedCount === false)
        throw new Error("لم نعثر على مهام صالحة داخل الملف.");
      const skippedCount = incoming.length - importedCount;
      notify(
        skippedCount > 0
          ? `تم استيراد ${importedCount} مهمة وتجاهل ${skippedCount} سجل غير صالح`
          : `تم استيراد ${importedCount} مهمة`,
      );
    } catch (error) {
      notify(error.message || "تعذّر قراءة النسخة الاحتياطية");
    }
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify("حجم الملف أكبر من 5 ميجابايت.");
      return;
    }
    try {
      const contents = await file.text();
      await importBackupText(contents);
    } catch (error) {
      console.warn("تعذّرت قراءة ملف النسخة الاحتياطية:", error);
      notify("تعذّرت قراءة الملف. تأكد أنه ملف JSON صالح.");
    }
  };

  const handleImportBackup = async () => {
    if (pwa.platform === "desktop") {
      try {
        const contents = await pickBackupFile();
        if (contents) await importBackupText(contents);
      } catch {
        notify("تعذّر فتح ملف النسخة الاحتياطية");
      }
      return;
    }
    importInputRef.current?.click();
  };

  const handleClearCompleted = () => {
    if (!stats.completed) return;
    if (
      !window.confirm(
        `سيتم حذف ${stats.completed} مهمة مكتملة نهائيًا. هل تريد المتابعة؟`,
      )
    )
      return;
    clearCompleted();
    setSettingsOpen(false);
    notify("تم تنظيف قائمة المهام المكتملة");
  };

  const handleSnooze = (item) => {
    const task = tasks.find((candidate) => candidate.id === item.taskId);
    if (!task || task.completed) {
      dismissNotification(item.id);
      notify("هذه المهمة لم تعد بحاجة إلى تذكير.");
      return;
    }
    updateTask(task.id, {
      reminderAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    markRead(item.id);
    notify("تم تأجيل التذكير 10 دقائق");
  };

  const handleNotificationPermission = async () => {
    const result = await requestPermission();
    if (result === "granted") notify("تم تفعيل إشعارات الجهاز بنجاح");
    else if (result === "denied") notify("الإشعارات محظورة من إعدادات المتصفح");
    else notify("هذا المتصفح لا يدعم إشعارات الجهاز");
  };

  const handleExactAlarmPermission = async () => {
    const result = await requestExactAlarm();
    if (result === "granted") notify("تم تفعيل التذكيرات الدقيقة");
    else if (result === "denied")
      notify("لم يتم السماح بالتذكيرات الدقيقة؛ قد تتأخر بعض التنبيهات");
    else if (result === "unsupported")
      notify("هذه النسخة لا توفر إعداد المنبهات الدقيقة");
    else notify("افتح إعدادات التطبيق واسمح بخيار المنبهات والتذكيرات");
  };

  const handleTestNotification = async () => {
    const shown = await sendTestNotification();
    notify(
      shown
        ? "تم إرسال إشعار تجريبي إلى جهازك"
        : "تعذّر إرسال الإشعار التجريبي",
    );
  };

  const handleInstall = async () => {
    const result = await pwa.install();
    if (result === "accepted") notify("تم بدء تثبيت نَواة على جهازك");
    else if (result === "dismissed")
      notify("يمكنك تثبيت التطبيق لاحقًا من قائمة المتصفح");
    else if (result === "unavailable")
      notify("افتح قائمة المتصفح واختر إضافة إلى الشاشة الرئيسية");
  };

  const changeView = useCallback((nextView) => {
    if (!Object.prototype.hasOwnProperty.call(VIEW_TITLES, nextView)) return;
    setView(nextView);
    setStatus("all");
    setSelectedCategory("");
  }, []);

  const changeCategory = useCallback(
    (category) => {
      if (
        typeof category !== "string" ||
        !categories.some((item) => item.label === category)
      )
        return;
      setView("all");
      setStatus("all");
      setSelectedCategory(category);
    },
    [categories],
  );

  return (
    <div
      className={`app-shell ${pwa.installed ? "is-standalone" : ""}`}
      dir="rtl"
    >
      <Sidebar
        view={view}
        onNavigate={changeView}
        stats={stats}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={changeCategory}
        onAdd={openCreateModal}
        onExport={exportBackup}
        onImport={handleImportBackup}
        onSettings={() => setSettingsOpen(true)}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح القائمة"
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumb">
              <span>مساحة العمل</span>
              <Icon name="arrow" size={14} />
              <strong>{page.title}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span
              className={`connection-status ${isOnline ? "is-online" : "is-offline"}`}
              title={isOnline ? "متصل بالإنترنت" : "تعمل دون اتصال"}
            >
              <i />
              {isOnline ? "متصل" : "دون اتصال"}
            </span>
            <span className="topbar-date">{todayLabel}</span>
            {!pwa.installed && pwa.canInstall && (
              <button
                className="icon-button install-quick-button"
                onClick={handleInstall}
                aria-label="تثبيت التطبيق"
                title="تثبيت التطبيق"
              >
                <Icon name="download" />
              </button>
            )}
            <button
              className="icon-button theme-toggle"
              onClick={() =>
                setTheme((current) => (current === "light" ? "dark" : "light"))
              }
              aria-label={
                theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"
              }
              title="تغيير المظهر"
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>
            <button
              className={`icon-button notification-button ${unreadCount ? "has-alert" : ""}`}
              onClick={() => setShowAlerts((value) => !value)}
              aria-label={`التنبيهات ${unreadCount ? `(${unreadCount} غير مقروء)` : ""}`}
            >
              <Icon name="bell" />
              <span className="notification-dot" />
              {unreadCount > 0 && (
                <span className="notification-count">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              className="avatar-badge"
              onClick={() => setSettingsOpen(true)}
              title="الإعدادات"
              aria-label="فتح الإعدادات"
            >
              ن
            </button>
          </div>
        </header>

        <div className="page-content">
          {!isOnline && (
            <div className="offline-banner">
              <Icon name="alert" size={15} /> تعمل نَواة دون اتصال. التغييرات
              محفوظة على هذا الجهاز وستظل متاحة لك.
            </div>
          )}
          <section className="welcome-row">
            <div>
              <div className="welcome-kicker">
                <span className="welcome-spark">
                  <Icon name="spark" size={15} />
                </span>{" "}
                يوم جديد، فرصة جديدة
              </div>
              <h1>
                أهلاً بك في <span>مساحة إنجازك</span>
              </h1>
              <p>كل ما تحتاجه لتنظيم يومك وتحويل خططك إلى واقع.</p>
            </div>
            <button
              className="button button-primary top-add-button"
              onClick={openCreateModal}
            >
              <Icon name="plus" size={18} />
              مهمة جديدة
            </button>
          </section>

          <section className="overview-grid" aria-label="ملخص المهام">
            <article className="overview-card overview-total">
              <div className="overview-icon">
                <Icon name="grid" size={19} />
              </div>
              <span className="overview-label">إجمالي المهام</span>
              <strong>{stats.total}</strong>
              <small>كل ما تعمل عليه</small>
              <div className="overview-decoration decoration-one" />
            </article>
            <article className="overview-card overview-active">
              <div className="overview-icon">
                <Icon name="clock" size={19} />
              </div>
              <span className="overview-label">قيد التنفيذ</span>
              <strong>{stats.active}</strong>
              <small>بانتظار إنجازك</small>
              <div className="overview-decoration decoration-two" />
            </article>
            <article className="overview-card overview-done">
              <div className="overview-icon">
                <Icon name="check" size={19} />
              </div>
              <span className="overview-label">تم إنجازها</span>
              <strong>{stats.completed}</strong>
              <small>خطوات نجحت فيها</small>
              <div className="overview-decoration decoration-three" />
            </article>
            <article
              className={`overview-card overview-late ${stats.overdue ? "has-overdue" : ""}`}
            >
              <div className="overview-icon">
                <Icon name="alert" size={19} />
              </div>
              <span className="overview-label">تحتاج انتباهك</span>
              <strong>{stats.overdue}</strong>
              <small>مهام تجاوزت موعدها</small>
              <div className="overview-decoration decoration-four" />
            </article>
          </section>

          <section className="progress-banner">
            <div className="progress-copy">
              <div className="progress-heading">
                <span className="progress-spark">
                  <Icon name="spark" size={18} />
                </span>
                <h2>رحلتك نحو الإنجاز</h2>
              </div>
              <p>
                {stats.total
                  ? `أنجزت ${stats.completed} من أصل ${stats.total} مهمة. استمر، أنت تقوم بعمل رائع!`
                  : "أضف أول مهمة لك وابدأ في بناء سلسلة إنجازاتك."}
              </p>
              <div className="progress-track">
                <span style={{ width: `${stats.progress}%` }} />
              </div>
            </div>
            <div className="progress-number">
              <strong>
                {stats.progress}
                <small>%</small>
              </strong>
              <span>نسبة الإنجاز</span>
            </div>
            <div className="progress-decoration" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </section>

          <div className="workspace-grid">
            <section className="tasks-panel">
              <div className="section-header">
                <div>
                  <span className="eyebrow">خطّتك اليومية</span>
                  <h2>
                    {page.title}
                    <span className="task-total-pill">
                      {filteredTasks.length}
                    </span>
                  </h2>
                  <p>{page.subtitle}</p>
                </div>
                <button
                  className="button button-outline desktop-add-button"
                  onClick={openCreateModal}
                >
                  <Icon name="plus" size={17} />
                  إضافة مهمة
                </button>
              </div>

              <div className="task-toolbar">
                <div className="search-box">
                  <Icon name="search" size={18} />
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder="ابحث عن مهمة أو وصف..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="البحث في المهام"
                  />
                  <kbd>⌘ K</kbd>
                </div>
                <label className="sort-select">
                  <Icon name="filter" size={17} />
                  <span className="sr-only">ترتيب المهام</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    <option value="newest">الأحدث أولاً</option>
                    <option value="oldest">الأقدم أولاً</option>
                    <option value="priority">حسب الأولوية</option>
                    <option value="dueDate">حسب الموعد</option>
                    <option value="reminder">حسب التذكير</option>
                  </select>
                </label>
              </div>

              {(view === "all" || selectedCategory) && (
                <div
                  className="task-filters"
                  role="tablist"
                  aria-label="تصفية المهام"
                >
                  {[
                    { id: "all", label: "الكل" },
                    { id: "active", label: "قيد التنفيذ" },
                    { id: "completed", label: "مكتملة" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      role="tab"
                      aria-selected={status === item.id}
                      className={status === item.id ? "filter-active" : ""}
                      onClick={() => setStatus(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="task-list">
                {filteredTasks.length ? (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onEdit={(currentTask) => {
                        setEditingTask(currentTask);
                        setModalOpen(true);
                      }}
                      onDelete={handleDelete}
                      onDuplicate={(id) => {
                        const copy = duplicateTask(id);
                        notify(
                          copy
                            ? "تم إنشاء نسخة جديدة بدون تذكير"
                            : "تعذّر نسخ المهمة",
                        );
                      }}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-illustration">
                      <Icon name={search ? "search" : "inbox"} size={31} />
                    </div>
                    <h3>
                      {search
                        ? "لا توجد نتائج مطابقة"
                        : selectedCategory
                          ? "لا توجد مهام في هذا التصنيف"
                          : view === "completed"
                            ? "لم تكمل أي مهمة بعد"
                            : view === "today"
                              ? "يومك هادئ حتى الآن"
                              : view === "upcoming"
                                ? "لا توجد مهام قادمة"
                                : view === "overdue"
                                  ? "رائع! لا توجد مهام متأخرة"
                                  : "قائمتك جاهزة لبداية جديدة"}
                    </h3>
                    <p>
                      {search
                        ? "جرّب كلمة بحث مختلفة أو غيّر الفلاتر."
                        : "أضف مهمة جديدة، وحدد أولوياتك، ودع نَواة تساعدك على تنظيم يومك."}
                    </p>
                    {!search && view !== "completed" && (
                      <button
                        className="button button-primary"
                        onClick={openCreateModal}
                      >
                        <Icon name="plus" size={17} />
                        أضف أول مهمة
                      </button>
                    )}
                  </div>
                )}
              </div>
              {stats.completed > 0 && (
                <div className="list-footer">
                  <span>أنت أنجزت {stats.completed} مهمة حتى الآن 👏</span>
                  <button onClick={handleClearCompleted}>
                    تنظيف المهام المكتملة
                  </button>
                </div>
              )}
            </section>

            <aside className="right-rail">
              <FocusTimer onComplete={handleFocusComplete} />
              <WeeklyActivity tasks={tasks} />
              <section className="quote-card">
                <div className="quote-mark">“</div>
                <p>النجاح هو مجموع الجهود الصغيرة التي تتكرر يومًا بعد يوم.</p>
                <span>— روبرت كولير</span>
                <div className="quote-orb" />
              </section>
            </aside>
          </div>

          <footer className="page-footer">
            <span>
              صُنع ليجعل يومك أكثر ترتيبًا <b>♥</b>
            </span>
            <span>نَواة · كل خطوة لها قيمة</span>
          </footer>
        </div>
      </main>

      <MobileNav
        view={view}
        onNavigate={changeView}
        onAdd={openCreateModal}
        onNotifications={() => setShowAlerts(true)}
        unreadCount={unreadCount}
      />
      <NotificationCenter
        open={showAlerts}
        onClose={() => setShowAlerts(false)}
        notifications={notificationItems}
        unreadCount={unreadCount}
        permission={notificationPermission}
        onRequestPermission={handleNotificationPermission}
        onMarkAllRead={markAllRead}
        onMarkRead={markRead}
        onDismiss={dismissNotification}
        onOpenTask={openTaskById}
        onSnooze={handleSnooze}
      />

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        task={editingTask}
        categories={categories}
      />

      {settingsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            dir="rtl"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">تحكم في تجربتك</span>
                <h2 id="settings-title">الإعدادات</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSettingsOpen(false)}
                aria-label="إغلاق"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="setting-row">
              <div>
                <strong>المظهر</strong>
                <span>اختر الوضع المناسب لك</span>
              </div>
              <button
                className="button button-outline"
                onClick={() =>
                  setTheme((current) =>
                    current === "light" ? "dark" : "light",
                  )
                }
              >
                <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
                {theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
              </button>
            </div>

            <div className="settings-section-label">التنبيهات والتذكيرات</div>
            <div className="setting-row">
              <div>
                <strong>تنبيهات داخل التطبيق</strong>
                <span>عرض تذكير عند استحقاق المهمة أثناء فتح التطبيق</span>
              </div>
              <label className="switch-control">
                <input
                  aria-label="تفعيل تنبيهات داخل التطبيق"
                  type="checkbox"
                  checked={notificationSettings.inAppEnabled}
                  onChange={(event) =>
                    updateSettings({ inAppEnabled: event.target.checked })
                  }
                />
                <span />
              </label>
            </div>
            <div className="setting-row">
              <div>
                <strong>إشعارات الجهاز</strong>
                <span>
                  {notificationPermission === "granted"
                    ? "إشعارات نظام التشغيل مسموح بها"
                    : notificationPermission === "denied"
                      ? pwa.native
                        ? "اسمح بالإشعارات من إعدادات التطبيق في النظام"
                        : "اسمح بها من إعدادات الموقع في المتصفح"
                      : notificationPermission === "unsupported"
                        ? "غير مدعومة في هذا المتصفح"
                        : "تحتاج إلى موافقة نظام التشغيل أولًا"}
                </span>
              </div>
              {notificationPermission === "granted" ? (
                <div className="setting-buttons">
                  <label className="switch-control">
                    <input
                      aria-label="تفعيل إشعارات الجهاز"
                      type="checkbox"
                      checked={notificationSettings.systemEnabled}
                      onChange={(event) =>
                        updateSettings({ systemEnabled: event.target.checked })
                      }
                    />
                    <span />
                  </label>
                  <button
                    className="button button-outline"
                    onClick={handleTestNotification}
                  >
                    اختبار
                  </button>
                </div>
              ) : notificationPermission === "default" ? (
                <button
                  className="button button-outline"
                  onClick={handleNotificationPermission}
                >
                  طلب الإذن
                </button>
              ) : null}
            </div>
            {pwa.platform === "android" &&
              notificationSettings.systemEnabled &&
              notificationPermission === "granted" && (
                <div className="setting-row">
                  <div>
                    <strong>دقة مواعيد التنبيه</strong>
                    <span>
                      {exactAlarmPermission === "granted"
                        ? "مسموح بالتنبيهات الدقيقة"
                        : exactAlarmPermission === "unsupported"
                          ? "إصدار الإضافة لا يدعم فحص هذه الصلاحية"
                          : "قد تتأخر التنبيهات إذا لم تسمح بالمنبهات الدقيقة"}
                    </span>
                  </div>
                  {exactAlarmPermission !== "granted" && (
                    <button
                      className="button button-outline"
                      onClick={handleExactAlarmPermission}
                    >
                      ضبط الدقة
                    </button>
                  )}
                </div>
              )}
            <div className="setting-row">
              <div>
                <strong>الاهتزاز</strong>
                <span>اهتزاز الجهاز عند وصول تذكير (على الأجهزة المدعومة)</span>
              </div>
              <label className="switch-control">
                <input
                  aria-label="تفعيل اهتزاز الجهاز"
                  type="checkbox"
                  checked={notificationSettings.vibrate}
                  onChange={(event) =>
                    updateSettings({ vibrate: event.target.checked })
                  }
                />
                <span />
              </label>
            </div>
            <p className="notification-limit-note">
              {pwa.platform === "android"
                ? `تذكيرات الهاتف تُجدول بواسطة نظام التشغيل. ${exactAlarmPermission === "granted" ? "المنبهات الدقيقة مسموح بها." : "قد تتأخر المواعيد الدقيقة إذا لم تسمح بإذن المنبهات الدقيقة."}`
                : pwa.platform === "ios"
                  ? "تذكيرات الهاتف تُجدول بواسطة نظام التشغيل. يحتفظ التطبيق بأقرب 60 تذكيرًا، ويعيد ملء القائمة عند فتح التطبيق أو عودته للواجهة."
                  : pwa.platform === "desktop"
                    ? "تظهر إشعارات سطح المكتب عند استحقاق المهمة ما دام التطبيق يعمل. لا يضمن هذا الإصدار تشغيل تذكير مجدول بعد إغلاق التطبيق بالكامل."
                    : "تعمل التذكيرات في نسخة المتصفح أثناء تشغيل التطبيق. قد يقيّد المتصفح المؤقتات في الخلفية أو بعد إغلاق الصفحة."}
            </p>

            <div className="settings-section-label">تجربة التطبيق</div>
            <div className="setting-row">
              <div>
                <strong>{pwa.native ? "نسخة التطبيق" : "تثبيت نَواة"}</strong>
                <span>
                  {pwa.platform === "android"
                    ? "تطبيق Android مستقل مع إشعارات محلية وصلاحيات الجهاز"
                    : pwa.platform === "ios"
                      ? "تطبيق iPhone مستقل مع إشعارات محلية ومشاركة الملفات"
                      : pwa.platform === "desktop"
                        ? "تطبيق سطح مكتب مستقل يعمل كبرنامج على جهازك"
                        : pwa.installed
                          ? "التطبيق مثبت ويعمل في وضع التطبيق"
                          : pwa.iosInstallHint
                            ? "من Safari اضغط مشاركة ثم إضافة إلى الشاشة الرئيسية"
                            : "ثبّت التطبيق على الشاشة الرئيسية لفتحه بملء الشاشة"}
                </span>
              </div>
              {pwa.canInstall && (
                <button
                  className="button button-primary"
                  onClick={handleInstall}
                >
                  <Icon name="download" size={16} />
                  تثبيت التطبيق
                </button>
              )}
            </div>
            <div className="setting-row">
              <div>
                <strong>النسخ الاحتياطي</strong>
                <span>احتفظ بمهامك أو استعد نسخة سابقة</span>
              </div>
              <div className="setting-buttons">
                <button
                  className="button button-outline"
                  onClick={exportBackup}
                >
                  <Icon name="download" size={16} />
                  تصدير
                </button>
                <button
                  className="button button-outline"
                  onClick={handleImportBackup}
                >
                  <Icon name="upload" size={16} />
                  استيراد
                </button>
              </div>
            </div>
            <div className="setting-row setting-danger">
              <div>
                <strong>تنظيف المهام المكتملة</strong>
                <span>حذف جميع المهام التي تم إنجازها</span>
              </div>
              <button
                className="button button-danger"
                onClick={handleClearCompleted}
                disabled={!stats.completed}
              >
                <Icon name="trash" size={16} />
                حذف المكتملة
              </button>
            </div>
            <p className="privacy-note">
              <Icon name="check" size={16} /> بياناتك تُحفظ محليًا على هذا
              الجهاز ولا تُرسل إلى خادم خارجي.
            </p>
          </section>
        </div>
      )}

      <input
        ref={importInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={importBackup}
        aria-label="اختيار ملف النسخة الاحتياطية"
      />
      {updateAvailable && (
        <div className="app-update-banner">
          <span>
            <Icon name="spark" size={16} /> يتوفر تحديث جديد لنَواة
          </span>
          <button onClick={() => window.location.reload()}>تحديث الآن</button>
        </div>
      )}
      {toast && (
        <div className="toast-message" role="status">
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
        </div>
      )}
      {showLaunchSplash && (
        <div className="launch-splash" aria-label="نَواة">
          <div className="launch-brand-mark">
            <Icon name="check" size={36} strokeWidth={2.7} />
          </div>
          <strong>نَواة</strong>
          <span>كل خطوة لها قيمة</span>
        </div>
      )}
    </div>
  );
}

export default App;

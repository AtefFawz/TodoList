import {
  BarChart3,
  Bell,
  CalendarClock,
  Download,
  FileJson,
  Inbox,
  Languages,
  ListTodo,
  Menu,
  Moon,
  Plus,
  Redo2,
  Settings as SettingsIcon,
  Sun,
  Timer,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INBOX_ID, type Task, type TaskList } from "@/core/model";
import { allTags, computeCounts, viewKey, type View } from "@/core/selectors";
import { Button } from "@/components/button";
import { Confetti } from "@/components/confetti";
import { Modal } from "@/components/modal";
import { ToastProvider, useToast } from "@/components/toast";
import { FocusDialog } from "@/features/focus/focus-dialog";
import { CommandPalette, type PaletteCommand } from "@/features/palette/command-palette";
import { ListDialog } from "@/features/settings/list-dialog";
import { SettingsDialog, backupName, download } from "@/features/settings/settings-dialog";
import { SidebarContent, hrefFor } from "@/features/shell/sidebar";
import { ViewHeader } from "@/features/shell/view-header";
import { StatsView } from "@/features/stats/stats-view";
import { TaskDetail } from "@/features/tasks/task-detail";
import { TasksView } from "@/features/tasks/tasks-view";
import { useDocumentSettings } from "@/hooks/use-document-settings";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useHotkey } from "@/hooks/use-hotkey";
import { useInstall } from "@/hooks/use-install";
import { useDeviceNotifications } from "@/hooks/use-device-notifications";
import { useNow } from "@/hooks/use-now";
import { useOnline } from "@/hooks/use-online";
import { usePwaUpdate } from "@/hooks/use-pwa-update";
import { useReminders } from "@/hooks/use-reminders";
import { haptic, showSystemNotification } from "@/platform/runtime";
import { reminderTime } from "@/core/reminders";
import { AlertsCenter } from "@/features/alerts/alerts-center";
import { Overview } from "@/features/tasks/overview";
import { useAlerts } from "@/state/alerts";
import type { DeviceAlerts } from "@/features/settings/settings-dialog";
import { useRoute } from "@/hooks/use-route";
import { exportJson } from "@/core/transfer";
import { formatLongDate } from "@/lib/format";
import { I18nProvider, useI18n } from "@/i18n";
import { useData, useDispatch, useHistory } from "@/state/context";
import { CelebrateProvider, ClockProvider } from "./contexts";

export function App() {
  const language = useData((d) => d.settings.language);
  const theme = useData((d) => d.settings.theme);
  const clock = useNow();
  return (
    <I18nProvider language={language}>
      <ThemeSync language={language} theme={theme} />
      <ClockProvider value={clock}>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </ClockProvider>
    </I18nProvider>
  );
}

function ThemeSync({ language, theme }: { language: "ar" | "en"; theme: "system" | "light" | "dark" }) {
  const { t } = useI18n();
  useDocumentSettings(language, theme, t("brand"));
  return null;
}

function Shell() {
  const { t, language, locale } = useI18n();
  const show = useToast();
  const dispatch = useDispatch();
  const clock = useNow();
  const { today } = clock;
  const data = useData((d) => d);
  const { canUndo, canRedo, undo, redo } = useHistory();
  const [view, go] = useRoute();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [listDialog, setListDialog] = useState<{ list: TaskList | null } | null>(null);
  const [confetti, setConfetti] = useState<number | null>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const online = useOnline();
  const install = useInstall();
  const { updateReady, applyUpdate } = usePwaUpdate();
  const alerts = useAlerts();

  const counts = useMemo(() => computeCounts(data, today), [data, today]);
  const tags = useMemo(() => allTags(data), [data]);
  const { systemAlerts, inAppAlerts, vibrate } = data.settings;
  const device = useDeviceNotifications({
    tasks: data.tasks,
    wanted: systemAlerts,
    vibrate,
    title: t("reminderFromNawa"),
    channelName: t("channelName"),
    channelDescription: t("channelDescription"),
  });

  // --- Notifications: reminders + focus completion ---------------------------------------
  const announce = useCallback(
    (title: string, body: string, tag: string, taskId = "") => {
      show({ message: body, duration: 10_000 });
      if (device.enabled) void showSystemNotification({ title, body, taskId, vibrate, tag, channelName: t("channelName") });
    },
    [show, device.enabled, vibrate, t],
  );
  useReminders(data.tasks, clock.now, inAppAlerts || device.enabled, (task) => {
    const at = reminderTime(task) ?? clock.now;
    if (inAppAlerts) {
      alerts.store.push({ id: `reminder:${task.id}:${at}`, taskId: task.id, title: t("alertsDue"), body: task.title, at: clock.now });
      show({ message: t("taskDueNow", { title: task.title }), duration: 10_000 });
    }
    // On Android/iOS the operating system already delivered this one; elsewhere we notify now.
    if (device.enabled && !device.native)
      void showSystemNotification({
        title: t("reminderFromNawa"),
        body: task.title,
        taskId: task.id,
        vibrate,
        tag: `nawa-${task.id}-${at}`,
      });
    if (vibrate && !device.native) void haptic();
  });

  const timer = useFocusTimer({
    focusMinutes: data.settings.focusMinutes,
    breakMinutes: data.settings.breakMinutes,
    now: clock.now,
    onFocus: (taskId, ms) => dispatch({ type: "focus", id: taskId, ms }),
    onFinished: (mode) => announce(t("focusTitle"), t(mode === "focus" ? "focusDone" : "breakDone"), "nawa-focus"),
  });

  // --- Navigation ------------------------------------------------------------------------
  const openTask = useCallback((task: Task) => setSelectedId(task.id), []);
  const focusComposer = useCallback(() => {
    if (view.kind === "stats" || view.kind === "done") go({ kind: "inbox" });
    setTimeout(() => composerRef.current?.focus(), 0);
  }, [view.kind, go]);

  useHotkey("k", (e) => (e.preventDefault(), setPaletteOpen((o) => !o)), { mod: true, allowInInput: true });
  useHotkey("z", (e) => (e.preventDefault(), canUndo && undo()), { mod: true });
  useHotkey("y", (e) => (e.preventDefault(), canRedo && redo()), { mod: true });
  useHotkey("/", (e) => (e.preventDefault(), searchRef.current?.focus()));
  useHotkey("n", (e) => (e.preventDefault(), focusComposer()));

  // --- Celebration -----------------------------------------------------------------------
  const celebrate = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setConfetti(Date.now());
  }, []);
  useEffect(() => {
    if (confetti === null) return;
    const id = window.setTimeout(() => setConfetti(null), 2400);
    return () => window.clearTimeout(id);
  }, [confetti]);

  // --- Titles ----------------------------------------------------------------------------
  const lists = data.lists;
  const activeList = view.kind === "list" ? lists.find((l) => l.id === view.id) : undefined;
  const titleOf = (v: View): string => {
    switch (v.kind) {
      case "inbox": return t("navInbox");
      case "today": return t("navToday");
      case "upcoming": return t("navUpcoming");
      case "all": return t("navAll");
      case "done": return t("navDone");
      case "stats": return t("statsTitle");
      case "tag": return `#${v.tag}`;
      case "list": return activeList ? `${activeList.emoji} ${activeList.name}`.trim() : t("navLists");
    }
  }; // prettier-ignore
  const searching = query.trim().length > 0;
  const subtitle = (() => {
    if (searching) return "";
    if (view.kind === "today") return `${formatLongDate(today, locale)} · ${t.plural("openCount", counts.today)}`;
    if (view.kind === "stats") return t("statsSubtitle");
    if (view.kind === "done") return t.plural("doneCount", counts.done);
    if (view.kind === "list") return t.plural("openCount", counts.lists[view.id] ?? 0);
    if (view.kind === "tag") return t.plural("openCount", counts.tags[view.tag] ?? 0);
    return t.plural("openCount", counts[view.kind]);
  })();

  // PWA shortcut "New task" opens with ?action=new.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("action") !== "new") return;
    url.searchParams.delete("action");
    window.history.replaceState(null, "", url);
    composerRef.current?.focus();
  }, []);

  // A deleted list leaves its route dangling: send the user home.
  useEffect(() => {
    if (view.kind === "list" && !activeList) go({ kind: "today" });
  }, [view, activeList, go]);

  // --- Install ---------------------------------------------------------------------------
  const runInstall = () => {
    if (install.kind === "promptable") void install.install();
    else if (install.kind === "ios-manual") {
      setSettingsOpen(true);
    }
  };

  const deviceAlerts: DeviceAlerts = {
    permission: device.permission,
    exactAlarm: device.exactAlarm,
    native: device.native,
    request: device.request,
    requestExact: device.requestExact,
    sendTest: async () => {
      await showSystemNotification({
        title: t("remindersTestTitle"),
        body: t("remindersTestBody"),
        vibrate,
        tag: "nawa-test",
        channelName: t("channelName"),
      });
    },
  };

  // Deep links: tapping a native/system notification, or opening the app with ?task=<id>.
  useEffect(() => {
    const open = (id: string) => setSelectedId(id);
    const onEvent = (event: Event) => {
      const id = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (id) open(id);
    };
    window.addEventListener("nawa-open-task", onEvent);
    const url = new URL(window.location.href);
    const fromLink = url.searchParams.get("task");
    if (fromLink) {
      url.searchParams.delete("task");
      window.history.replaceState(null, "", url);
      open(fromLink);
    }
    return () => window.removeEventListener("nawa-open-task", onEvent);
  }, []);

  // --- Commands --------------------------------------------------------------------------
  const commands: PaletteCommand[] = [
    { id: "new", label: t("cmdNewTask"), icon: <Plus aria-hidden="true" />, keywords: "add create task مهمة جديدة", run: focusComposer },
    {
      id: "today",
      label: t("cmdGoTo", { view: t("navToday") }),
      icon: <ListTodo aria-hidden="true" />,
      keywords: "today اليوم",
      run: () => go({ kind: "today" }),
    },
    {
      id: "upcoming",
      label: t("cmdGoTo", { view: t("navUpcoming") }),
      icon: <CalendarClock aria-hidden="true" />,
      keywords: "upcoming week القادمة",
      run: () => go({ kind: "upcoming" }),
    },
    {
      id: "inbox",
      label: t("cmdGoTo", { view: t("navInbox") }),
      icon: <Inbox aria-hidden="true" />,
      keywords: "inbox الوارد",
      run: () => go({ kind: "inbox" }),
    },
    {
      id: "stats",
      label: t("cmdGoTo", { view: t("navStats") }),
      icon: <BarChart3 aria-hidden="true" />,
      keywords: "stats insights streak إحصائيات",
      run: () => go({ kind: "stats" }),
    },
    ...lists
      .filter((l) => l.id !== INBOX_ID)
      .map((l) => ({
        id: `list-${l.id}`,
        label: t("cmdGoTo", { view: l.name }),
        keywords: "list قائمة",
        run: () => go({ kind: "list", id: l.id }),
      })),
    {
      id: "alerts",
      label: t("alertsTitle"),
      icon: <Bell aria-hidden="true" />,
      keywords: "notifications reminders تنبيهات",
      run: () => setAlertsOpen(true),
    },
    {
      id: "focus",
      label: t("cmdStartFocus"),
      icon: <Timer aria-hidden="true" />,
      keywords: "pomodoro timer تركيز",
      run: () => setFocusOpen(true),
    },
    {
      id: "theme",
      label: t("cmdToggleTheme"),
      icon: data.settings.theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />,
      keywords: "dark light mode دارك لايت",
      run: () => dispatch({ type: "settings", patch: { theme: document.documentElement.dataset["theme"] === "dark" ? "light" : "dark" } }),
    },
    {
      id: "language",
      label: t("cmdToggleLanguage"),
      icon: <Languages aria-hidden="true" />,
      keywords: "arabic english عربي",
      run: () => dispatch({ type: "settings", patch: { language: language === "ar" ? "en" : "ar" } }),
    },
    ...(canUndo ? [{ id: "undo", label: t("undo"), icon: <Undo2 aria-hidden="true" />, keywords: "revert تراجع", run: undo }] : []),
    ...(canRedo ? [{ id: "redo", label: t("redo"), icon: <Redo2 aria-hidden="true" />, keywords: "إعادة", run: redo }] : []),
    {
      id: "export",
      label: t("cmdExport"),
      icon: <FileJson aria-hidden="true" />,
      keywords: "backup download نسخة",
      run: () => download(backupName("json"), exportJson(data), "application/json"),
    },
    {
      id: "settings",
      label: t("cmdSettings"),
      icon: <SettingsIcon aria-hidden="true" />,
      keywords: "preferences إعدادات",
      run: () => setSettingsOpen(true),
    },
    ...(install.kind === "promptable" || install.kind === "ios-manual"
      ? [{ id: "install", label: t("installApp"), icon: <Download aria-hidden="true" />, keywords: "pwa app تثبيت", run: runInstall }]
      : []),
  ];

  const sidebar = (onNavigate: () => void) => (
    <SidebarContent
      view={view}
      counts={counts}
      lists={lists}
      tags={tags}
      onNavigate={onNavigate}
      onNewList={() => (onNavigate(), setListDialog({ list: null }))}
      onEditList={(list) => (onNavigate(), setListDialog({ list }))}
      onSettings={() => (onNavigate(), setSettingsOpen(true))}
    />
  );

  const showSort = ["inbox", "all", "list", "tag"].includes(view.kind) && !searching;
  const mobileTabs: Array<{ view: View; icon: typeof ListTodo; label: string; badge: number }> = [
    { view: { kind: "today" }, icon: Sun, label: t("navToday"), badge: counts.today },
    { view: { kind: "upcoming" }, icon: CalendarClock, label: t("navUpcoming"), badge: 0 },
    { view: { kind: "inbox" }, icon: Inbox, label: t("navInbox"), badge: counts.inbox },
    { view: { kind: "stats" }, icon: BarChart3, label: t("navStats"), badge: 0 },
  ];

  return (
    <CelebrateProvider value={celebrate}>
      <a className="skip-link" href="#content">
        {t("skipToContent")}
      </a>
      <div className="shell">
        <aside className="sidebar">{sidebar(() => undefined)}</aside>

        <div className="content">
          <ViewHeader
            title={titleOf(view)}
            subtitle={subtitle}
            query={query}
            onQuery={setQuery}
            searchRef={searchRef}
            sort={data.settings.sort}
            onSort={(sort) => dispatch({ type: "settings", patch: { sort } })}
            showSort={showSort}
            canUndo={canUndo}
            onUndo={undo}
            timerRunning={timer.state.status === "running"}
            timerRemaining={timer.remaining}
            onFocus={() => setFocusOpen(true)}
            unreadAlerts={alerts.unread}
            onAlerts={() => setAlertsOpen(true)}
            onClearDone={
              view.kind === "done" && counts.done > 0
                ? () => (dispatch({ type: "clearDone" }), show({ message: t("clearedCompleted"), actionLabel: t("undo"), onAction: undo }))
                : null
            }
          />

          <main id="content" tabIndex={-1} className="main">
            {!online && (
              <p className="banner" role="status">
                {t("offline")}
              </p>
            )}
            {updateReady && (
              <p className="banner" role="status">
                <span>{t("updateReady")}</span>
                <button type="button" className="banner__action" onClick={applyUpdate}>
                  {t("reload")}
                </button>
              </p>
            )}
            {install.kind === "promptable" && (
              <p className="banner banner--install">
                <span>{t("installPrompt")}</span>
                <button type="button" className="banner__action" onClick={runInstall}>
                  {t("installApp")}
                </button>
              </p>
            )}
            {view.kind === "stats" && !searching ? (
              <StatsView />
            ) : (
              <>
                {!searching && (view.kind === "today" || view.kind === "all") && <Overview />}
                <TasksView view={view} query={query} composerRef={composerRef} onOpen={openTask} />
              </>
            )}
          </main>
        </div>
      </div>

      <nav className="tabbar" aria-label={t("navMain")}>
        {mobileTabs.map(({ view: v, icon: Icon, label, badge }) => (
          <a key={viewKey(v)} href={hrefFor(v)} aria-current={viewKey(v) === viewKey(view) ? "page" : undefined} className="tabbar__link">
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {badge > 0 && <i className="tabbar__badge">{badge}</i>}
          </a>
        ))}
        <button type="button" className="tabbar__link" onClick={() => setMenuOpen(true)}>
          <Menu aria-hidden="true" />
          <span>{t("navMore")}</span>
        </button>
      </nav>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} label={t("navMore")} variant="nav">
        <div className="panel panel--nav">
          <Button variant="ghost" size="icon" className="panel__x" aria-label={t("close")} onClick={() => setMenuOpen(false)}>
            <X aria-hidden="true" />
          </Button>
          {sidebar(() => setMenuOpen(false))}
        </div>
      </Modal>

      <Modal open={selectedId !== null} onClose={() => setSelectedId(null)} label={t("detailTitle")} variant="drawer">
        {selectedId !== null && (
          <TaskDetail
            key={selectedId}
            taskId={selectedId}
            onClose={() => setSelectedId(null)}
            onFocus={(id) => {
              timer.selectTask(id);
              setSelectedId(null);
              setFocusOpen(true);
            }}
          />
        )}
      </Modal>

      <FocusDialog open={focusOpen} onClose={() => setFocusOpen(false)} timer={timer} tasks={data.tasks.filter((x) => !x.done)} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        install={install}
        onInstall={runInstall}
        device={deviceAlerts}
      />
      <AlertsCenter open={alertsOpen} onClose={() => setAlertsOpen(false)} onOpenTask={(id) => setSelectedId(id)} />
      <ListDialog
        open={listDialog !== null}
        list={listDialog?.list ?? null}
        onClose={() => setListDialog(null)}
        onDeleted={() => (go({ kind: "today" }), show({ message: t("listDeleted"), actionLabel: t("undo"), onAction: undo }))}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        tasks={data.tasks}
        onOpenTask={openTask}
      />
      {confetti !== null && <Confetti seed={confetti} />}
    </CelebrateProvider>
  );
}

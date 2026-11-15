import { Bell, BellRing, Check, Download, FileJson, FileSpreadsheet, Upload, Vibrate, X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { exportCsv, exportJson, parseImport } from "@/core/transfer";
import type { Settings } from "@/core/model";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import type { InstallState } from "@/hooks/use-install";
import type { Permission } from "@/platform/runtime";
import { isTauriDesktop, pickBackupFile, saveBackupFile } from "@/platform/runtime";
import { cn } from "@/lib/cn";
import { useI18n, type Language } from "@/i18n";
import { useData, useDispatch } from "@/state/context";

export interface DeviceAlerts {
  permission: Permission;
  exactAlarm: Permission;
  native: boolean;
  request(): Promise<Permission>;
  requestExact(): Promise<Permission>;
  sendTest(): Promise<void>;
}

interface Props {
  open: boolean;
  onClose(): void;
  install: InstallState;
  onInstall(): void;
  device: DeviceAlerts;
}

/** Saves through the native share sheet / save dialog where there is one, otherwise a normal browser download. */
export const download = (filename: string, content: string, type: string) => void saveBackupFile(filename, content, type.split(";")[0]);

export const backupName = (ext: string) => `nawa-${new Date().toISOString().slice(0, 10)}.${ext}`;

export function SettingsDialog({ open, onClose, install, onInstall, device }: Props) {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const show = useToast();
  const settings = useData((d) => d.settings);
  const data = useData((d) => d);
  const file = useRef<HTMLInputElement>(null);
  const ids = { focus: useId(), brk: useId(), week: useId() };

  const set = (patch: Partial<Settings>) => dispatch({ type: "settings", patch });
  const clamp = (value: string, min: number, max: number, fallback: number) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };

  const importText = (text: string) => {
    const imported = parseImport(text, Date.now());
    if (!imported) return show({ message: t("importFailed") });
    // A backup may carry its own settings; the language/theme the user is looking at right now win.
    dispatch({ type: "replace", data: { ...imported, settings } });
    show({ message: t("importDone", { count: imported.tasks.length }) });
  };
  const onImport = async (files: FileList | null) => {
    const f = files?.[0];
    if (f) importText(await f.text());
  };
  const chooseFile = async () => {
    if (!isTauriDesktop()) return file.current?.click();
    try {
      const text = await pickBackupFile();
      if (text !== null) importText(text);
    } catch {
      show({ message: t("importFailed") });
    }
  };

  const systemOn = settings.systemAlerts && device.permission === "granted";

  return (
    <Modal open={open} onClose={onClose} label={t("settingsTitle")} variant="center">
      <div className="panel panel--scroll">
        <header className="panel__header">
          <h2>{t("settingsTitle")}</h2>
          <Button variant="ghost" size="icon" aria-label={t("close")} onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </header>

        <section className="settings__section">
          <h3>{t("settingsAppearance")}</h3>
          <div className="field">
            <span className="field__label">{t("settingsLanguage")}</span>
            <div className="seg" role="radiogroup" aria-label={t("settingsLanguage")}>
              {(["ar", "en"] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={settings.language === l}
                  className={cn("seg__btn", settings.language === l && "is-active")}
                  onClick={() => set({ language: l })}
                >
                  {t(`language_${l}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field__label">{t("settingsTheme")}</span>
            <div className="seg" role="radiogroup" aria-label={t("settingsTheme")}>
              {(["system", "light", "dark"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={settings.theme === v}
                  className={cn("seg__btn", settings.theme === v && "is-active")}
                  onClick={() => set({ theme: v })}
                >
                  {t(`theme${v[0]!.toUpperCase()}${v.slice(1)}` as "themeSystem")}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor={ids.week}>{t("settingsWeekStart")}</label>
            <select id={ids.week} className="input" value={settings.weekStart} onChange={(e) => set({ weekStart: Number(e.target.value) })}>
              {[6, 0, 1].map((d) => (
                <option key={d} value={d}>
                  {t(`weekday${d}` as "weekday0")}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="settings__section">
          <h3>
            <Bell className="inline-icon" aria-hidden="true" /> {t("settingsReminders")}
          </h3>

          <Toggle
            label={t("remindersInApp")}
            hint={t("remindersInAppBody")}
            on={settings.inAppAlerts}
            onChange={(v) => set({ inAppAlerts: v })}
          />

          {device.permission === "unsupported" ? (
            <p className="muted">{t("remindersUnsupported")}</p>
          ) : (
            <>
              <Toggle
                label={t("remindersSystem")}
                hint={device.native ? t("remindersSystemNative") : t("remindersSystemWeb")}
                on={systemOn}
                onChange={async (v) => {
                  if (!v) return set({ systemAlerts: false });
                  const result = device.permission === "granted" ? "granted" : await device.request();
                  if (result === "granted") set({ systemAlerts: true });
                }}
              />
              {device.permission === "denied" && <p className="danger">{t("remindersDenied")}</p>}
            </>
          )}

          {device.native && (
            <Toggle
              label={t("remindersVibrate")}
              icon={<Vibrate aria-hidden="true" />}
              on={settings.vibrate}
              onChange={(v) => set({ vibrate: v })}
            />
          )}

          {device.exactAlarm !== "not-required" && device.exactAlarm !== "unsupported" && device.permission !== "unsupported" && (
            <div className="field">
              <span className="field__label">{t("remindersExact")}</span>
              {device.exactAlarm === "granted" ? (
                <p className="muted">
                  <Check className="inline-icon" aria-hidden="true" /> {t("remindersExactOk")}
                </p>
              ) : (
                <>
                  <p className="muted">{t("remindersExactBody")}</p>
                  <Button variant="glass" size="sm" onClick={() => void device.requestExact()}>
                    {t("remindersExactOpen")}
                  </Button>
                </>
              )}
            </div>
          )}

          {systemOn && (
            <Button variant="glass" size="sm" onClick={() => void device.sendTest()}>
              <BellRing aria-hidden="true" /> {t("remindersTest")}
            </Button>
          )}
        </section>

        <section className="settings__section">
          <h3>{t("settingsFocus")}</h3>
          <div className="field-row">
            <div className="field">
              <label htmlFor={ids.focus}>{t("focusMinutes")}</label>
              <input
                id={ids.focus}
                type="number"
                inputMode="numeric"
                min={1}
                max={180}
                className="input"
                value={settings.focusMinutes}
                onChange={(e) => set({ focusMinutes: clamp(e.target.value, 1, 180, 25) })}
              />
            </div>
            <div className="field">
              <label htmlFor={ids.brk}>{t("breakMinutes")}</label>
              <input
                id={ids.brk}
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                className="input"
                value={settings.breakMinutes}
                onChange={(e) => set({ breakMinutes: clamp(e.target.value, 1, 60, 5) })}
              />
            </div>
          </div>
        </section>

        <section className="settings__section">
          <h3>{t("settingsData")}</h3>
          <p className="muted">{t("dataBody")}</p>
          <div className="settings__buttons">
            <Button variant="glass" size="sm" onClick={() => download(backupName("json"), exportJson(data), "application/json")}>
              <FileJson aria-hidden="true" /> {t("exportJson")}
            </Button>
            <Button variant="glass" size="sm" onClick={() => download(backupName("csv"), exportCsv(data), "text/csv;charset=utf-8")}>
              <FileSpreadsheet aria-hidden="true" /> {t("exportCsv")}
            </Button>
            <Button variant="glass" size="sm" onClick={() => void chooseFile()}>
              <Upload aria-hidden="true" /> {t("importData")}
            </Button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              data-testid="import-input"
              onChange={(e) => void onImport(e.target.files).then(() => (e.target.value = ""))}
            />
          </div>
        </section>

        <section className="settings__section">
          <h3>{t("settingsApp")}</h3>
          {install.kind === "installed" && <p className="muted">{t("installed")}</p>}
          {(install.kind === "promptable" || install.kind === "ios-manual") && (
            <>
              <Button variant="solid" size="sm" onClick={onInstall}>
                <Download aria-hidden="true" /> {t("installApp")}
              </Button>
              {install.kind === "ios-manual" && <p className="muted">{t("installIos")}</p>}
            </>
          )}
          <p className="muted">{t("shortcutsBody")}</p>
          <p className="muted">{t("about")}</p>
        </section>
      </div>
    </Modal>
  );
}

function Toggle({
  label,
  hint,
  icon,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  icon?: ReactNode;
  on: boolean;
  onChange(value: boolean): void | Promise<void>;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="toggle">
      <div className="toggle__text">
        <span id={id} className="toggle__label">
          {icon} {label}
        </span>
        {hint && <span className="muted toggle__hint">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={id}
        className={cn("switch", on && "is-on")}
        onClick={() => void onChange(!on)}
      >
        <span className="sr-only">{on ? t("stateOn") : t("stateOff")}</span>
        <i aria-hidden="true" />
      </button>
    </div>
  );
}

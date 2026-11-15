import { Bell, BellOff, Check, Clock, ExternalLink, Trash2, X } from "lucide-react";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { useClock } from "@/app/contexts";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/i18n";
import { useAlerts } from "@/state/alerts";
import { useData, useDispatch } from "@/state/context";

interface Props {
  open: boolean;
  onClose(): void;
  onOpenTask(taskId: string): void;
}

/** The notification centre: every reminder that fired, with one-tap open, snooze and dismiss. */
export function AlertsCenter({ open, onClose, onOpenTask }: Props) {
  const { t, locale } = useI18n();
  const { now } = useClock();
  const { items, unread, store } = useAlerts();
  const tasks = useData((d) => d.tasks);
  const exists = (id: string) => tasks.some((x) => x.id === id);
  const dispatch = useDispatch();
  const show = useToast();

  return (
    <Modal open={open} onClose={onClose} label={t("alertsTitle")} variant="drawer">
      <div className="alerts">
        <header className="detail__header">
          <h2 className="detail__heading">
            <Bell className="inline-icon" aria-hidden="true" /> {t("alertsTitle")}
          </h2>
          <Button variant="ghost" size="icon" aria-label={t("close")} onClick={onClose}>
            <X aria-hidden="true" />
          </Button>
        </header>

        {items.length > 0 && (
          <div className="alerts__tools">
            <Button variant="glass" size="sm" disabled={unread === 0} onClick={store.markAllRead}>
              <Check aria-hidden="true" /> {t("alertsMarkAll")}
            </Button>
            <Button variant="ghost" size="sm" onClick={store.clear}>
              <Trash2 aria-hidden="true" /> {t("alertsClear")}
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty">
            <div className="empty__art">
              <BellOff aria-hidden="true" />
            </div>
            <h3>{t("alertsEmpty")}</h3>
            <p>{t("alertsEmptyBody")}</p>
          </div>
        ) : (
          <ul className="alerts__list">
            {items.map((alert) => (
              <li key={alert.id} className={cn("alert", !alert.read && "alert--unread")}>
                <div className="alert__main">
                  <strong className="alert__body">{alert.body}</strong>
                  <span className="alert__meta">
                    {alert.title} · {formatDateTime(alert.at, now, locale, t)}
                  </span>
                </div>
                <div className="alert__actions">
                  {exists(alert.taskId) && (
                    <>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => {
                          store.markRead(alert.id);
                          onClose();
                          onOpenTask(alert.taskId);
                        }}
                      >
                        <ExternalLink aria-hidden="true" /> {t("alertsOpenTask")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          dispatch({ type: "snooze", id: alert.taskId, minutes: 10 });
                          store.dismiss(alert.id);
                          show({ message: t("alertsSnoozed") });
                        }}
                      >
                        <Clock aria-hidden="true" /> {t("alertsSnooze")}
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" aria-label={t("alertsDismiss")} onClick={() => store.dismiss(alert.id)}>
                    <X aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

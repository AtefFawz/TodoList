import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n";

export interface ToastInput {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** ms; 0 keeps it until dismissed. */
  duration?: number;
}
interface Toast extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);
export const useToast = () => {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useI18n();
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((x) => x.id !== id)), []);
  const show = useCallback((toast: ToastInput) => setToasts((all) => [...all.slice(-2), { ...toast, id: ++counter }]), []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} dismissLabel={t("dismiss")} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onDismiss, dismissLabel }: { toast: Toast; onDismiss(id: number): void; dismissLabel: string }) {
  const { id, duration = 6000 } = toast;
  useEffect(() => {
    if (duration === 0) return;
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.onAction?.();
            onDismiss(id);
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button type="button" className="toast__close" aria-label={dismissLabel} onClick={() => onDismiss(id)}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

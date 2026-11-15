import { useMemo } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { createTodoStore, type TodoStore } from "@/state/app";
import { AlertsProvider, createAlertsStore, type AlertsStore } from "@/state/alerts";
import { TodoProvider } from "@/state/context";
import { App } from "./app";

export function AppRoot({ store, alerts }: { store?: TodoStore; alerts?: AlertsStore }) {
  const resolved = useMemo(() => store ?? createTodoStore(), [store]);
  const resolvedAlerts = useMemo(() => alerts ?? createAlertsStore(), [alerts]);
  return (
    <ErrorBoundary
      fallback={(reset) => (
        <div className="crash" role="alert">
          <h1>Something went wrong · حدث خطأ ما</h1>
          <p>Your tasks are safe on this device. · مهامك بأمان على هذا الجهاز.</p>
          <button type="button" className="btn btn--solid btn--md" onClick={() => (reset(), window.location.reload())}>
            Reload · إعادة التحميل
          </button>
        </div>
      )}
    >
      <TodoProvider store={resolved}>
        <AlertsProvider store={resolvedAlerts}>
          <App />
        </AlertsProvider>
      </TodoProvider>
    </ErrorBoundary>
  );
}

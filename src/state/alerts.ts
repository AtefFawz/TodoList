import { z } from "zod";
import { createPersistedStore, useStore, type Store } from "./store";
import { createContext, createElement, useContext, type ReactNode } from "react";

export const MAX_ALERTS = 80;

export const alertSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string(),
  body: z.string(),
  at: z.number(),
  read: z.boolean().default(false),
});
export const alertsSchema = z.object({ version: z.literal(1), items: z.array(alertSchema).max(MAX_ALERTS * 2) });

export type Alert = z.infer<typeof alertSchema>;
export type AlertsState = z.infer<typeof alertsSchema>;

/** The in-app notification history ("notification centre"). It is deliberately outside the undo history. */
export interface AlertsStore {
  state: Store<AlertsState>;
  push(alert: Omit<Alert, "read">): void;
  markRead(id: string): void;
  markTaskRead(taskId: string): void;
  markAllRead(): void;
  dismiss(id: string): void;
  clear(): void;
}

export function createAlertsStore(storage?: Parameters<typeof createPersistedStore>[0]["storage"]): AlertsStore {
  const state = createPersistedStore({
    key: "nawa:alerts:v1",
    schema: alertsSchema,
    defaults: (): AlertsState => ({ version: 1, items: [] }),
    ...(storage !== undefined ? { storage } : {}),
  });
  const update = (fn: (items: Alert[]) => Alert[]) => state.set((s) => ({ ...s, items: fn(s.items).slice(0, MAX_ALERTS) }));
  return {
    state,
    push: (alert) => update((items) => (items.some((i) => i.id === alert.id) ? items : [{ ...alert, read: false }, ...items])),
    markRead: (id) => update((items) => items.map((i) => (i.id === id ? { ...i, read: true } : i))),
    markTaskRead: (taskId) => update((items) => items.map((i) => (i.taskId === taskId ? { ...i, read: true } : i))),
    markAllRead: () => update((items) => items.map((i) => ({ ...i, read: true }))),
    dismiss: (id) => update((items) => items.filter((i) => i.id !== id)),
    clear: () => update(() => []),
  };
}

const Ctx = createContext<AlertsStore | null>(null);

export const AlertsProvider = ({ store, children }: { store: AlertsStore; children: ReactNode }) =>
  createElement(Ctx, { value: store }, children);

export function useAlertsStore(): AlertsStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useAlerts must be used inside <AlertsProvider>");
  return store;
}

export function useAlerts() {
  const store = useAlertsStore();
  const items = useStore(store.state, (s) => s.items);
  return { items, unread: items.filter((i) => !i.read).length, store };
}

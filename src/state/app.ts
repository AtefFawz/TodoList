import { reduce, type Action, type Context } from "@/core/actions";
import { toDayKey } from "@/core/dates";
import { migrateLegacyTasks, migrateNawaV5 } from "@/core/legacy";
import { dataSchema, seededData, type Data } from "@/core/model";
import { createPersistedStore, createStore, type Store } from "./store";

export const STORAGE_KEY = "nawa:v3";
const LEGACY_KEY = "data";
const NAWA_V5 = {
  tasks: "nawa.tasks.v2",
  theme: "nawa.theme",
  alerts: "nawa.notifications.settings.v1",
  delivered: "nawa.reminders.delivered.v1",
  seen: "nawa:reminded",
} as const;
const HISTORY_LIMIT = 50;

/** Actions that should not be undoable: preference changes and focus bookkeeping are not "mistakes". */
const NOT_UNDOABLE: ReadonlySet<Action["type"]> = new Set(["settings", "focus", "replace", "updateList", "addList"]);

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const systemContext = (): Context => {
  const now = Date.now();
  return { now, today: toDayKey(new Date(now)), uid };
};

const readJson = (storage: Pick<Storage, "getItem">, key: string): unknown => {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
};

/** Nawa 5.x kept tasks, theme and alert preferences under separate keys; fold them into the single v3 document. */
export function migrateFromEarlierVersions(storage: Pick<Storage, "getItem">, now: number): Data | undefined {
  const v5 = migrateNawaV5(readJson(storage, NAWA_V5.tasks), now);
  const v1 = v5 ?? migrateLegacyTasks(readJson(storage, LEGACY_KEY), now);
  if (!v1) return undefined;
  if (!v5) return { ...v1, lists: seededData("ar", uid).lists.slice(0, 1), settings: { ...v1.settings } };

  const alerts = readJson(storage, NAWA_V5.alerts) as Record<string, unknown> | undefined;
  let theme: "light" | "dark" | undefined;
  try {
    const stored = storage.getItem(NAWA_V5.theme);
    theme = stored === "dark" ? "dark" : stored === "light" ? "light" : undefined;
  } catch {
    theme = undefined;
  }
  return {
    ...v5,
    settings: {
      ...v5.settings,
      ...(theme ? { theme } : {}),
      inAppAlerts: alerts?.["inAppEnabled"] !== false,
      systemAlerts: alerts?.["systemEnabled"] === true,
      vibrate: alerts?.["vibrate"] !== false,
    },
  };
}

export interface History {
  past: Data[];
  future: Data[];
}

export interface TodoStore {
  data: Store<Data>;
  history: Store<History>;
  dispatch(action: Action, context?: Context): void;
  undo(): boolean;
  redo(): boolean;
}

interface Options {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  context?: () => Context;
}

export function createTodoStore(options: Options = {}): TodoStore {
  const context = options.context ?? systemContext;
  const data = createPersistedStore({
    key: STORAGE_KEY,
    schema: dataSchema,
    defaults: () => seededData(typeof navigator !== "undefined" && /^en/i.test(navigator.language) ? "en" : "ar", uid),
    ...(options.storage !== undefined ? { storage: options.storage } : {}),
    // First launch after upgrading: carry tasks over once from Nawa 5.x, or from the original v1 app.
    migrate: (storage) => migrateFromEarlierVersions(storage, Date.now()),
  });
  const history = createStore<History>({ past: [], future: [] });

  return {
    data,
    history,
    dispatch(action, ctx = context()) {
      const before = data.get();
      const after = reduce(before, action, ctx);
      if (after === before) return;
      data.set(after);
      if (!NOT_UNDOABLE.has(action.type)) {
        history.set(({ past }) => ({ past: [...past, before].slice(-HISTORY_LIMIT), future: [] }));
      }
    },
    undo() {
      const { past, future } = history.get();
      const previous = past.at(-1);
      if (!previous) return false;
      const current = data.get();
      // Keep preferences as they are now: undo reverts task changes, never the language or theme.
      data.set({ ...previous, settings: current.settings });
      history.set({ past: past.slice(0, -1), future: [current, ...future] });
      return true;
    },
    redo() {
      const { past, future } = history.get();
      const next = future[0];
      if (!next) return false;
      const current = data.get();
      data.set({ ...next, settings: current.settings });
      history.set({ past: [...past, current], future: future.slice(1) });
      return true;
    },
  };
}

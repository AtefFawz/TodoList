import { createContext, useContext, type ReactNode } from "react";
import type { Action } from "@/core/actions";
import type { Data } from "@/core/model";
import { useStore } from "./store";
import type { TodoStore } from "./app";

const Ctx = createContext<TodoStore | null>(null);

export function TodoProvider({ store, children }: { store: TodoStore; children: ReactNode }) {
  return <Ctx value={store}>{children}</Ctx>;
}

function useTodoStore(): TodoStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTodo* must be used inside <TodoProvider>");
  return store;
}

export const useData = <S,>(selector: (data: Data) => S): S => useStore(useTodoStore().data, selector);
export const useDispatch = (): ((action: Action) => void) => useTodoStore().dispatch;

export function useHistory() {
  const store = useTodoStore();
  const { past, future } = useStore(store.history, (h) => h);
  return { canUndo: past.length > 0, canRedo: future.length > 0, undo: store.undo, redo: store.redo };
}

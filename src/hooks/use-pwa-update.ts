import { useCallback, useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/** Registers the service worker and reports when a new version is waiting. */
export function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const updater = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    updater.current = registerSW({ onNeedRefresh: () => setUpdateReady(true) });
  }, []);

  const applyUpdate = useCallback(() => void updater.current?.(true), []);
  return { updateReady, applyUpdate };
}

/** Native builds (Capacitor / Tauri) ship their assets inside the app, so there is no service worker to update. */
export function registerSW(_options?: { onNeedRefresh?: () => void }): (reload?: boolean) => Promise<void> {
  return () => Promise.resolve();
}

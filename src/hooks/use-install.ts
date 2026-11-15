import { useCallback, useEffect, useState } from "react";

/** Chromium's non-standard install event. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  /** Already running as an installed app. */
  | { kind: "installed" }
  /** The browser offered a native install prompt. */
  | { kind: "promptable"; install(): Promise<void> }
  /** iOS Safari: no prompt API, the user must use Share → Add to Home Screen. */
  | { kind: "ios-manual" }
  | { kind: "unavailable" };

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function isIosSafari(userAgent = navigator.userAgent): boolean {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
}

/** Tracks whether (and how) the app can be installed like a native app. */
export function useInstall(): InstallState {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // we show our own button instead of the mini-infobar
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null); // the event can only be used once
  }, [event]);

  if (installed) return { kind: "installed" };
  if (event) return { kind: "promptable", install };
  if (isIosSafari()) return { kind: "ios-manual" };
  return { kind: "unavailable" };
}

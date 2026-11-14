import { useCallback, useEffect, useState } from "react";
import {
  getRuntimePlatform,
  isCapacitorNative,
  isTauriDesktop,
} from "../platform/nativeRuntime";

function isStandaloneMode() {
  return (
    (typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    (typeof navigator !== "undefined" && navigator.standalone === true)
  );
}

export default function usePwa() {
  const native = isCapacitorNative() || isTauriDesktop();
  const platform = getRuntimePlatform();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(
    () => native || isStandaloneMode(),
  );
  const [iosInstallHint, setIosInstallHint] = useState(false);

  useEffect(() => {
    if (native) {
      setInstalled(true);
      setIosInstallHint(false);
      return undefined;
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    const userAgent = window.navigator.userAgent || "";
    const isAppleMobile =
      /iphone|ipad|ipod/i.test(userAgent) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    setIosInstallHint(isAppleMobile && !isStandaloneMode());

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [native]);

  const install = useCallback(async () => {
    if (native || !installPrompt) return "unavailable";
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
      return choice?.outcome || "dismissed";
    } catch (error) {
      console.warn("تعذّر بدء تثبيت التطبيق:", error);
      return "error";
    }
  }, [installPrompt, native]);

  return {
    canInstall: !native && Boolean(installPrompt),
    installed,
    iosInstallHint,
    install,
    native,
    platform,
  };
}

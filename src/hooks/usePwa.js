import { useCallback, useEffect, useState } from "react";

function isStandaloneMode() {
  return (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches)
    || (typeof navigator !== "undefined" && navigator.standalone === true);
}

export default function usePwa() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandaloneMode);
  const [iosInstallHint, setIosInstallHint] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    const userAgent = window.navigator.userAgent || "";
    const isAppleMobile = /iphone|ipad|ipod/i.test(userAgent)
      || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isIos = isAppleMobile && !window.MSStream;
    setIosInstallHint(isIos && !isStandaloneMode());

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return "unavailable";
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
  }, [installPrompt]);

  return { canInstall: Boolean(installPrompt), installed, iosInstallHint, install };
}

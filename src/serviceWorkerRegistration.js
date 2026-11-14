import { isCapacitorNative, isTauriDesktop } from "./platform/nativeRuntime";

const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(
  window.location.hostname,
);

export function registerServiceWorker() {
  if (
    isCapacitorNative() ||
    isTauriDesktop() ||
    !import.meta.env.PROD ||
    !("serviceWorker" in navigator)
  )
    return;

  try {
    const appBaseUrl = new URL(
      import.meta.env.BASE_URL || "/",
      window.location.href,
    );
    if (appBaseUrl.origin !== window.location.origin) return;

    const serviceWorkerUrl = new URL("service-worker.js", appBaseUrl).href;
    const scope = appBaseUrl.pathname.endsWith("/")
      ? appBaseUrl.pathname
      : `${appBaseUrl.pathname}/`;

    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker
          .register(serviceWorkerUrl, { scope })
          .then((registration) => {
            registration.addEventListener("updatefound", () => {
              const installingWorker = registration.installing;
              if (!installingWorker) return;
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  window.dispatchEvent(new CustomEvent("nawa-app-update"));
                }
              });
            });
          })
          .catch((error) => {
            if (isLocalhost)
              console.info(
                "Service worker is unavailable in this local environment:",
                error,
              );
            else console.warn("Service worker registration failed:", error);
          });
      },
      { once: true },
    );
  } catch (error) {
    console.warn("تعذّر إعداد Service Worker:", error);
  }
}

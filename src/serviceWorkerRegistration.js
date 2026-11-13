const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]"
);

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

  const publicUrl = new URL(process.env.PUBLIC_URL || "/", window.location.href);
  if (publicUrl.origin !== window.location.origin) return;

  window.addEventListener("load", () => {
    const serviceWorkerUrl = `${publicUrl.pathname.replace(/\/$/, "")}/service-worker.js`;
    navigator.serviceWorker.register(serviceWorkerUrl, { scope: `${publicUrl.pathname.replace(/\/$/, "")}/` })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("nawa-app-update"));
            }
          });
        });
      })
      .catch((error) => {
        if (isLocalhost) console.info("Service worker is unavailable in this local environment:", error);
        else console.warn("Service worker registration failed:", error);
      });
  });
}

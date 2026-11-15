import "@fontsource-variable/alexandria";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRoot } from "@/app/app-root";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);

// Keep the splash for a short, deliberate beat, then fade it out and remove it.
const splash = document.getElementById("splash");
if (splash) {
  const minimum = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
  window.setTimeout(() => {
    splash.classList.add("is-done");
    splash.addEventListener("transitionend", () => splash.remove(), { once: true });
    window.setTimeout(() => splash.remove(), 900);
  }, minimum);
}

import { useEffect } from "react";
import { directionFor, type Language } from "@/i18n";
import type { Settings } from "@/core/model";

/** Reflect language, direction and theme onto <html>. `system` follows the OS and updates live. */
export function useDocumentSettings(language: Language, theme: Settings["theme"], title: string) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = directionFor(language);
  }, [language]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "light" ? "#f5f6fa" : "#12111d");
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

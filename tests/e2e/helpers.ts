import type { Page } from "@playwright/test";

/** 2026-11-14 is a Saturday. The clock is frozen so "today" and relative dates are deterministic. */
export const NOW = "2026-11-14T10:00:00";

export async function boot(page: Page, options: { language?: "ar" | "en"; theme?: "light" | "dark"; seed?: unknown; path?: string } = {}) {
  const { language = "en", theme = "light", seed, path = "/" } = options;
  await page.addInitScript(
    ([lang, th, custom]) => {
      if (localStorage.getItem("__seeded")) return; // reloads must keep user changes
      localStorage.setItem("__seeded", "1");
      if (custom) {
        localStorage.setItem("nawa:v3", JSON.stringify(custom));
        return;
      }
      localStorage.setItem(
        "nawa:v3",
        JSON.stringify({
          version: 3,
          tasks: [],
          lists: [{ id: "inbox", name: "", color: "#6d4aff", emoji: "" }],
          settings: { language: lang, theme: th },
        }),
      );
    },
    [language, theme, seed ?? null] as const,
  );
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(path);
  await page.locator("#splash").waitFor({ state: "detached" });
}

export async function addTask(page: Page, text: string) {
  await page.getByRole("searchbox", { name: "New task" }).or(page.locator(".composer__input")).first().fill(text);
  await page.keyboard.press("Enter");
}

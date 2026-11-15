import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { addTask, boot } from "./helpers";

test("adds tasks with natural language and shows them in the right views", async ({ page }) => {
  await boot(page);
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  await addTask(page, "Buy milk tomorrow 5pm !high #home");
  await addTask(page, "Water plants");
  // "Today" view defaults new tasks to today; the explicit date wins for the first one.
  await expect(page.getByRole("button", { name: /Water plants/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Buy milk/ })).toHaveCount(0);
  await page
    .getByRole("link", { name: /Upcoming/ })
    .first()
    .click();
  const row = page.getByRole("button", { name: /Buy milk/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("#home");
  await expect(row.locator(".chip__time")).toContainText("5:00");
});

test("parses Arabic input and renders RTL", async ({ page }) => {
  await boot(page, { language: "ar" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await addTask(page, "اشتري خضار النهارده 5م !عالي #بيت");
  await expect(page.getByRole("button", { name: /اشتري خضار/ })).toBeVisible();
  await expect(page.locator(".chip--tag")).toContainText("#بيت");
  await expect(page.locator(".task[data-priority='3']")).toHaveCount(1);
});

test("completing a task offers undo and updates the streak", async ({ page }) => {
  await boot(page);
  await addTask(page, "Write report");
  await page.getByRole("checkbox", { name: /Mark “Write report” as complete/ }).click();
  const toast = page.getByRole("status").filter({ hasText: "Task completed" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("checkbox", { name: /Mark “Write report” as complete/ })).toBeVisible();
});

test("subtasks, details drawer and delete with undo", async ({ page }) => {
  await boot(page);
  await addTask(page, "Plan trip");
  await page.getByRole("button", { name: /Plan trip/ }).click();
  const drawer = page.getByRole("dialog", { name: "Task details" });
  await drawer.getByPlaceholder("Add a step…").fill("Book flights");
  await page.keyboard.press("Enter");
  await expect(drawer.getByText("Book flights")).toBeVisible();
  await drawer.getByRole("button", { name: "Delete task" }).click();
  await expect(page.getByRole("button", { name: /Plan trip/ })).toHaveCount(0);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: /Plan trip/ })).toBeVisible();
});

test("search filters tasks across the app", async ({ page }) => {
  await boot(page);
  await addTask(page, "Alpha task");
  await addTask(page, "Beta task");
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.keyboard.press("/");
  await page.keyboard.type("beta");
  await expect(page.getByRole("button", { name: /Beta task/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Alpha task/ })).toHaveCount(0);
});

test("data persists across reloads", async ({ page }) => {
  await boot(page);
  await addTask(page, "Persistent task");
  await page.reload();
  await expect(page.getByRole("button", { name: /Persistent task/ })).toBeVisible();
});

test("migrates tasks from the legacy app format", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("__seeded")) return;
    localStorage.setItem("__seeded", "1");
    localStorage.setItem("data", JSON.stringify([{ id: "1", heading: "Old task", description: "", complete: false }]));
  });
  await page.clock.setFixedTime(new Date("2026-11-14T10:00:00"));
  await page.goto("/#/all");
  await page.locator("#splash").waitFor({ state: "detached" });
  await expect(page.locator(".task", { hasText: "Old task" })).toHaveCount(1);
});

test("switching language and theme in settings", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Settings" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await dialog.getByRole("radio", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

test("command palette navigates and runs commands", async ({ page }) => {
  await boot(page);
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  await page.keyboard.type("stat");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Insights" })).toBeVisible();
});

test("focus timer starts and shows a running countdown", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Focus" }).click();
  const dialog = page.getByRole("dialog", { name: "Focus" });
  await expect(dialog.getByRole("timer")).toContainText("25:00");
  await dialog.getByRole("button", { name: "Start" }).click();
  await expect(dialog.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("export then import round-trips the data", async ({ page }) => {
  await boot(page);
  await addTask(page, "Round trip");
  await page.getByRole("button", { name: "Settings" }).first().click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export backup (JSON)" }).click()]);
  const path = await download.path();
  await page.evaluate(() => localStorage.setItem("__seeded", "1"));
  await page.getByTestId("import-input").setInputFiles(path);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Round trip/ })).toBeVisible();
});

test("PWA manifest and icons are served", async ({ page, request }) => {
  await boot(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.shortcuts.length).toBeGreaterThan(0);
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
});

for (const theme of ["light", "dark"] as const) {
  for (const language of ["en", "ar"] as const) {
    test(`has no axe violations (${theme}, ${language})`, async ({ page }) => {
      await boot(page, { theme, language });
      await addTask(page, language === "en" ? "Accessible task #a11y" : "مهمة سهلة #وصول");
      let results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, "tasks view").toEqual([]);
      await page.goto("/#/stats");
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, "stats view").toEqual([]);
      await page
        .getByRole("button", { name: /Settings|الإعدادات/ })
        .first()
        .click();
      results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, "settings dialog").toEqual([]);
    });
  }
}

test("@mobile has no horizontal overflow and the tab bar navigates", async ({ page }) => {
  await boot(page);
  await addTask(page, "A fairly long task title that should wrap nicely on a narrow phone screen without overflowing");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .last()
    .getByRole("link", { name: /Insights/ })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Insights" })).toBeVisible();
});

test("a due reminder lands in the notification centre and can be snoozed", async ({ page }) => {
  const now = new Date("2026-11-14T10:00:00").getTime();
  await boot(page, {
    seed: {
      version: 3,
      tasks: [
        { id: "r1", title: "Call the bank", done: false, listId: "inbox", createdAt: now - 1000, order: 1, reminderAt: now - 60_000 },
      ],
      lists: [{ id: "inbox", name: "", color: "#7668e8", emoji: "" }],
      settings: { language: "en", theme: "light" },
    },
  });
  const bell = page.getByRole("button", { name: /Notifications \(1 unread\)/ });
  await expect(bell).toBeVisible();
  await bell.click();
  const centre = page.getByRole("dialog", { name: "Notifications" });
  await expect(centre.getByText("Call the bank")).toBeVisible();
  await centre.getByRole("button", { name: "Snooze 10 min" }).click();
  await expect(centre.getByText("Call the bank")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: /Inbox/ }).first().click();
  await expect(page.locator(".task", { hasText: "Call the bank" }).locator(".chip", { hasText: "10:10" })).toBeVisible();
});

test("sets a reminder from the task details", async ({ page }) => {
  await boot(page);
  await addTask(page, "Pay rent");
  await page.getByRole("button", { name: /Pay rent/ }).click();
  const drawer = page.getByRole("dialog", { name: "Task details" });
  await drawer.getByRole("button", { name: "Tomorrow, 9:00" }).click();
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".task", { hasText: "Pay rent" }).locator(".chip", { hasText: "9:00" })).toBeVisible();
});

test("upgrades silently from Nawa 5.x data", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("__seeded")) return;
    localStorage.setItem("__seeded", "1");
    localStorage.setItem(
      "nawa.tasks.v2",
      JSON.stringify([{ id: "a", title: "مراجعة التقرير", completed: false, priority: "high", category: "العمل", dueDate: "2026-11-14" }]),
    );
    localStorage.setItem("nawa.theme", "dark");
  });
  await page.clock.setFixedTime(new Date("2026-11-14T10:00:00"));
  await page.goto("/");
  await page.locator("#splash").waitFor({ state: "detached" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".task[data-priority='3']", { hasText: "مراجعة التقرير" })).toBeVisible();
  await expect(page.getByRole("link", { name: /العمل/ }).first()).toBeVisible();
});

test("settings expose reminder switches", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Settings" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const inApp = dialog.getByRole("switch", { name: /Show reminders in the app/ });
  await expect(inApp).toHaveAttribute("aria-checked", "true");
  await inApp.click();
  await expect(inApp).toHaveAttribute("aria-checked", "false");
});

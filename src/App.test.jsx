import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  window.localStorage.clear();
});

test("يعرض لوحة نَواة باللغة العربية", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /أهلاً بك في مساحة إنجازك/i }),
  ).toBeInTheDocument();
  expect(screen.getByText("إجمالي المهام")).toBeInTheDocument();
});

test("يفتح نموذج إضافة مهمة جديدة", () => {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: /مهمة جديدة/i })[0]);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText(/عنوان المهمة/i)).toBeInTheDocument();
});

test("sidebar navigation changes the active task view", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /مهام اليوم/ }));

  expect(
    screen.getByRole("heading", { name: /مهام اليوم/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /مهام اليوم/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("sidebar category selection remains active and updates the page title", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "العمل" }));

  expect(screen.getByRole("heading", { name: /العمل/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "العمل" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("changing from a category back to a view clears the category filter", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "العمل" }));
  fireEvent.click(screen.getByRole("button", { name: /كل المهام/ }));

  expect(
    screen.getByRole("heading", { name: /كل المهام/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "العمل" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("choosing a sidebar category filters the actual task list", () => {
  const now = new Date().toISOString();
  window.localStorage.setItem(
    "nawa.tasks.v2",
    JSON.stringify([
      {
        id: "work-1",
        title: "تسليم التقرير",
        category: "العمل",
        priority: "high",
        dueDate: "",
        reminderAt: "",
        completed: false,
        createdAt: now,
      },
      {
        id: "personal-1",
        title: "شراء الاحتياجات",
        category: "شخصي",
        priority: "medium",
        dueDate: "",
        reminderAt: "",
        completed: false,
        createdAt: now,
      },
    ]),
  );

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "العمل" }));

  expect(screen.getByText("تسليم التقرير")).toBeInTheDocument();
  expect(screen.queryByText("شراء الاحتياجات")).not.toBeInTheDocument();
});

test("sidebar settings control opens the settings dialog", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "الإعدادات" }));

  expect(screen.getByRole("dialog", { name: /الإعدادات/ })).toBeInTheDocument();
});

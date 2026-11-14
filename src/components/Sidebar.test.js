import { fireEvent, render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

const baseProps = {
  view: "all",
  onNavigate: jest.fn(),
  stats: { total: 4, dueToday: 1, overdue: 2, completed: 1 },
  categories: [
    { label: "العمل", color: "#7668e8" },
    { label: "شخصي", color: "#e3a34c" },
  ],
  selectedCategory: "",
  onSelectCategory: jest.fn(),
  onAdd: jest.fn(),
  onExport: jest.fn(),
  onImport: jest.fn(),
  onSettings: jest.fn(),
  mobileOpen: false,
  onClose: jest.fn(),
};

beforeEach(() => {
  Object.values(baseProps).forEach((value) => {
    if (typeof value === "function") value.mockClear();
  });
});

test("all primary sidebar destinations call the matching navigation handler", () => {
  render(<Sidebar {...baseProps} />);

  fireEvent.click(screen.getByRole("button", { name: /مهام اليوم/ }));
  expect(baseProps.onNavigate).toHaveBeenCalledWith("today");

  fireEvent.click(screen.getByRole("button", { name: /القادمة/ }));
  expect(baseProps.onNavigate).toHaveBeenCalledWith("upcoming");

  fireEvent.click(screen.getByRole("button", { name: /متأخرة/ }));
  expect(baseProps.onNavigate).toHaveBeenCalledWith("overdue");

  fireEvent.click(screen.getByRole("button", { name: /مكتملة/ }));
  expect(baseProps.onNavigate).toHaveBeenCalledWith("completed");
});

test("category buttons select a category without also triggering route navigation", () => {
  render(<Sidebar {...baseProps} />);

  fireEvent.click(screen.getByRole("button", { name: "العمل" }));

  expect(baseProps.onSelectCategory).toHaveBeenCalledWith("العمل");
  expect(baseProps.onNavigate).not.toHaveBeenCalled();
});

test("sidebar utility actions are connected and close the mobile drawer", () => {
  render(<Sidebar {...baseProps} mobileOpen />);

  fireEvent.click(screen.getByRole("button", { name: /مهمة جديدة/ }));
  expect(baseProps.onAdd).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: /تصدير نسخة احتياطية/ }));
  expect(baseProps.onExport).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: /استيراد مهام/ }));
  expect(baseProps.onImport).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: /الإعدادات/ }));
  expect(baseProps.onSettings).toHaveBeenCalledTimes(1);

  expect(baseProps.onClose).toHaveBeenCalledTimes(4);
});

test("the active destination and selected category expose accessible state", () => {
  render(<Sidebar {...baseProps} view="today" selectedCategory="العمل" />);

  expect(
    screen.getByRole("button", { name: /مهام اليوم/ }),
  ).not.toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "العمل" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

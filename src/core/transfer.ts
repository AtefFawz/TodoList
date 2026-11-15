import { dataSchema, type Data } from "./model";
import { migrateNawaV5 } from "./legacy";

export const exportJson = (data: Data): string => JSON.stringify(data, null, 2);

/** Accepts a current export, a Nawa 5 task array or the original v1 array. Returns null for anything else, never throws. */
export function parseImport(text: string, now: number): Data | null {
  try {
    const raw: unknown = JSON.parse(text);
    const parsed = dataSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    return migrateNawaV5(raw, now);
  } catch {
    return null;
  }
}

const csvCell = (value: string | number | boolean | null): string => {
  const s = value === null ? "" : String(value);
  // Prefix formula-looking cells so spreadsheets do not execute them (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function exportCsv(data: Data): string {
  const listName = new Map(data.lists.map((l) => [l.id, l.name]));
  const header = ["title", "notes", "done", "list", "priority", "due", "time", "reminder", "tags", "repeat", "subtasks"];
  const rows = data.tasks.map((t) =>
    [
      t.title,
      t.notes,
      t.done,
      listName.get(t.listId) ?? "",
      t.priority,
      t.due,
      t.time,
      t.reminderAt === null ? null : new Date(t.reminderAt).toISOString(),
      t.tags.join(" "),
      t.repeat,
      t.subtasks.map((s) => `${s.done ? "[x]" : "[ ]"} ${s.title}`).join(" | "),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

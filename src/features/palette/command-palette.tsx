import { Command as CommandIcon, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { fuzzyFilter } from "@/core/fuzzy";
import type { Task } from "@/core/model";
import { matchesQuery } from "@/core/selectors";
import { Modal } from "@/components/modal";
import { useI18n } from "@/i18n";

export interface PaletteCommand {
  id: string;
  label: string;
  icon?: ReactNode;
  keywords?: string;
  run(): void;
}

interface Props {
  open: boolean;
  onClose(): void;
  commands: readonly PaletteCommand[];
  tasks: readonly Task[];
  onOpenTask(task: Task): void;
}

type Item = { kind: "task"; key: string; task: Task } | { kind: "command"; key: string; command: PaletteCommand };

export function CommandPalette({ open, onClose, commands, tasks, onOpenTask }: Props) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} label={t("paletteLabel")} variant="palette">
      <Palette onClose={onClose} commands={commands} tasks={tasks} onOpenTask={onOpenTask} />
    </Modal>
  );
}

function Palette({ onClose, commands, tasks, onOpenTask }: Omit<Props, "open">) {
  const { t } = useI18n();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => input.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const matchedCommands = fuzzyFilter(commands, q, (c) => `${c.label} ${c.keywords ?? ""}`).map<Item>((command) => ({
      kind: "command",
      key: `c-${command.id}`,
      command,
    }));
    const matchedTasks = tasks
      .filter((task) => !task.done && (q ? matchesQuery(task, q) : false))
      .slice(0, 8)
      .map<Item>((task) => ({ kind: "task", key: `t-${task.id}`, task }));
    return [...matchedTasks, ...matchedCommands];
  }, [query, commands, tasks]);

  const active = Math.min(cursor, Math.max(0, items.length - 1));
  const choose = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    if (item.kind === "task") onOpenTask(item.task);
    else item.command.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((active + 1) % Math.max(1, items.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((active - 1 + items.length) % Math.max(1, items.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(items[active]);
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  return (
    <div className="palette">
      <div className="palette__search">
        <Search aria-hidden="true" />
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("paletteHint")}
          aria-label={t("paletteLabel")}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label={t("paletteLabel")} className="palette__list">
        {items.map((item, index) => (
          <li
            key={item.key}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? "palette__item is-active" : "palette__item"}
            onPointerMove={() => setCursor(index)}
            onClick={() => choose(item)}
          >
            {item.kind === "command" ? (
              (item.command.icon ?? <CommandIcon aria-hidden="true" />)
            ) : (
              <span className="palette__dot" aria-hidden="true" />
            )}
            <span className="palette__label">{item.kind === "command" ? item.command.label : item.task.title}</span>
            <span className="palette__tag">{t(item.kind === "command" ? "paletteCommands" : "paletteTasks")}</span>
          </li>
        ))}
        {items.length === 0 && <li className="palette__empty">{t("paletteNoResults")}</li>}
      </ul>
    </div>
  );
}

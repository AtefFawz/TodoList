import { Trash2, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { LIST_COLORS, type TaskList } from "@/core/model";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import { useDispatch } from "@/state/context";

interface Props {
  open: boolean;
  /** Null creates a new list. */
  list: TaskList | null;
  onClose(): void;
  onDeleted(): void;
}

export function ListDialog({ open, list, onClose, onDeleted }: Props) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} label={t(list ? "renameList" : "newList")} variant="center">
      <ListForm key={list?.id ?? "new"} list={list} onClose={onClose} onDeleted={onDeleted} t={t} />
    </Modal>
  );
}

function ListForm({
  list,
  onClose,
  onDeleted,
  t,
}: {
  list: TaskList | null;
  onClose(): void;
  onDeleted(): void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const dispatch = useDispatch();
  const nameId = useId();
  const [name, setName] = useState(list?.name ?? "");
  const [color, setColor] = useState<string>(list?.color ?? LIST_COLORS[1]);
  const [emoji, setEmoji] = useState(list?.emoji ?? "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (list) dispatch({ type: "updateList", id: list.id, patch: { name: name.trim(), color, emoji: emoji.trim() } });
    else dispatch({ type: "addList", name, color, emoji: emoji.trim() });
    onClose();
  };

  return (
    <form className="panel" onSubmit={submit}>
      <header className="panel__header">
        <h2>{t(list ? "renameList" : "newList")}</h2>
        <Button variant="ghost" size="icon" aria-label={t("close")} onClick={onClose}>
          <X aria-hidden="true" />
        </Button>
      </header>
      <div className="field">
        <label htmlFor={nameId}>{t("listName")}</label>
        <div className="emoji-name">
          <input
            className="input emoji-name__emoji"
            value={emoji}
            maxLength={2}
            aria-label="Emoji"
            placeholder="🙂"
            onChange={(e) => setEmoji(e.target.value)}
          />
          <input id={nameId} className="input" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <span className="field__label">{t("listColor")}</span>
        <div className="swatches" role="radiogroup" aria-label={t("listColor")}>
          {LIST_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={c}
              className={cn("swatch", c === color && "is-active")}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <footer className="panel__footer">
        {list && (
          <Button
            variant="glass"
            className="btn--danger"
            onClick={() => {
              dispatch({ type: "deleteList", id: list.id });
              onDeleted();
              onClose();
            }}
          >
            <Trash2 aria-hidden="true" /> {t("deleteList")}
          </Button>
        )}
        <span className="spacer" />
        <Button variant="glass" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit" variant="solid" disabled={!name.trim()}>
          {t("save")}
        </Button>
      </footer>
      {list && <p className="muted">{t("deleteListBody", { name: list.name })}</p>}
    </form>
  );
}

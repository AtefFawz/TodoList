import { CalendarDays, Flag, Hash, Plus, Repeat, Tag } from "lucide-react";
import { useMemo, useState, type FormEvent, type Ref } from "react";
import type { NewTask } from "@/core/actions";
import { INBOX_ID, type TaskList } from "@/core/model";
import { normalize, parseQuickAdd } from "@/core/quick-add";
import type { View } from "@/core/selectors";
import { useClock } from "@/app/contexts";
import { Button } from "@/components/button";
import { formatDay, formatTime } from "@/lib/format";
import { useI18n } from "@/i18n";
import { useDispatch } from "@/state/context";

interface Props {
  view: View;
  lists: readonly TaskList[];
  inputRef: Ref<HTMLInputElement>;
}

export function Composer({ view, lists, inputRef }: Props) {
  const { t, language, locale } = useI18n();
  const { today, now } = useClock();
  const dispatch = useDispatch();
  const [text, setText] = useState("");

  const nowTime = useMemo(() => {
    const d = new Date(now);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [now]);

  const parsed = useMemo(
    () => parseQuickAdd(text, { today, nowTime, dateOrder: language === "ar" ? "dmy" : "mdy" }),
    [text, today, nowTime, language],
  );
  const matchedList = parsed.list ? lists.find((l) => l.id !== INBOX_ID && normalize(l.name) === normalize(parsed.list!)) : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = parsed.title || (parsed.list && !matchedList ? text.trim() : "");
    if (!title) return;

    const task: NewTask = {
      title,
      priority: parsed.priority,
      due: parsed.due,
      time: parsed.time,
      tags: [...parsed.tags],
      repeat: parsed.repeat,
      listId: matchedList?.id ?? (view.kind === "list" ? view.id : INBOX_ID),
    };
    // Adding from a view implies its context: a tag view adds that tag, Today defaults to today.
    if (view.kind === "tag" && !task.tags!.includes(view.tag)) task.tags!.push(view.tag);
    if (view.kind === "today" && task.due === null) task.due = today;
    dispatch({ type: "add", task });
    setText("");
  };

  const hasMeta = parsed.due || parsed.priority || parsed.tags.length || parsed.list || parsed.repeat !== "none";

  return (
    <form className="composer" onSubmit={submit} role="search" aria-label={t("composerLabel")}>
      <div className="composer__row">
        <Plus className="composer__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="composer__input"
          placeholder={t("composerPlaceholder")}
          aria-label={t("composerLabel")}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={300}
        />
        <Button type="submit" variant="solid" size="md" disabled={!parsed.title && !(parsed.list && !matchedList && text.trim())}>
          {t("composerAdd")}
        </Button>
      </div>
      {text.trim() && hasMeta ? (
        <div className="composer__preview" aria-live="polite">
          {parsed.due && (
            <span className="chip chip--accent">
              <CalendarDays aria-hidden="true" />
              {t("previewDue", {
                date: `${formatDay(parsed.due, today, locale, t)}${parsed.time ? ` · ${formatTime(parsed.time, locale)}` : ""}`,
              })}
            </span>
          )}
          {parsed.repeat !== "none" && (
            <span className="chip chip--accent">
              <Repeat aria-hidden="true" />
              {t("previewRepeat", { repeat: t(`repeatShort_${parsed.repeat}`) })}
            </span>
          )}
          {parsed.priority > 0 && (
            <span className="chip chip--accent" data-priority={parsed.priority}>
              <Flag aria-hidden="true" />
              {t(`priority${parsed.priority}`)}
            </span>
          )}
          {parsed.tags.map((tag) => (
            <span key={tag} className="chip chip--accent">
              <Tag aria-hidden="true" />#{tag}
            </span>
          ))}
          {parsed.list && (
            <span className={matchedList ? "chip chip--accent" : "chip chip--danger"}>
              <Hash aria-hidden="true" />
              {matchedList ? t("previewList", { name: matchedList.name }) : t("previewListMissing", { name: parsed.list })}
            </span>
          )}
        </div>
      ) : (
        <p className="composer__hint">{t("composerHint")}</p>
      )}
    </form>
  );
}

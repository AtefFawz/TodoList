import { useEffect, useRef, useState } from "react";

/**
 * Local text state that is committed to the store on blur / Enter / unmount, not on every keystroke.
 * Typing therefore creates one undo step instead of one per character, and closing a drawer with Esc loses nothing.
 */
export function useDraft(value: string, commit: (next: string) => void) {
  const [draft, setDraft] = useState(value);
  const latest = useRef({ draft, value, commit });
  useEffect(() => {
    latest.current = { draft, value, commit };
  });
  useEffect(
    () => () => {
      const { draft: d, value: v, commit: c } = latest.current;
      if (d !== v) c(d);
    },
    [],
  );
  return {
    value: draft,
    onChange: (next: string) => setDraft(next),
    flush: () => {
      if (draft !== value) commit(draft);
    },
  };
}

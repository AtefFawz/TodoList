import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose(): void;
  /** Accessible name. */
  label: string;
  variant?: "center" | "drawer" | "palette" | "nav";
  className?: string;
  children: ReactNode;
}

/**
 * A native <dialog> (focus trap, Esc, inert background, top layer: all free) with the two details that are easy to get wrong:
 * it ignores the `close` event it caused itself, and it blurs first so global hotkeys don't mistake a hidden input for a text field.
 * Children are mounted only while open, so every opening starts from a clean state.
 */
export function Modal({ open, onClose, label, variant = "center", className, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closedByApp = useRef(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) {
      closedByApp.current = true;
      (document.activeElement as HTMLElement | null)?.blur();
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={cn("modal", `modal--${variant}`, className)}
      aria-label={label}
      onClose={() => {
        if (closedByApp.current) closedByApp.current = false;
        else onClose();
      }}
      onClick={(event) => event.target === dialog.current && onClose()}
    >
      {open && children}
    </dialog>
  );
}

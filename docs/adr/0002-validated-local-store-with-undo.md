# ADR 0002 — Validated local store, undo in memory

**Status:** accepted

## Context

The original app wrote to `localStorage` from event handlers and called `JSON.parse` on whatever it found. Corrupt or foreign data crashed the app, and there was no way back from an accidental delete.

## Decision

- State lives in a tiny external store (`createStore`) read via `useSyncExternalStore`; no context re-render storms and no state library.
- Everything read from `localStorage` (and from imported backups) is validated with Zod. Invalid data falls back to defaults instead of crashing. Old layouts are migrated once (`core/legacy.ts`).
- The store keeps a bounded undo/redo history **in memory**. Preference changes and focus bookkeeping are deliberately not undoable.
- Text fields commit on blur/Enter/unmount (`useDraft`), so typing a note is one undo step, not one per keystroke.

## Consequences

- Delete, clear-completed and complete all offer an Undo toast, and Ctrl/⌘+Z works anywhere.
- History is not persisted: a reload starts a fresh undo stack. This keeps the stored document small and the format simple.

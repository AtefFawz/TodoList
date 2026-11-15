# ADR 0001 — Pure core with an injected context

**Status:** accepted

## Context

Task logic depends on "now", "today" and id generation: due dates, overdue checks, repeat rules, streaks. Reading `Date.now()` and `crypto.randomUUID()` inside the logic makes it untestable without fake timers and makes bugs around midnight and time zones hard to reproduce.

## Decision

All domain logic lives in `src/core/` as pure functions. The reducer is `reduce(data, action, context)` where `context = { now, today, uid }` is passed in. The app supplies the real clock (`systemContext`); tests supply a fixed one. Nothing in `core/` imports React, the DOM or storage.

## Consequences

- 140+ unit tests run in ~100 ms with no mocking.
- Midnight rollover, repeat advance and streak edge cases are ordinary table tests.
- The UI has one more argument to thread, which is hidden inside `createTodoStore`.

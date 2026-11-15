# ADR 0003 — A deterministic, bilingual quick-add parser

**Status:** accepted

## Context

Adding a task with date, time, priority, list and tags through form controls is slow. Users type Egyptian Arabic and English, mix Arabic-Indic digits, and write dates in many ways ("بكرة", "الخميس", "بعد 3 ايام", "5م", "every week").

## Decision

`core/quick-add.ts` is a hand-written, rule-based parser: `parseQuickAdd(text, { today, nowTime, dateOrder }) → { title, due, time, priority, tags, list, repeat }`. It normalises Arabic letters and digits first, extracts tokens from the text, and leaves the rest as the title. The composer shows the parsed result as live chips _before_ submit, so the user always sees what will be saved.

An ML/LLM parser was rejected: the app is offline-first, privacy-first and must be deterministic and instant.

## Consequences

- 82 table-driven tests document the supported syntax, including ambiguous cases.
- Unsupported phrasing degrades gracefully: it stays in the title and the user edits fields in the details drawer.

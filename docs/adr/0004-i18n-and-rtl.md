# ADR 0004 — Home-grown i18n, Arabic first, logical CSS

**Status:** accepted

## Context

Arabic is the default language and must be a first-class citizen: right-to-left layout, correct plurals (Arabic has six CLDR plural categories) and Arabic-aware date/time formatting. A full i18n library was heavier than the app's needs.

## Decision

- Two typed dictionaries (`ar.ts`, `en.ts`). `en` defines the keys; `ar` must satisfy the same type, so a missing translation is a compile error.
- `t.plural(key, n)` resolves `key_zero|one|two|few|many|other` through `Intl.PluralRules`.
- `<html lang dir>` is set before first paint by an inline script and kept in sync by `useDocumentSettings`.
- CSS uses logical properties (`inline-start`, `margin-inline`, …) so one stylesheet serves both directions; the few direction-specific cases (chevrons, drawer slide) are explicit `[dir="rtl"]` rules.

## Consequences

- Adding a language is one dictionary file plus an entry in `Language`.
- No runtime dependency.

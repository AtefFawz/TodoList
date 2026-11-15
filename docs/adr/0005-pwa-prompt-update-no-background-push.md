# ADR 0005 — Installable PWA, prompt-style updates, honest reminders

**Status:** accepted

## Context

Users want Nawa to behave like a phone app. A service worker that silently swaps itself while a user is mid-edit risks losing context, and reliable background notifications need a push server, which contradicts "everything stays on your device".

## Decision

- `vite-plugin-pwa` with `registerType: "prompt"`: a banner offers "Reload" when a new version is ready.
- Install via `beforeinstallprompt` where available, and manual instructions on iOS.
- Reminders use the Notification API **while the app is open or installed and running**. We say so in the UI and docs rather than promise background delivery.

## Consequences

- Fully offline, no server, no accounts.
- A task due while the app is closed will not notify until the app is opened again. Adding Web Push would need a backend and is an explicit non-goal for now.

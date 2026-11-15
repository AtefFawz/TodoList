# ADR 0006 — One web codebase, native shells, one platform adapter

**Status:** accepted

## Context

Nawa ships as a website/PWA, an Android and iOS app (Capacitor) and a desktop app (Tauri). Reliable reminders are the one feature the web cannot deliver: a closed browser tab cannot fire a timer. Each shell exposes different APIs for notifications, file saving and haptics.

## Decision

- The UI never talks to Capacitor or Tauri directly. Everything goes through `src/platform/runtime.ts`, which detects the platform and lazy-loads the right plugin (`import()`), so web builds don't pay for native code.
- On Android/iOS reminders are **scheduled with the operating system** (`@capacitor/local-notifications`), so they fire when the app is closed. `core/reminders.ts` decides _what_ to schedule (pure, tested); `platform/native-reminders.ts` shapes it for Capacitor; `syncNativeReminders` applies it through a serial queue so an old snapshot can never overwrite a new one. Only notifications tagged `extra.nawa = "task-reminder"` are ever cancelled.
- The OS queue is capped (iOS: 64), so the nearest 60 reminders are scheduled and the queue is refilled whenever the app returns to the foreground.
- Two Vite modes: `web` (absolute base, service worker) and `native` (relative base, no service worker; `virtual:pwa-register` is aliased to a stub).
- Tauri desktop uses the notification and dialog plugins through the same adapter.

## Consequences

- The native layer is covered by unit tests against the pure builders; the plugin calls themselves need a device to verify (see `docs/NATIVE.md`).
- Adding a platform means touching one file.

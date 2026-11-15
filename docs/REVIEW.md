# Review of Nawa 5.1 and what 6.0 changes

Nawa 5.1 already had a strong foundation: a good visual identity, Capacitor/Tauri shells and OS-scheduled reminders. This review lists what was missing or wrong, and what 6.0 does about it.

## Defects found in 5.1

| #   | Finding                                                                                               | Effect                                               | 6.0                                                                          |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | README promised a `.nvmrc` that did not exist and described files (`App.js`, …) that had been renamed | Wrong onboarding, wrong Node version                 | `.nvmrc` added, README rewritten against the real tree                       |
| 2   | Backup exported **tasks only**; import replaced everything including the current theme/settings       | Settings lost on restore                             | Full-document export; import keeps the user's current language/theme         |
| 3   | Import accepted any array element                                                                     | Malformed backups could create broken tasks          | Zod validation everywhere, per-field defaults, duplicate-id repair           |
| 4   | PWA icons declared `purpose: "any maskable"` with one image                                           | Icons cropped or padded wrongly on Android           | Separate `any` and `maskable` icons                                          |
| 5   | Hand-written service worker with a `push` handler but no push subscription anywhere                   | Dead code that implied a feature that does not exist | Workbox via `vite-plugin-pwa` with prompt-style updates; no fake push        |
| 6   | No update flow                                                                                        | Users could stay on a stale cached build             | "New version – Reload" banner                                                |
| 7   | `App.jsx` was a 1,200-line component and `App.css` 2,800 lines in one file                            | Hard to change safely                                | Feature folders, split styles, pure core                                     |
| 8   | Plain JavaScript, no types                                                                            | Refactors relied on luck                             | Strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| 9   | Arabic only                                                                                           | No English users                                     | Arabic (default, RTL) + English, typed dictionaries, CLDR plurals            |
| 10  | Dates handled as strings with ad-hoc comparisons; "today" captured once                               | "Today" stale after midnight                         | Day keys + a single injectable clock that rolls over at midnight             |
| 11  | Completed → reminder state kept                                                                       | Done tasks could still notify                        | Completing clears the reminder                                               |
| 12  | No test for the UI                                                                                    | Regressions were invisible                           | 20+ end-to-end tests including axe (light/dark × ar/en)                      |
| 13  | Storage events from other tabs ignored                                                                | Two tabs could overwrite each other                  | Cross-tab sync with validation                                               |

## Missing features now added

Natural-language quick add (Arabic and English) · subtasks with progress · repeating tasks · real lists (your categories become lists, with colours) and tags · pinned tasks · drag & drop and keyboard reordering · search · sorting · Upcoming view · undo/redo · command palette · insights (streaks, weekly chart) · focus time recorded per task · snooze from the notification centre · CSV export · English UI · multi-tab sync · skip link and full keyboard use.

## Kept from 5.1

The Nawa identity and logo, the Capacitor and Tauri projects and scripts, native OS-scheduled reminders (now with snooze and tap-to-open), exact-alarm handling on Android, vibration setting, the notification centre, local-first storage, Vercel deployment.

## Upgrade path

First launch of 6.0 reads the 5.x keys (`nawa.tasks.v2`, `nawa.theme`, `nawa.notifications.settings.v1`) and folds them into `nawa:v3`: categories → lists, `high|medium|low` → priority 3/2/1, reminders kept, completion history rebuilt so streaks start from the real past. 5.x backups can still be imported.

## Verification status

Verified here: type-check, lint, 184 unit tests, production builds in both modes, 22 end-to-end runs (desktop and mobile viewports, axe in both themes and languages). **Not verified here:** anything that needs a device — Android/iOS notification delivery, haptics, the Tauri window — because there is no Android SDK, Xcode or Rust toolchain in the build environment. Follow `docs/NATIVE.md` to test on a device.

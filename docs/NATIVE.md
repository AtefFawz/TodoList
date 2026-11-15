# Native builds (Android, iOS, Desktop)

The web code is shared. Native shells are generated locally and are **not committed** (`android/`, `ios/`, `src-tauri/target`).

> These paths were ported and statically verified (`npm run verify:native`, unit tests of the notification builders) but **need a device or toolchain to test end to end.**

## Android (Capacitor)

Requirements: Node ≥ 22.12, JDK 21, Android Studio / SDK.

```bash
npm install
npm run mobile:add:android     # creates android/, applies icons, notification icon, permissions
npm run mobile:android         # build + sync + open Android Studio
npm run mobile:android:debug   # debug APK  → android/app/build/outputs/apk/debug/
npm run mobile:android:release # signed release AAB (needs your keystore, see script output)
```

Permissions used: `POST_NOTIFICATIONS` (Android 13+), exact alarms (`SCHEDULE_EXACT_ALARM`) so reminders fire on time. The app asks when you enable system alerts; on Android 12+ it opens the exact-alarm settings if needed. Tap on a notification opens the task. Notification channels: `nawa-task-reminders-vibrate` / `-silent`.

## iOS (Capacitor)

Requires a Mac with Xcode.

```bash
npm run mobile:add:ios
npm run mobile:ios
```

iOS allows at most 64 pending local notifications; Nawa schedules the nearest 60 and refills when the app opens. Sign with your Apple team in Xcode.

## Desktop (Tauri 2)

Requires Rust and the platform packages.

- **Arch Linux:** `sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool`
- **Windows:** WebView2 + MSVC Build Tools. **macOS:** Xcode command-line tools.

```bash
npm run desktop:dev              # dev window
npm run desktop:build            # installers for your OS
npm run desktop:build:appimage   # Linux AppImage
```

## Changing the app id

Edit `appId` in `capacitor.config.json` **and** `identifier` in `src-tauri/tauri.conf.json` (they must match; `verify:native` checks it).

## Testing checklist (on device)

- [ ] Enable system alerts → permission prompt appears
- [ ] Task due in 2 min → notification arrives with app closed
- [ ] Tapping it opens the task; snooze moves it
- [ ] Vibrate setting on/off changes the channel
- [ ] Export/import backup through the share sheet

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "capacitor.config.json",
  "src/platform/nativeRuntime.js",
  "src/utils/nativeReminderUtils.js",
  "src/utils/nativeReminderUtils.test.js",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/src/lib.rs",
  "src-tauri/capabilities/default.json",
  "native/android/ic_stat_nawa.png",
  "native/android/res/mipmap-xxxhdpi/ic_launcher.png",
  "native/android/res/mipmap-anydpi-v26/ic_launcher.xml",
  "scripts/native-setup.mjs",
  "scripts/build-android.mjs",
  "scripts/build-native.mjs",
];
const missingFiles = requiredFiles.filter((file) => !existsSync(resolve(file)));
if (missingFiles.length) {
  console.error("Missing native app files:\n" + missingFiles.join("\n"));
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const capacitor = JSON.parse(readFileSync("capacitor.config.json", "utf8"));
const tauri = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const capability = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf8"));
const requiredDependencies = [
  "@capacitor/core",
  "@capacitor/local-notifications",
  "@capacitor/haptics",
  "@capacitor/app",
  "@capacitor/filesystem",
  "@capacitor/share",
  "@tauri-apps/api",
  "@tauri-apps/plugin-notification",
  "@tauri-apps/plugin-dialog",
  "@tauri-apps/plugin-fs",
];
const missingDependencies = requiredDependencies.filter((name) => !packageJson.dependencies[name]);
if (missingDependencies.length) throw new Error("Missing native runtime dependencies: " + missingDependencies.join(", "));
if (!packageJson.devDependencies["@capacitor/android"] || !packageJson.devDependencies["@capacitor/ios"] || !packageJson.devDependencies["@capacitor/cli"]) {
  throw new Error("Capacitor Android/iOS platforms and CLI must be declared.");
}
if (!packageJson.devDependencies["@tauri-apps/cli"]) throw new Error("Tauri CLI is not declared.");
if (capacitor.webDir !== "build" || tauri.build.frontendDist !== "../build") throw new Error("Native wrappers must target the CRA production build.");
if (capacitor.appId !== tauri.identifier) throw new Error("Capacitor and Tauri application identifiers must match.");
if (!packageJson.scripts["mobile:android:debug"] || !packageJson.scripts["desktop:build"] || !packageJson.scripts["verify:native"]) {
  throw new Error("One or more native build scripts are missing.");
}
if (!capability.permissions.includes("notification:default") || !capability.permissions.includes("dialog:default")) {
  throw new Error("Tauri desktop notifications and native dialogs must be enabled.");
}
console.log(`Native project configuration valid. ${requiredFiles.length} required files and ${requiredDependencies.length} native runtime dependencies verified.`);

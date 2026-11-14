import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "index.html",
  "vite.config.mjs",
  "capacitor.config.json",
  "src/platform/nativeRuntime.js",
  "src/platform/nativeRuntime.test.js",
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
];
const missingFiles = requiredFiles.filter((file) => !existsSync(resolve(file)));
if (missingFiles.length) {
  console.error("Missing project files:\n" + missingFiles.join("\n"));
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
  "react",
  "react-dom",
];
const missingDependencies = requiredDependencies.filter((name) => !packageJson.dependencies[name]);
if (missingDependencies.length) throw new Error("Missing runtime dependencies: " + missingDependencies.join(", "));

const requiredDevDependencies = [
  "@capacitor/cli",
  "@capacitor/android",
  "@capacitor/ios",
  "@tauri-apps/cli",
  "@vitejs/plugin-react",
  "@testing-library/dom",
  "@testing-library/jest-dom",
  "@testing-library/react",
  "vite",
  "vitest",
  "jsdom",
];
const missingDevDependencies = requiredDevDependencies.filter((name) => !packageJson.devDependencies[name]);
if (missingDevDependencies.length) throw new Error("Missing development dependencies: " + missingDevDependencies.join(", "));

if (!packageJson.engines?.node?.includes("22.12.0")) throw new Error("Node.js >=22.12.0 must be declared for the Vite toolchain.");
if (packageJson.scripts.start !== "vite" || !packageJson.scripts["build:web"] || !packageJson.scripts["build:native"]) {
  throw new Error("Vite development and platform build scripts are missing.");
}
if (capacitor.webDir !== "build" || tauri.build.frontendDist !== "../build") {
  throw new Error("Capacitor and Tauri must target the shared Vite output directory.");
}
if (tauri.build.devUrl !== "http://localhost:1420") throw new Error("Tauri devUrl must match the Vite development server port.");
if (capacitor.appId !== tauri.identifier) throw new Error("Capacitor and Tauri application identifiers must match.");
if (packageJson.version !== tauri.version) throw new Error("package.json and Tauri versions must match.");
if (!packageJson.scripts["mobile:android:debug"] || !packageJson.scripts["desktop:build"] || !packageJson.scripts["verify:native"]) {
  throw new Error("One or more native build scripts are missing.");
}
if (!capability.permissions.includes("notification:default") || !capability.permissions.includes("dialog:default")) {
  throw new Error("Tauri desktop notifications and native dialogs must be enabled.");
}

const tauriCargo = readFileSync("src-tauri/Cargo.toml", "utf8");
if (!tauriCargo.includes(`version = "${packageJson.version}"`)) throw new Error("package.json and Cargo.toml versions must match.");
const html = readFileSync("index.html", "utf8");
const css = readFileSync("src/index.css", "utf8");
if (css.includes("../public/") || !existsSync("src/assets/fonts/Alexandria-Regular.ttf")) throw new Error("Vite font assets must live under src/assets/fonts and be imported by CSS.");
if (html.includes("%PUBLIC_URL%") || html.includes("%BASE_URL%/")) throw new Error("index.html contains an incompatible CRA or Vite base URL reference.");
if (!existsSync("vercel.json")) throw new Error("Vercel deployment configuration is missing.");

console.log(`Project configuration valid. ${requiredFiles.length} files, ${requiredDependencies.length} runtime dependencies and ${requiredDevDependencies.length} build/test dependencies verified.`);

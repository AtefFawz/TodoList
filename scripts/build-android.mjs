import { spawnSync } from "node:child_process";
import { existsSync, chmodSync } from "node:fs";
import { resolve } from "node:path";

const variant = process.argv[2] === "release" ? "release" : "debug";
const root = process.cwd();
const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";
const npx = isWindows ? "npx.cmd" : "npx";

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: isWindows });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

if (!existsSync(resolve(root, "android/gradlew")) && !existsSync(resolve(root, "android/gradlew.bat"))) {
  console.error("Android project not found. Run: npm run mobile:add:android");
  process.exit(1);
}

run(npm, ["run", "build:native"]);
run(npx, ["cap", "sync", "android"]);
const wrapper = isWindows ? "gradlew.bat" : "./gradlew";
const wrapperPath = resolve(root, "android", wrapper);
if (!isWindows) chmodSync(wrapperPath, 0o755);
const gradleTask = variant === "release" ? "bundleRelease" : "assembleDebug";
run(isWindows ? wrapperPath : wrapper, [gradleTask], resolve(root, "android"));

const artifact =
  variant === "release" ? "android/app/build/outputs/bundle/release/app-release.aab" : "android/app/build/outputs/apk/debug/app-debug.apk";
console.log(`Android ${variant} build finished: ${artifact}`);
if (variant === "release") {
  console.log("Release AAB is unsigned unless signing is configured in android/app/build.gradle.");
}

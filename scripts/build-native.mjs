import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const buildScript = resolve("node_modules/react-scripts/scripts/build.js");
const result = spawnSync(process.execPath, [buildScript], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: { ...process.env, PUBLIC_URL: "." },
});
if (result.error) throw result.error;
process.exit(result.status || 0);

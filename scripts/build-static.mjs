import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "public/index.html",
  "public/app.js",
  "public/styles.css",
  "public/engine/browser-engine-runtime.js",
  "public/engine/bridge.js",
  "public/engine/polaris-renderer-adapter.js",
  "public/engine/modules/renderer/renderer.js"
];

const missing = [];
for (const relative of required) {
  try {
    const stat = await fs.stat(path.join(root, relative));
    if (!stat.isFile()) missing.push(relative);
  } catch {
    missing.push(relative);
  }
}

if (missing.length) {
  console.error("Polaris static build is missing required files:");
  for (const file of missing) console.error(" - " + file);
  process.exitCode = 1;
} else {
  console.log("Polaris static build checks passed (" + required.length + " required files).");
}

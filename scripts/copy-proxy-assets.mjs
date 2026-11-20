import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(root, "../public");

async function findPackageRoot(name, entry = name) {
  let current = path.dirname(fileURLToPath(import.meta.resolve(entry)));
  while (current !== path.dirname(current)) {
    try {
      const metadata = JSON.parse(await fs.readFile(path.join(current, "package.json"), "utf8"));
      if (metadata.name === name) return current;
    } catch {}
    current = path.dirname(current);
  }
  throw new Error("Could not locate installed package: " + name);
}

const packages = [
  ["@mercuryworkshop/scramjet", "scram", "@mercuryworkshop/scramjet/path", ["scramjet.all.js", "scramjet.wasm.wasm", "scramjet.sync.js"]],
  ["@mercuryworkshop/bare-mux", "baremux", undefined, ["index.js", "worker.js"]],
  ["@mercuryworkshop/epoxy-transport", "epoxy", undefined, ["index.mjs"]]
];

for (const [name, output, entry, requiredFiles] of packages) {
  const packageRoot = await findPackageRoot(name, entry || name);
  const source = path.join(packageRoot, "dist");
  const destination = path.join(publicDir, output);
  try {
    await fs.access(source);
  } catch {
    throw new Error("The installed package " + name + " does not contain a dist directory.");
  }
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(source, destination, { recursive: true });
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(destination, file));
    } catch {
      throw new Error("Proxy asset build for " + name + " is missing public/" + output + "/" + file);
    }
  }
  console.log("Prepared " + name + " -> public/" + output + " (" + requiredFiles.join(", ") + ")");
}

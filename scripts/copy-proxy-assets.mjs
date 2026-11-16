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
  ["@mercuryworkshop/scramjet", "scram", "@mercuryworkshop/scramjet/path"],
  ["@mercuryworkshop/bare-mux", "baremux"],
  ["@mercuryworkshop/epoxy-transport", "epoxy"]
];

for (const [name, output, entry] of packages) {
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
  console.log("Prepared " + name + " -> public/" + output);
}

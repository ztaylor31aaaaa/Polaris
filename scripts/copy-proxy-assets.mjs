import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(root, "../public");

function findPackageRoot(name) {
  let current = path.dirname(require.resolve(name));
  while (current !== path.dirname(current)) {
    try {
      const metadata = JSON.parse(require("node:fs").readFileSync(path.join(current, "package.json"), "utf8"));
      if (metadata.name === name) return current;
    } catch {}
    current = path.dirname(current);
  }
  throw new Error("Could not locate installed package: " + name);
}

const packages = [
  ["@mercuryworkshop/scramjet", "scram"],
  ["@mercuryworkshop/bare-mux", "baremux"],
  ["@mercuryworkshop/epoxy-transport", "epoxy"]
];

for (const [name, output] of packages) {
  const source = path.join(findPackageRoot(name), "dist");
  const destination = path.join(publicDir, output);
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(source, destination, { recursive: true });
  console.log("Prepared " + name + " -> public/" + output);
}

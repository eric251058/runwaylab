import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const contractFiles = readdirSync("scripts")
  .filter((file) => file.endsWith("-tests.ts"))
  .sort()
  .map((file) => `scripts/${file}`);

for (const file of contractFiles) {
  const result = spawnSync(process.execPath, ["--import", "tsx", file], {
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    console.error(`Contract failed: ${file}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`All ${contractFiles.length} contract files passed.`);

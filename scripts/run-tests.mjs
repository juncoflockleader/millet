import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function collectTests(dir) {
  const entries = readdirSync(dir);
  const tests = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      tests.push(...collectTests(path));
    } else if (entry.endsWith(".test.ts")) {
      tests.push(path);
    }
  }

  return tests;
}

const tests = collectTests("packages");

if (tests.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", ...tests],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);

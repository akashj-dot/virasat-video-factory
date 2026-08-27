#!/usr/bin/env node
// Applies every default Virasat brand touch to a built project in one call —
// logo watermark + closing outro/waitlist card. This is the ONE command that
// should run on every project, every time, right after Step 5 (frame build)
// and before Step 6 (finalize/render). See the root CLAUDE.md for why this
// step is mandatory, not optional.
//
// Usage: node finalize-brand.mjs <projectDir> [--mark=icon|full] [--theme=light|dark] [--duration=4.5]

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const projectDir = process.argv[2];

if (!projectDir) {
  console.error("usage: node finalize-brand.mjs <projectDir> [--mark=icon|full] [--theme=light|dark] [--duration=4.5]");
  process.exit(1);
}

const passthroughArgs = process.argv.slice(3);
const markArg = passthroughArgs.find((a) => a.startsWith("--mark="));
const themeAndDurationArgs = passthroughArgs.filter((a) => a.startsWith("--theme=") || a.startsWith("--duration="));

function run(script, args) {
  console.log(`\n--- ${path.basename(script)} ---`);
  const result = spawnSync("node", [script, projectDir, ...args], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`✗ ${path.basename(script)} failed`);
    process.exit(result.status ?? 1);
  }
}

run(path.join(THIS_DIR, "add-logo-overlay.mjs"), markArg ? [markArg] : []);
run(path.join(THIS_DIR, "add-outro-card.mjs"), themeAndDurationArgs);
// Re-run the logo overlay so the just-added outro frame gets the watermark
// too — it skips frames it has already patched, so this is always safe.
run(path.join(THIS_DIR, "add-logo-overlay.mjs"), markArg ? [markArg] : []);

console.log("\n✓ brand finalized (logo + outro card applied)");

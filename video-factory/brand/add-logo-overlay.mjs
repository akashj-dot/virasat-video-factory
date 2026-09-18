#!/usr/bin/env node
// Bakes the persistent Virasat logo watermark into EVERY frame composition of
// a built HyperFrames project — top-left corner, always visible, above that
// frame's own content. Run this once, after Step 5 (frame build) and before
// Step 6 (finalize/render) — i.e. after every frame's own HTML exists but
// before/after assemble-index.mjs, either order is fine since this script
// only touches compositions/frames/*.html, never index.html.
//
// Usage: node add-logo-overlay.mjs <projectDir> [--mark=icon|full]
//
// Implementation note — READ BEFORE CHANGING THIS SCRIPT:
// Earlier debugging (2026-08-27) chased a phantom "corruption" bug: frame 1's
// "UNCLAIMED" eyebrow tag appeared in the top-left corner, overlapping the
// injected logo, across three different DOM-insertion strategies (raw <img>
// sibling of index.html's root, a wrapped mini-composition sibling, and a
// plain <img> baked as the last child of each frame's own #root). All three
// were blamed for "relocating" that tag. A baseline render of the ORIGINAL,
// UNMODIFIED project (no logo script ever run) proved this wrong: "UNCLAIMED"
// renders top-left by design in frame 1 — it's an eyebrow tag, not something
// any of these approaches moved. There was never a layout-corruption bug —
// just a genuine visual overlap between two elements that both want the
// top-left corner.
// THE ACTUAL FIX: put the logo in the top-RIGHT corner instead, which is
// clear of every frame's own content in this project (checked via grep across
// compositions/frames/*.html for anything positioned near the top-right —
// only 08-thesis.html has something on the right side, at top:336px, well
// clear of a small corner badge). If a future project's frames DO have
// content near the top-right, re-check placement the same way (grep the
// frame source, or just look at a rendered frame) before assuming this
// corner is universally safe.
// The logo is painted as a CSS pseudo-element (`#root::after`) background
// image rather than a real DOM node — this avoids depending on each frame's
// internal DOM structure (flex/absolute/static children all differ) and
// keeps this script a pure CSS-only patch with zero risk of shifting any
// other element's layout, regardless of which corner is chosen.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const BRAND_LOGO_DIR = path.join(THIS_DIR, "logo");

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node add-logo-overlay.mjs <projectDir> [--mark=icon|full]");
  process.exit(1);
}

const markArg = process.argv.find((a) => a.startsWith("--mark="));
// Default changed 2026-08-28 per explicit user feedback: the icon mark reads
// as a bare rupee symbol, not recognizably "Virasat" — default to the full
// wordmark going forward. Pass --mark=icon to opt back into the old mark.
const mark = markArg ? markArg.split("=")[1] : "full";
if (!["icon", "full"].includes(mark)) {
  console.error(`invalid --mark "${mark}" (icon | full)`);
  process.exit(1);
}

// The full wordmark's source PNG (virasat-logo-full.png) is a 4884x4884
// square canvas with the actual ".VIRASAT" content occupying only a thin
// horizontal band in the middle (~3.5:1 aspect) — using it directly at a
// square watermark size would shrink the wordmark to an illegible sliver.
// virasat-logo-full-trimmed.png is that same art cropped tight to content
// (2944x832, ~3.54:1) — always use the trimmed version for "full".
const srcLogoFile = mark === "icon" ? "virasat-logo-icon.png" : "virasat-logo-full-trimmed.png";
const srcLogoPath = path.join(BRAND_LOGO_DIR, srcLogoFile);
if (!fs.existsSync(srcLogoPath)) {
  console.error(`brand logo file not found: ${srcLogoPath}`);
  process.exit(1);
}
// Icon is exactly square; the trimmed full wordmark is ~3.54:1 (w:h) — size
// the watermark box from real content aspect, never assume square.
const LOGO_ASPECT_W_OVER_H = mark === "icon" ? 1 : 2944 / 832;

const framesDir = path.join(projectDir, "compositions", "frames");
if (!fs.existsSync(framesDir)) {
  console.error(`no compositions/frames/ in ${projectDir}`);
  process.exit(1);
}

// Stage the logo image into the project.
const assetsDestDir = path.join(projectDir, "assets", "brand");
fs.mkdirSync(assetsDestDir, { recursive: true });
fs.copyFileSync(srcLogoPath, path.join(assetsDestDir, srcLogoFile));
const logoRelPath = `assets/brand/${srcLogoFile}`;

const frameFiles = fs.readdirSync(framesDir).filter((f) => f.endsWith(".html"));
if (!frameFiles.length) {
  console.error(`no frame .html files found in ${framesDir}`);
  process.exit(1);
}

let patched = 0;
let skipped = 0;

// Stable marker for idempotency — the actual CSS this script writes
// (`#root::after { ... }`) is not distinctive enough to grep for reliably
// (a frame could plausibly define its own `#root::after` for something
// else), and the previous marker string ("brand-logo-badge") never
// appeared anywhere this script writes, so re-running it always re-patched
// every frame and silently duplicated the block. This comment is unique
// and only ever written by this script.
const MARKER = "/* virasat-brand-logo-overlay */";

for (const file of frameFiles) {
  const filePath = path.join(framesDir, file);
  let html = fs.readFileSync(filePath, "utf8");

  if (html.includes(MARKER)) {
    skipped++;
    continue;
  }

  // Read this frame's own canvas size off its root, so the logo scales
  // consistently across 9:16 / 16:9 / 1:1 without per-format tuning.
  const rootTagMatch = html.match(/<div[^>]*\bid="root"[^>]*>/);
  const width = Number(rootTagMatch?.[0]?.match(/data-width="(\d+(?:\.\d+)?)"/)?.[1] ?? 1080);
  // Icon watermark keeps its established footprint (9% of canvas width,
  // square). The wordmark reads smaller at a glance for the same box area
  // (thin horizontal glyphs vs a solid icon glyph), so it gets a wider
  // box — sized so its rendered HEIGHT roughly matches the icon's, with
  // width following from its own aspect ratio instead of being squeezed
  // into a square.
  // Bumped 2026-09-18 per explicit user feedback that the wordmark read too
  // small in finished renders (was 0.045 / 0.09 — now ~45% larger).
  const logoHeightPx = Math.round(width * (mark === "icon" ? 0.13 : 0.065));
  const logoWidthPx = Math.round(logoHeightPx * LOGO_ASPECT_W_OVER_H);
  const marginPx = Math.round(width * 0.03);

  // Plain #root selector only — a compound selector like
  // `#root[data-composition-id]` silently fails to match in the assembled
  // render (see brand/README.md / the hyperframes_css_gotcha memory).
  // No new DOM node is added (see header note) — this is a pseudo-element
  // painted on #root itself, so it can never shift another element's layout.
  // Top-RIGHT corner — see header note on why left was rejected.
  const styleAddendum =
    `    ${MARKER}\n` +
    `    #root::after {\n` +
    `      content: "";\n` +
    `      position: absolute;\n` +
    `      top: ${marginPx}px;\n` +
    `      right: ${marginPx}px;\n` +
    `      width: ${logoWidthPx}px;\n` +
    `      height: ${logoHeightPx}px;\n` +
    `      z-index: 999;\n` +
    `      pointer-events: none;\n` +
    `      background-image: url("${logoRelPath}");\n` +
    `      background-size: contain;\n` +
    `      background-repeat: no-repeat;\n` +
    `      background-position: center;\n` +
    `    }\n  </style>`;

  // Match the closing style tag regardless of its leading whitespace —
  // a literal two-space-indented match ("  </style>") silently skipped
  // any frame whose </style> wasn't indented exactly that way.
  const styleCloseRe = /[ \t]*<\/style>/g;
  let lastMatch = null;
  for (const m of html.matchAll(styleCloseRe)) lastMatch = m;
  if (!lastMatch) {
    console.warn(`  skip ${file}: no </style> found`);
    continue;
  }
  const styleCloseIdx = lastMatch.index;
  html =
    html.slice(0, styleCloseIdx) +
    styleAddendum +
    html.slice(styleCloseIdx + lastMatch[0].length);

  fs.writeFileSync(filePath, html);
  patched++;
}

console.log(`✓ brand logo baked into ${patched} frame(s) (${logoRelPath})${skipped ? `, ${skipped} already had it` : ""}`);

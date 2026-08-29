#!/usr/bin/env node
// Appends the persistent Virasat closing waitlist/outro card as a new final
// scene in a built HyperFrames project — AFTER the topic-specific CTA frame,
// per the approved build order (brand palette -> logo overlay -> outro card).
// Copy: "We're building the fix for this. Be the first inside. link in bio
// to grab early access" (exact final wording, do not paraphrase it).
//
// Run this once, after Step 5 (frame build) and before Step 6
// (finalize/render) — same window as add-logo-overlay.mjs. Order between the
// two scripts doesn't matter; run this one AFTER add-logo-overlay.mjs so the
// new outro frame also gets the logo watermark baked into it, or run
// add-logo-overlay.mjs a second time afterward — it skips frames it has
// already patched.
//
// Usage: node add-outro-card.mjs <projectDir> [--theme=light|dark] [--duration=4.5]
//
// Unlike add-logo-overlay.mjs, this DOES touch index.html — but safely: it
// only appends a new sibling scene in the same shape every other frame
// already uses (data-composition-src + data-start + data-duration), which is
// the pipeline's own proven-safe pattern for wiring in a timed scene. The
// earlier logo-overlay corruption scare (see that script's header) was
// specific to inserting elements that persist across OTHER frames' own
// timing windows; a new scene confined to its own non-overlapping time
// window does not have that failure mode. Still, always re-check with a real
// render after editing this script, not just `hyperframes check`.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(THIS_DIR, "outro", "virasat-outro-template.html");
const BRAND_LOGO_DIR = path.join(THIS_DIR, "logo");
// Pre-generated cloned-voice read of the fixed outro copy (see the header
// comment's exact wording) — reused as-is across every project rather than
// regenerated per video, since the copy never changes. Added 2026-08-29 per
// user request ("no voice cloning for outro?" -> add narration by default).
// Regenerate only if the copy itself ever changes: node voice.mjs against a
// one-line SCRIPT.md with this exact text, using the canonical voice sample.
const OUTRO_VOICE_PATH = path.join(THIS_DIR, "outro", "voice-outro.wav");
// Trimmed 2026-08-28: the untrimmed square PNG is mostly transparent
// padding around a thin wordmark band, so it rendered small even at a
// generous cqw width. The trimmed asset (see add-logo-overlay.mjs's
// header note) is cropped tight to content — pair with the outro-logo
// CSS's cqw value, which is tuned for this asset's ~3.54:1 aspect ratio.
const FULL_LOGO_FILE = "virasat-logo-full-trimmed.png";

const THEME_TOKENS = {
  light: { bg: "#faf6ea", primary: "#108560", text: "#1d1c16", textMuted: "#6b6356" },
  dark: { bg: "#1d1c16", primary: "#6ec1a3", text: "#f5ecd5", textMuted: "#e0d4a8" },
};

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node add-outro-card.mjs <projectDir> [--theme=light|dark] [--duration=4.5]");
  process.exit(1);
}

const themeArg = process.argv.find((a) => a.startsWith("--theme="));
const durationArg = process.argv.find((a) => a.startsWith("--duration="));
const hasOutroVoice = fs.existsSync(OUTRO_VOICE_PATH);

// Default duration must cover the spoken line (when present) plus a short
// hold, not the old fixed 4.5s — an explicit --duration still wins.
function probeDuration(wavPath) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", wavPath,
  ]);
  return Number(out.toString().trim());
}
const outroVoiceDuration = hasOutroVoice ? Math.round(probeDuration(OUTRO_VOICE_PATH) * 1000) / 1000 : null;
const defaultDuration = hasOutroVoice ? Math.round((outroVoiceDuration + 0.4) * 100) / 100 : 4.5;
const outroDuration = durationArg ? Number(durationArg.split("=")[1]) : defaultDuration;

const indexPath = path.join(projectDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error(`no index.html in ${projectDir}`);
  process.exit(1);
}
if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(`outro template not found: ${TEMPLATE_PATH}`);
  process.exit(1);
}

let index = fs.readFileSync(indexPath, "utf8");

if (index.includes('data-composition-id="virasat-outro"')) {
  console.log("✓ outro card already present — skipping");
  process.exit(0);
}

// Theme: explicit flag wins; otherwise detect from this project's own
// frame.md (copied verbatim from brand/virasat-frame-{light,dark}.md, so the
// exact bg hex is a reliable fingerprint — see brand/README.md).
let theme = themeArg ? themeArg.split("=")[1] : null;
if (!theme) {
  const frameMdPath = path.join(projectDir, "frame.md");
  const frameMd = fs.existsSync(frameMdPath) ? fs.readFileSync(frameMdPath, "utf8") : "";
  theme = /bg:\s*"#1d1c16"/.test(frameMd) ? "dark" : "light";
}
if (!THEME_TOKENS[theme]) {
  console.error(`invalid --theme "${theme}" (light | dark)`);
  process.exit(1);
}
const tokens = THEME_TOKENS[theme];
const [pr, pg, pb] = hexToRgb(tokens.primary);

// Read canvas size + current total duration off the master #root.
const rootMatch = index.match(/<div\s+id="root"[\s\S]*?>/);
if (!rootMatch) {
  console.error("could not find master #root in index.html");
  process.exit(1);
}
const width = Number(rootMatch[0].match(/data-width="(\d+(?:\.\d+)?)"/)?.[1]);
const height = Number(rootMatch[0].match(/data-height="(\d+(?:\.\d+)?)"/)?.[1]);
const currentTotal = Number(rootMatch[0].match(/data-duration="(\d+(?:\.\d+)?)"/)?.[1]);
if (!width || !height || !currentTotal) {
  console.error("could not read width/height/duration off master #root");
  process.exit(1);
}
const outroStart = currentTotal;
const newTotal = currentTotal + outroDuration;

// Number the new frame file one past the highest existing NN-*.html prefix.
const framesDir = path.join(projectDir, "compositions", "frames");
const existingNums = fs
  .readdirSync(framesDir)
  .map((f) => f.match(/^(\d+)-/))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const nextNum = String((existingNums.length ? Math.max(...existingNums) : 0) + 1).padStart(2, "0");
const frameFileName = `${nextNum}-outro.html`;
const compositionId = `${nextNum}-outro`;

// Stage the full wordmark logo.
const assetsDestDir = path.join(projectDir, "assets", "brand");
fs.mkdirSync(assetsDestDir, { recursive: true });
fs.copyFileSync(path.join(BRAND_LOGO_DIR, FULL_LOGO_FILE), path.join(assetsDestDir, FULL_LOGO_FILE));
const logoRelPath = `assets/brand/${FULL_LOGO_FILE}`;

// Stage this card's own fonts (self-contained @font-face — don't assume the
// rest of the project already fetched Merriweather/Space Mono; the standard
// build-frame pipeline only bakes @font-face per-file for fonts actually
// used by that frame, and a project not yet on the Virasat brand tokens may
// have neither).
const FONTS_DIR = path.join(THIS_DIR, "outro", "fonts");
const fontsDestDir = path.join(projectDir, "assets", "fonts");
fs.mkdirSync(fontsDestDir, { recursive: true });
for (const f of fs.readdirSync(FONTS_DIR)) {
  const dest = path.join(fontsDestDir, f);
  if (!fs.existsSync(dest)) fs.copyFileSync(path.join(FONTS_DIR, f), dest);
}

// Stage the outro voice line, if the cached brand asset exists. Named
// "outro.wav" (not a zero-padded number) so it can never collide with a
// project's own NN-numbered voice lines.
let outroVoiceRelPath = null;
if (hasOutroVoice) {
  const voiceDestDir = path.join(projectDir, "assets", "voice");
  fs.mkdirSync(voiceDestDir, { recursive: true });
  outroVoiceRelPath = "assets/voice/outro.wav";
  fs.copyFileSync(OUTRO_VOICE_PATH, path.join(voiceDestDir, "outro.wav"));
}

// Fill the template.
let outroHtml = fs.readFileSync(TEMPLATE_PATH, "utf8");
outroHtml = outroHtml
  .replaceAll("__COMPOSITION_ID__", compositionId)
  .replaceAll("__WIDTH__", String(width))
  .replaceAll("__HEIGHT__", String(height))
  .replaceAll("__DURATION__", String(outroDuration))
  .replaceAll("__BG__", tokens.bg)
  .replaceAll("__PRIMARY__", tokens.primary)
  .replaceAll("__PRIMARY_GLOW_STRONG__", `rgba(${pr}, ${pg}, ${pb}, 0.55)`)
  .replaceAll("__PRIMARY_GLOW_SOFT__", `rgba(${pr}, ${pg}, ${pb}, 0.22)`)
  .replaceAll("__PRIMARY_GLOW_NONE__", `rgba(${pr}, ${pg}, ${pb}, 0)`)
  .replaceAll("__TEXT__", tokens.text)
  .replaceAll("__TEXT_MUTED__", tokens.textMuted)
  .replaceAll("__LOGO_REL__", logoRelPath);

fs.writeFileSync(path.join(framesDir, frameFileName), outroHtml);

// Find the previous last content scene (the one whose data-start +
// data-duration equals currentTotal) so we can fade it out and know which
// element id to target in the transitions block.
const sceneRe =
  /<div\s+id="(el-[\w-]+)"\s+class="scene"\s+data-composition-id="[\w.-]+"\s+data-composition-src="[^"]+"\s+data-start="([\d.]+)"\s+data-duration="([\d.]+)"\s+data-track-index="(\d+)"\s*><\/div>/g;
let match;
let lastEl = null;
let lastEnd = -1;
let usedTrackIndices = new Set();
while ((match = sceneRe.exec(index))) {
  const [, elId, start, dur, trackIdx] = match;
  usedTrackIndices.add(Number(trackIdx));
  const end = Number(start) + Number(dur);
  if (end > lastEnd) {
    lastEnd = end;
    lastEl = elId;
  }
}
if (!lastEl || Math.abs(lastEnd - currentTotal) > 0.05) {
  console.error(
    `could not confidently identify the last content scene (found end=${lastEnd}, expected ~${currentTotal}) — aborting without modifying index.html`,
  );
  fs.unlinkSync(path.join(framesDir, frameFileName));
  process.exit(1);
}
const newTrackIndex = [0, 1].find((i) => i !== undefined && !usedTrackIndices.has(i)) ?? 0;

// Insert the new scene div right after the previous last scene's own
// <div>/<audio> pair (before the BGM/captions comment block, if present —
// otherwise right before the closing </div> of #root).
const newSceneBlock =
  `\n      <div\n` +
  `        id="el-${compositionId}"\n` +
  `        class="scene"\n` +
  `        data-composition-id="${compositionId}"\n` +
  `        data-composition-src="compositions/frames/${frameFileName}"\n` +
  `        data-start="${outroStart}"\n` +
  `        data-duration="${outroDuration}"\n` +
  `        data-track-index="${newTrackIndex}"\n` +
  `      ></div>\n` +
  (outroVoiceRelPath
    ? `      <audio\n` +
      `        id="el-${compositionId}-voice"\n` +
      `        src="${outroVoiceRelPath}"\n` +
      `        data-start="${outroStart}"\n` +
      `        data-duration="${outroVoiceDuration}"\n` +
      `        data-track-index="10"\n` +
      `        data-volume="1"\n` +
      `      ></audio>\n`
    : "");

const lastElOpenTag = new RegExp(`<div\\s+id="${lastEl}"[\\s\\S]*?<\\/div>`);
const lastElMatch = index.match(lastElOpenTag);
let insertAt;
if (lastElMatch) {
  // insert after the last scene's own closing </div>, and after its paired
  // <audio> element if one immediately follows.
  let afterIdx = lastElMatch.index + lastElMatch[0].length;
  const audioAfter = index.slice(afterIdx).match(/^\s*<audio[\s\S]*?><\/audio>/);
  if (audioAfter) afterIdx += audioAfter[0].length;
  insertAt = afterIdx;
} else {
  insertAt = index.lastIndexOf("</div>\n\n    <script>");
}
index = index.slice(0, insertAt) + newSceneBlock + index.slice(insertAt);

// Bump the master root's total duration.
index = index.replace(
  /(<div\s+id="root"[\s\S]*?data-duration=")[\d.]+(")/,
  `$1${newTotal}$2`,
);

// Extend BGM and captions spans (if present) to cover the new total.
index = index.replace(
  /(<audio\s+id="el-bgm"[\s\S]*?data-duration=")[\d.]+(")/,
  `$1${newTotal}$2`,
);
index = index.replace(
  /(<div\s+id="el-captions"[\s\S]*?data-duration=")[\d.]+(")/,
  `$1${newTotal}$2`,
);

// Add the crossfade transition: fade out the previous last frame, fade in
// the outro, and move the full-span timeline anchor to the new total.
const transitionLines =
  `        tl.to("#el-${lastEl.replace(/^el-/, "")}", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, ${outroStart});\n` +
  `        tl.fromTo("#el-${compositionId}", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.inOut" }, ${outroStart});\n`;
index = index.replace(
  /(\s*)tl\.to\(\{\}, \{ duration: [\d.]+ \}, 0\);/,
  `\n${transitionLines}$1tl.to({}, { duration: ${newTotal} }, 0);`,
);

fs.writeFileSync(indexPath, index);

console.log(
  `✓ outro card appended: ${frameFileName} (${theme} theme), start=${outroStart}s duration=${outroDuration}s, new total=${newTotal}s` +
    (outroVoiceRelPath ? `, voice=${outroVoiceRelPath}` : ", voice=none (cached asset missing)"),
);

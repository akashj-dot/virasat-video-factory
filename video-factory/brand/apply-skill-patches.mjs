#!/usr/bin/env node
// Re-applies Virasat's local customizations to the installed ~/.claude/skills/
// tree. `npx hyperframes init` and `npx hyperframes skills update` sync skill
// files from HeyGen's hosted registry and SILENTLY REVERT any local edits —
// confirmed 2026-08-29 when three prior rule additions and a new transition
// type all vanished after running `init` on an unrelated test project.
//
// Run this any time after a skill sync could have happened — in practice,
// that's the start of every video build (every workflow's Step 0 runs
// `npx hyperframes skills update <workflow>`), so run it right after that
// step, before Step 3 (storyboard) so planners can see the added transition.
//
//   node video-factory/brand/apply-skill-patches.mjs
//
// Idempotent: each patch checks for its own marker text and skips if already
// applied. Exits non-zero if an anchor is missing (means the upstream skill
// file changed shape and a patch needs updating, not silent partial success).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SKILLS_ROOT = path.join(os.homedir(), ".claude/skills");
let failures = 0;

function patchText(relFile, marker, anchor, addition) {
  const full = path.join(SKILLS_ROOT, relFile);
  if (!fs.existsSync(full)) {
    console.log(`  ! missing (skipped): ${relFile}`);
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  if (text.includes(marker)) {
    console.log(`  = already patched: ${relFile}`);
    return;
  }
  if (!text.includes(anchor)) {
    console.error(`  ✗ ANCHOR NOT FOUND (skill file changed shape?): ${relFile}`);
    failures++;
    return;
  }
  fs.writeFileSync(full, text.replace(anchor, anchor + addition));
  console.log(`  ✓ patched: ${relFile}`);
}

console.log("--- 1. Top platform-UI safe-zone (portrait) ---");
const TOP_KEEPOUT_MARKER = "also needs a top keep-out";
const TOP_KEEPOUT = `\n\n**Portrait (9:16) also needs a top keep-out.** Reels/Shorts/TikTok render their own chrome (profile pic, follow button, sound toggle) over the top ~8-12% of the frame — plan primary text and key visuals to start clear of that band, the same discipline as the bottom caption zone. This is a planning convention only (no automated pixel-cutoff check for it), so hold it deliberately when placing eyebrows, headers, and upper-third hero elements on a portrait canvas.`;

patchText(
  "faceless-explainer/references/visual-design.md",
  TOP_KEEPOUT_MARKER,
  "The bottom ~17% of the canvas is reserved for the caption pill. Plan every frame's content into the **top ~83%** so nothing important lands in the band (the worker enforces the pixel cutoff; you plan the layout). When captions are enabled, primary content and key visuals **cap at the band top**, and a centered hero anchors at **y ≈ 0.42 × height** (landscape ≈454, portrait ≈806), not the canvas midpoint; background / ambient / surface layers are exempt and may stay full-bleed. Holds even when captions are disabled — bottom-edge consistency.",
  TOP_KEEPOUT,
);
patchText(
  "pr-to-video/references/visual-design.md",
  TOP_KEEPOUT_MARKER,
  "The bottom ~17% of the canvas is reserved for the caption pill. Plan every frame's content into the **top ~83%** (the worker enforces the pixel cutoff). When captions are enabled, primary content caps at the band top, and a centered hero anchors at **y ≈ 0.42 × height** (landscape ≈454, portrait ≈806); background / ambient layers are exempt and may stay full-bleed. Holds even when captions are disabled — bottom-edge consistency.",
  TOP_KEEPOUT,
);
patchText(
  "product-launch-video/references/visual-design.md",
  TOP_KEEPOUT_MARKER,
  "The bottom ~17% of the canvas is reserved for the caption pill. Plan every frame's content into the **top ~83%** so nothing important lands in the band (the worker enforces the pixel cutoff; you plan the layout). Holds even when captions are disabled — bottom-edge consistency.",
  TOP_KEEPOUT,
);

console.log("--- 2. SFX anticipatory lead-time ---");
patchText(
  "media-use/audio/references/sfx.md",
  "Lead the visual",
  "## Rules\n\n- **Volume ~0.35.** SFX must sit under narration and BGM, not fight them.",
  "\n- **Lead the visual, don't trail it.** An impact effect (whoosh, pop, click, impact-bass) reads as synced only when it starts slightly *before* the motion it accents lands — roughly 2-3 frames (~0.08-0.12s) of anticipation at 24-30fps. Set `offset_s` to the cue's target landing time minus that lead, never to the landing time itself; a cue that starts exactly on or after the visual reads as broken/late even when the gap is small. This applies to discrete hits (a card slamming in, a checkmark landing, a counter settling) — not to sustained cues like a riser or ambient bed, which are already timed by their own duration against the beat they build to.",
);

console.log("--- 3. Max-one-glow-per-frame ---");
patchText(
  "hyperframes-creative/references/house-style.md",
  "At most one glowing",
  "- One accent hue. Same background across all scenes.",
  "\n- **At most one glowing or hero-lit element per frame**, even within that single accent hue — two or three simultaneous glows (a card glow, a headline glow, a decorative glow all lit at once) read as \"Vegas,\" not premium, and dilute which element the eye should land on. If a frame's Scene sequence calls for a glow bloom on the hero (`ambient-glow-bloom`) alongside other decoratives, keep the decoratives unlit (dim/static) while the hero glow is active.",
);

console.log("--- 4. Iris/circle-wipe transition ---");

const IRIS_ENTRY = {
  name: "iris",
  tier: "b",
  overlay: false,
  energy: "medium",
  default_duration_s: 0.5,
  directions: [],
  source: "css-radial.md",
  note: "A circular reveal wipe. NEW's growing clip-path circle covers OLD in place — OLD needs no real tween since the mask itself performs the reveal, but the verifier requires the injected block to reference both ids, so OLD gets a no-op opacity reassertion. Promoted 2026-08-29 from the deferred catalog (css-radial.md's 'Circle Iris') into the Tier-B registry; clip-path is paint-only and lint-clean on the master timeline, same as the filter/scaleX properties the other Tier-B types already use. Target radius is 75%, not 100%+ — a CSS circle() percentage resolves against sqrt(w²+h²)/sqrt(2), not against width/height directly, so 75% already reaches past the frame's corners; anything higher makes the wipe complete almost instantly instead of reading as a wipe (verified by rendering and inspecting frames at 3.1s/3.25s/3.4s during a 0.5s transition — 150% covered the whole frame by ~0.1s in).",
  gsap_template: [
    'tl.set(__OLD__, { opacity: 1 }, __T__);',
    'tl.fromTo(__NEW__, { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: __DUR__, ease: "power2.out" }, __T__);',
  ],
};

function patchTransitionsJson(relFile) {
  const full = path.join(SKILLS_ROOT, relFile);
  if (!fs.existsSync(full)) {
    console.log(`  ! missing (skipped): ${relFile}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  if (data.transitions.some((t) => t.name === "iris")) {
    console.log(`  = already patched: ${relFile}`);
    return;
  }
  data.transitions.push(IRIS_ENTRY);
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
  console.log(`  ✓ patched: ${relFile}`);
}
patchTransitionsJson("faceless-explainer/scripts/lib/transitions.json");
patchTransitionsJson("product-launch-video/scripts/lib/transitions.json");
patchTransitionsJson("pr-to-video/scripts/lib/transitions.json");

// Shared human-readable registry doc.
{
  const relFile = "hyperframes-animation/transitions/TRANSITION-REGISTRY.md";
  const full = path.join(SKILLS_ROOT, relFile);
  if (!fs.existsSync(full)) {
    console.log(`  ! missing (skipped): ${relFile}`);
  } else {
    let text = fs.readFileSync(full, "utf8");
    if (text.includes('"name": "iris"')) {
      console.log(`  = already patched: ${relFile}`);
    } else {
      const m = text.match(/## Registry\n\n```json\n([\s\S]*?)\n```/);
      if (!m) {
        console.error(`  ✗ ANCHOR NOT FOUND (skill file changed shape?): ${relFile}`);
        failures++;
      } else {
        const data = JSON.parse(m[1]);
        data.transitions.push(IRIS_ENTRY);
        const newBlock = "## Registry\n\n```json\n" + JSON.stringify(data, null, 2) + "\n```";
        text = text.replace(m[0], newBlock);
        text = text.replace("the 5 in the registry above", "the 6 in the registry above");
        fs.writeFileSync(full, text);
        console.log(`  ✓ patched: ${relFile}`);
      }
    }
  }
}

// Planner-facing "valid transition_in names" lines, so Step 3 storyboarding
// actually knows iris exists and can select it — without this the registry
// entry is reachable but never chosen. These are exhaustive enums, so swap
// the whole line rather than appending prose.
function swapEnumLine(relFile, oldLine, newLine) {
  const full = path.join(SKILLS_ROOT, relFile);
  if (!fs.existsSync(full)) {
    console.log(`  ! missing (skipped): ${relFile}`);
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  if (text.includes(newLine)) {
    console.log(`  = already patched: ${relFile}`);
    return;
  }
  if (!text.includes(oldLine)) {
    console.error(`  ✗ ANCHOR NOT FOUND (skill file changed shape?): ${relFile}`);
    failures++;
    return;
  }
  fs.writeFileSync(full, text.replace(oldLine, newLine));
  console.log(`  ✓ patched: ${relFile}`);
}

swapEnumLine(
  "faceless-explainer/references/story-design.md",
  "`cut | crossfade | blur-crossfade | push-slide LEFT | push-slide RIGHT | push-slide UP | push-slide DOWN | zoom-through | squeeze`",
  "`cut | crossfade | blur-crossfade | push-slide LEFT | push-slide RIGHT | push-slide UP | push-slide DOWN | zoom-through | squeeze | iris`",
);
swapEnumLine(
  "pr-to-video/references/story-design.md",
  "`cut | crossfade | blur-crossfade | push-slide LEFT | push-slide RIGHT | push-slide UP | push-slide DOWN | zoom-through | squeeze`",
  "`cut | crossfade | blur-crossfade | push-slide LEFT | push-slide RIGHT | push-slide UP | push-slide DOWN | zoom-through | squeeze | iris`",
);
swapEnumLine(
  "product-launch-video/references/story-design.md",
  "`transition_in` is a registry type (`crossfade` / `blur-crossfade` / `push-slide` / `zoom-through` / `squeeze`) — default `crossfade` (`blur-crossfade` on a background clash), `zoom-through` at section boundaries, repeated across the video.",
  "`transition_in` is a registry type (`crossfade` / `blur-crossfade` / `push-slide` / `zoom-through` / `squeeze` / `iris`) — default `crossfade` (`blur-crossfade` on a background clash), `zoom-through` at section boundaries, repeated across the video.",
);

if (failures > 0) {
  console.error(`\n${failures} patch(es) failed — an upstream skill file likely changed shape. Review before the next build.`);
  process.exit(1);
}
console.log("\n✓ all skill patches applied (or already present)");

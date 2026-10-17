# Virasat brand — video defaults

These files are the **default design tokens for every Virasat video** going forward — no more picking a generic HyperFrames preset or improvising colors per-video. They're derived directly from `virasat-brand-source.html` (the team's Canva-exported brand kit page), so any color/font change should be made there first, then re-derived here.

## Every build: run this one command

```bash
node video-factory/brand/finalize-brand.mjs <projectDir>
```

Applies the logo watermark AND the closing outro card in one call (runs
`add-logo-overlay.mjs` and `add-outro-card.mjs` for you, in the right order,
including re-running the logo pass so the newly-added outro frame gets
watermarked too). This step is **mandatory on every project** — see the root
`CLAUDE.md`. Run it once, any time after Step 5 (frame build) and before
moving the project to `queue/`.

## Also mandatory: re-apply skill patches after any skill sync

```bash
node video-factory/brand/apply-skill-patches.mjs
```

`npx hyperframes init` / `npx hyperframes skills update <workflow>` (every
workflow's own Step 0) sync `~/.claude/skills/` from HeyGen's hosted registry
and silently revert local edits to skill files. This script re-applies
Virasat's motion/composition customizations on top of whatever the sync just
installed: the portrait top-safe-zone rule, the SFX anticipatory-lead-time
rule, the max-one-glow-per-frame rule, and the `iris` circle-wipe transition.
Idempotent — safe to run any time, including when nothing changed. See the
root `CLAUDE.md` for when exactly to run it.

## Files

- `virasat-brand-source.html` — the source of truth (Canva brand kit export). Colors, fonts, logo file references.
- `virasat-frame-light.md` — HyperFrames `frame.md` design tokens, light theme (warm parchment bg, forest green accent, deep ink text).
- `virasat-frame-dark.md` — HyperFrames `frame.md` design tokens, dark theme (deep ink bg, lighter forest green accent for contrast, warm parchment text) — mirrors the site's own `.dark` class overrides.
- `logo/` — transparent-background logo PNGs for video overlay (`virasat-logo-icon.png`, `virasat-logo-full.png`).
- `add-logo-overlay.mjs` — bakes the persistent logo watermark (top-right corner) into every frame of a built project. Run once per project, any time after Step 5 (frame build): `node video-factory/brand/add-logo-overlay.mjs <projectDir> [--mark=icon|full]` (defaults to `icon`). Safe to run before or after `assemble-index.mjs` — it only touches `compositions/frames/*.html`, never `index.html`.
- `copy-style-guide.md` — copy rules for anything that renders inside the video (script, on-screen text, captions). Currently just one rule: no em dashes. Check this before writing/finalizing SCRIPT.md or any on-screen text.
- `outro/` — the closing waitlist/outro card: `virasat-outro-template.html` (the composition template) and `fonts/` (self-contained Fraunces/Space Mono/Space Grotesk woff2 files it needs, bundled so the card renders correctly even in a project that hasn't fetched those families itself).
- `add-outro-card.mjs` — appends the outro card as a new final scene, AFTER whatever the project's own topic-specific CTA frame is. Run once per project, same window as the logo script: `node video-factory/brand/add-outro-card.mjs <projectDir> [--theme=light|dark] [--duration=4.5]`. Theme auto-detects from the project's `frame.md` if not passed explicitly. Unlike the logo script, this one does edit `index.html` — it appends a new `data-composition-src` scene (the same pattern every other frame already uses), extends the root/BGM/captions durations to match, and adds a crossfade transition from the previous last frame. The exact copy is fixed: "We're building the fix for this." / "Be the first inside." / "link in bio to grab early access" — don't paraphrase it. It also carries a cloned-voice read of that exact copy (`outro/voice-outro.wav`, reused as-is across every project) and wires it in as a voice track, sized off the real clip length plus a short hold rather than a fixed duration.
- `apply-skill-patches.mjs` — re-applies local customizations to `~/.claude/skills/` that `hyperframes init`/`skills update` would otherwise silently wipe. See "Also mandatory" above.

## How a build uses this

At **Step 2 (Design System)** of the `/faceless-explainer` build pipeline, instead of browsing `hyperframes-creative/frame-presets/` and picking a shipped preset, copy the file matching the brief's **Theme** answer (dark or light — one of the standard starter questions) directly into the project root as `frame.md`:

```bash
cp "video-factory/brand/virasat-frame-<light|dark>.md" "<project>/frame.md"
```

This skips `build-frame.mjs`'s preset-remix step entirely — these files are already complete, brand-correct design systems, not presets to remix.

## Video production defaults (2026-08-28 onward)

Apply these on every build — they're conventions to follow when authoring
`STORYBOARD.md` / running the faceless-explainer pipeline scripts, not
something a script enforces automatically:

- **Caption font size** — `captions.mjs`'s built-in default pill sizes text
  at `canvas_height * 0.038` (≈73px on a 1920-tall canvas), which reads too
  large/dominant. After running `captions.mjs build`, edit the generated
  `compositions/captions.html`'s `.caption-group { font-size: ... }` down to
  roughly `canvas_height * 0.027` (≈52px on 1920) before assembling.
- **A brief pause between frames** — bare `transition_in: crossfade` /
  `push-slide UP` in `STORYBOARD.md` uses the pipeline's 0.5s default overlap,
  which reads as a rushed cut. Specify an explicit duration on every
  non-`cut` transition instead, e.g. `transition_in: crossfade 0.85s` /
  `push-slide UP 0.85s` — `transitions.mjs` parses a trailing `Ns`/`N` token
  as an override. Keep deliberate `cut` transitions (hard, no pause) where
  the story wants a sharp beat.
- **BGM volume** — see [[low-bgm-volume]] in memory: default the
  hand-authored `audio_meta.json` `bgm.volume` to ~0.05-0.07, not the
  pipeline's stock 0.12.
- **Company name / pronunciation** — see `copy-style-guide.md`: the company
  is "Virasat" (the leading dot belongs to the logo graphic only, never to
  spoken or on-screen body text), and TTS narration should spell it
  "Vira-sat" (hyphenated) to avoid the model mumbling the final syllable.
- **`STORYBOARD.md` metadata lines need a leading `- `.** `focal:` / `roles:`
  / `sfx:` (and every other per-frame metadata key) must be written as
  `- sfx: whoosh-short`, never bare `sfx: whoosh-short` — the parser
  (`storyboard.mjs`'s `META_RE`) only recognizes bulleted lines; a bare line
  silently falls into free-form narrative text and the field is dropped with
  no warning. Confirmed 2026-08-29: the `epf-money-left-behind` video shipped
  with zero SFX because every `focal`/`roles`/`sfx` line across all 8 frames
  was missing the dash.
- **SFX cue names must match the offline manifest, not describe the sound.**
  With no HeyGen credential, `sfx:` cues resolve only against the 19-key
  bundled library — a cue like `soft whoosh on counter start, tick on
  landing` will never match anything (there is no `tick`) and silently
  resolves to 0 cues. Use exact manifest keys, comma-separated for multiple:
  `chime`, `click-soft`, `click`, `error`, `glitch-1/2/3`,
  `impact-bass-1/2`, `key-press`, `notification`, `ping`, `pop`, `riser`,
  `sparkle`, `typing`, `whoosh-cinematic`, `whoosh-short`, `whoosh`. Check
  `media-use/audio/assets/sfx/manifest.json` for current descriptions before
  picking one. `sfx: none` (exact spelling) marks a frame intentionally
  silent — don't add trailing prose after it.
- **Sound is not optional polish.** A silent video reads as low-effort
  regardless of how good the motion is — treat a 0-cues-resolved `fetch-sfx`
  run as a build-blocking bug, not a thing to shrug off, and verify
  `audio_meta.json`'s `sfx[]` array is non-empty (when the storyboard names
  any cues) before rendering.
- **`job.json`, caption wiring, audio-duration integrity, and card-overflow
  layout are all build-blocking checks now, not optional polish either.**
  See the root `CLAUDE.md`'s "Mandatory pre-render checklist" — four
  separate confirmed 2026-09-19 incidents (missing `job.json` causing skill
  misdetection, captions built but never referenced in `index.html`,
  regenerated voice audio left `audio_meta.json`/`index.html` timing stale
  and truncated narration mid-sentence, and fixed-height cards overflowing
  wrapped text into the next card). Run through that checklist before every
  `queue/` move, not just after something looks wrong.

## Also apply on every build — creative direction (2026-08-29 onward)

The brand's color palette (green/ivory) is locked and not up for revision;
typography was revised 2026-08-29 (Merriweather → Fraunces, see Brand
discipline below — sizes bumped too). What's been under-used beyond that is
craft *within* the palette — variety of shape, camera motion, and background
density. Apply these on every build so future videos don't read as flat or
repetitive:

- **Blueprint variety.** Draw from at least 4-5 distinct blueprints per video
  (`hyperframes-animation/blueprints-index.md`'s role→blueprint menu) —
  don't lean on the same 2-3 shapes (stat counter, kinetic list, title card)
  for the whole runtime. Repeating a blueprint twice in a row is fine when
  it's a genuinely continuous system (e.g. a checklist split across two
  frames); reusing it three-plus times across a video reads as templated.
- **At least one camera-motion beat per video.** A frame built entirely as a
  flat, locked 2D composition (only internal elements animate, the "camera"
  never moves) is the single biggest tell of a static, low-effort build.
  Reach for `multi-phase-camera` (pull-back/focus/push+drift),
  `viewport-change` (pan/zoom/focus-lock), `coordinate-target-zoom`, or —
  for a dramatic moment — `3d-camera-flight`. The hook or the pivot/turn
  frame are usually the best candidates.
- **Decorative density floor.** For any frame beyond a minimal title/CTA
  card, plan the 6-10 visual roles `hyperframes-creative/references/
  video-composition.md`'s Density section calls for (background treatment +
  midground content + foreground accents) — not just a flat field behind one
  card. Background ideas: radial glow, ghost type (theme words at low
  opacity, oversized, slow drift), grain, grid, accent lines.
- **Heritage gold, used deliberately.** `accent-gold-reserved` exists for
  exactly this: spend it on at most one hero/celebratory beat per video (the
  payoff stat, the resolution moment, a completion flourish) — never as a
  second primary accent, never repeated within a video. See Brand discipline
  below for the base rule this refines.

## Brand discipline

- **One accent color only** — forest green (`primary`). Never introduce a second accent hue for emphasis.
- **Heritage gold** (`accent-gold-reserved`) exists in the token set but is *not* a default accent — only use it for a deliberate, rare celebratory/heritage callout, never as a substitute for the green accent.
- **Shadows are allowed** — unlike some prior one-off video themes, the Virasat brand's own site uses a soft warm-tinted card shadow (`shadow.card-md`). Don't strip it out by habit.
- **Fonts** (revised 2026-08-29): **Fraunces** (serif) for headlines/display/blockquotes — replaces Merriweather; variable weight (300-900) with optical sizing, noticeably more character at large display sizes while staying warm/trustworthy. Space Grotesk (sans) for body/UI/numerals, Space Mono for eyebrows/tags/small labels — both unchanged. All three auto-resolve via Google Fonts at `hyperframes check`/`render` time — no manual font file provisioning needed, except the outro card's bundled woff2s (`outro/fonts/Fraunces-Bold.woff2`), which were re-derived from the same swap and need re-deriving again if the weight/family ever changes.
  - Font choice was never actually locked by the brand (only the green/ivory
    palette is) — the previous Merriweather choice was a video-team default,
    not a cross-product constraint. `virasat-brand-source.html`'s own
    `--font-heading` was updated to match, so this is now the canonical
    brand font, not a video-only divergence — carry it into the web app too
    when that gets touched next.
- **Type sizes must hit the "fill the frame" floor.** `hyperframes-creative/references/video-composition.md` calls for headlines at 64-120px and hero text at 60-80% of frame width — treat these as a floor, not a ceiling. The `frame.md` type ramp's `cqw` values were bumped 2026-08-29 for exactly this reason (h1 was 4.0cqw ≈ 43px on a 1080-wide canvas, now 8.2cqw ≈ 89px). When hand-tuning a frame's type size, check it against these numbers before shipping — a headline that reads small in isolation reads *tiny* on a phone screen in a feed.

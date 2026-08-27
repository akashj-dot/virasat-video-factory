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

## Files

- `virasat-brand-source.html` — the source of truth (Canva brand kit export). Colors, fonts, logo file references.
- `virasat-frame-light.md` — HyperFrames `frame.md` design tokens, light theme (warm parchment bg, forest green accent, deep ink text).
- `virasat-frame-dark.md` — HyperFrames `frame.md` design tokens, dark theme (deep ink bg, lighter forest green accent for contrast, warm parchment text) — mirrors the site's own `.dark` class overrides.
- `logo/` — transparent-background logo PNGs for video overlay (`virasat-logo-icon.png`, `virasat-logo-full.png`).
- `add-logo-overlay.mjs` — bakes the persistent logo watermark (top-right corner) into every frame of a built project. Run once per project, any time after Step 5 (frame build): `node video-factory/brand/add-logo-overlay.mjs <projectDir> [--mark=icon|full]` (defaults to `icon`). Safe to run before or after `assemble-index.mjs` — it only touches `compositions/frames/*.html`, never `index.html`.
- `copy-style-guide.md` — copy rules for anything that renders inside the video (script, on-screen text, captions). Currently just one rule: no em dashes. Check this before writing/finalizing SCRIPT.md or any on-screen text.
- `outro/` — the closing waitlist/outro card: `virasat-outro-template.html` (the composition template) and `fonts/` (self-contained Merriweather/Space Mono/Space Grotesk woff2 files it needs, bundled so the card renders correctly even in a project that hasn't fetched those families itself).
- `add-outro-card.mjs` — appends the outro card as a new final scene, AFTER whatever the project's own topic-specific CTA frame is. Run once per project, same window as the logo script: `node video-factory/brand/add-outro-card.mjs <projectDir> [--theme=light|dark] [--duration=4.5]`. Theme auto-detects from the project's `frame.md` if not passed explicitly. Unlike the logo script, this one does edit `index.html` — it appends a new `data-composition-src` scene (the same pattern every other frame already uses), extends the root/BGM/captions durations to match, and adds a crossfade transition from the previous last frame. The exact copy is fixed: "We're building the fix for this." / "Be the first inside." / "link in bio to grab early access" — don't paraphrase it.

## How a build uses this

At **Step 2 (Design System)** of the `/faceless-explainer` build pipeline, instead of browsing `hyperframes-creative/frame-presets/` and picking a shipped preset, copy the file matching the brief's **Theme** answer (dark or light — one of the standard starter questions) directly into the project root as `frame.md`:

```bash
cp "video-factory/brand/virasat-frame-<light|dark>.md" "<project>/frame.md"
```

This skips `build-frame.mjs`'s preset-remix step entirely — these files are already complete, brand-correct design systems, not presets to remix.

## Brand discipline

- **One accent color only** — forest green (`primary`). Never introduce a second accent hue for emphasis.
- **Heritage gold** (`accent-gold-reserved`) exists in the token set but is *not* a default accent — only use it for a deliberate, rare celebratory/heritage callout, never as a substitute for the green accent.
- **Shadows are allowed** — unlike some prior one-off video themes, the Virasat brand's own site uses a soft warm-tinted card shadow (`shadow.card-md`). Don't strip it out by habit.
- **Fonts**: Merriweather (serif) for headlines/display/blockquotes, Space Grotesk (sans) for body/UI/numerals, Space Mono for eyebrows/tags/small labels. All three auto-resolve via Google Fonts at `hyperframes check`/`render` time — no manual font file provisioning needed.

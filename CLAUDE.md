# Virasat Video Factory

This is the permanent working folder for all Virasat videos. The factory app
lives in `video-factory/`.

## Mandatory step for every build — do not skip

After building a project's frames (Step 5 of `/faceless-explainer`, or the
equivalent frame-build step of whichever workflow is in use) and before
moving the project to `video-factory/queue/`, run:

```bash
node "video-factory/brand/finalize-brand.mjs" <projectDir>
```

This bakes in, automatically, on every video with no need to ask the user:

- **Logo watermark** on every frame (top-right corner)
- **Closing waitlist card** as a new final scene, appended after the
  project's own topic-specific CTA frame — exact copy: "We're building the
  fix for this." / "Be the first inside." / "link in bio to grab early
  access". Do not paraphrase this copy.

These are defaults, not something to ask the user about per-video. See
`video-factory/brand/README.md` for what each script actually does and why.

## Also apply on every build

- **Brand design tokens** — copy `video-factory/brand/virasat-frame-light.md`
  or `-dark.md` (per the brief's theme answer) to the project's `frame.md`
  instead of picking a shipped HyperFrames preset. Never introduce a second
  accent color. See `video-factory/brand/README.md`.
- **Brief questions** — use the exact sequence in
  `video-factory/brand/starter-questions.md`, not a generic ad-hoc brief.
- **No em dashes** anywhere in video-facing text — narration script,
  on-screen copy, captions. See `video-factory/brand/copy-style-guide.md`.

## Getting started

Run `./start-factory.sh` (environment check + starts the runner + prints the
dashboard URL). See `video-factory/README.md` for the full day-to-day usage
guide.

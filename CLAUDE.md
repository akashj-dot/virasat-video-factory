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

## Also mandatory — run right after any HyperFrames skill sync

`npx hyperframes init` and `npx hyperframes skills update <workflow>` (which
every workflow runs at its own Step 0) sync skill files from HeyGen's hosted
registry and **silently revert any local customizations** to
`~/.claude/skills/` — confirmed 2026-08-29. Right after either of those runs
(in practice: right after Step 0 of whichever workflow is building the
video), run:

```bash
node "video-factory/brand/apply-skill-patches.mjs"
```

Idempotent — safe to run even when nothing changed. Re-applies: the portrait
top-safe-zone rule, the SFX anticipatory-lead-time rule, the max-one-glow
rule, and the `iris` circle-wipe transition (registered in the transition
registry + the planner-facing story-design docs). If it reports a failed
patch (an anchor not found), the skill file changed shape upstream — flag it
before continuing the build rather than silently skipping.

## Also apply on every build

- **Brand design tokens** — copy `video-factory/brand/virasat-frame-light.md`
  or `-dark.md` (per the brief's theme answer) to the project's `frame.md`
  instead of picking a shipped HyperFrames preset. Never introduce a second
  accent color. See `video-factory/brand/README.md`.
- **Brief questions** — use the exact sequence in
  `video-factory/brand/starter-questions.md`, not a generic ad-hoc brief.
- **No em dashes** anywhere in video-facing text — narration script,
  on-screen copy, captions. See `video-factory/brand/copy-style-guide.md`.

## Mandatory pre-render checklist — do not skip (2026-09-19 onward)

Four separate bugs shipped across multiple videos before being caught and
fixed by hand. All four are now checked automatically or documented here —
verify each one explicitly before moving a project to `video-factory/queue/`:

- **`job.json` must exist**, with at minimum `{"title": ..., "skill":
  "faceless-explainer", "voice": false, "renderArgs": ["--quality",
  "high"]}` (adjust `skill`/`voice` for the actual workflow). Confirmed
  2026-09-19: at least 6 videos (`loans-outlive-the-borrower`,
  `joint-family-split-over-property`, `shares-demat-transmission`,
  `will-you-never-made`, `insurance-agent-is-the-scammer`,
  `women-financial-inheritance-india`) shipped without one. The runner
  (`video-factory/runner.mjs`) now falls back to reading `workflow:` from
  `BRIEF.md` when `job.json` is missing, but don't rely on the fallback —
  write the file. Its absence also means `needsVoice` gets inferred instead
  of stated, which can trigger an unwanted re-voice pass on requeue.
- **Captions must be wired into `index.html`, not just built.**
  `compositions/captions.html` existing on disk means nothing if nothing
  references it. Confirmed 2026-09-19 on `shares-demat-transmission`,
  `will-you-never-made`, and (initially) `insurance-agent-is-the-scammer` and
  `nri-families-india-asset-maze` — all four shipped with zero burned-in
  subtitles despite the caption file being fully built. Verify a
  `data-composition-id="captions" data-composition-src="compositions/
  captions.html"` element actually exists in `index.html`'s track list
  before rendering; `grep -c captions index.html` should return >0.
- **Voice audio duration must match its declared frame timing, exactly.**
  If voice `.wav` files are regenerated, re-run transcription and rebuild
  `audio_meta.json` **and** every frame's cumulative `data-start`/
  `data-duration` in `index.html` (both the video clip and its paired
  `<audio>` element) together — never let one drift from the other.
  Confirmed 2026-09-19 on `women-financial-inheritance-india` (line 3's real
  audio ran 1.6s longer than its frame's declared duration) and
  `insurance-agent-is-the-scammer` (lines 4 and 5 ran 0.8s/1.16s longer) —
  both truncated narration mid-sentence exactly at the frame cut. Before
  rendering, verify with a one-line check per frame:
  `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1
  assets/voice/0N.wav` should match that frame's `<audio data-duration>`
  within ~0.05s.
- **Never give a text-containing card/box a fixed `height` (or fixed
  vertical stacking gap) without verifying it against actual wrapped-text
  height.** Confirmed 2026-09-19 across three separate videos
  (`nri-families-india-asset-maze` frames for two checklist items,
  `women-financial-inheritance-india` frame 3, `insurance-agent-is-the-
  scammer` frame 5) — a card sized/spaced from hand-math assumptions about
  how many lines a headline would wrap to either overflowed into the next
  card (visible collision/merge) or left a large dead gap when the box was
  oversized to be safe. Let cards auto-size (`height: auto`) and verify the
  real rendered result with `npx hyperframes snapshot <dir> --at <t>`
  before finalizing spacing — font metrics and line-wrapping don't reliably
  match arithmetic.

## Getting started

Run `./start-factory.sh` (environment check + starts the runner + prints the
dashboard URL). See `video-factory/README.md` for the full day-to-day usage
guide.

# Virasat Video Factory

This is the permanent working folder for all Virasat videos. The factory app
lives in `video-factory/`.

## Making a video: use `/virasat-video` (factory v2)

Every request for a new Virasat video, reel or batch goes through the
`/virasat-video` skill (`.claude/skills/virasat-video/SKILL.md`). It asks
**only four questions**: topic, theme (dark/light), language
(Hinglish/Hindi/English) and format (9:16 / 4:5 / 1:1 / 16:9). It then
researches, scripts, voices, storyboards, builds, self-reviews and queues the
render on its own. Do not run the old 7-question brief
(`video-factory/brand/starter-questions.md`) or `/faceless-explainer` for new
videos; those are the legacy v1 path, kept only for re-editing old projects.

How v2 works and its authoring API: `video-factory/v2/AUTHORING.md`.

## Brand defaults, applied automatically by v2

`node video-factory/v2/build.mjs <projectDir>` runs
`video-factory/brand/finalize-brand.mjs` itself, which bakes in on every video:

- **Logo watermark** on every frame (top-right corner)
- **Closing waitlist card** as a new final scene, exact copy: "We're building
  the fix for this." / "Be the first inside." / "link in bio to grab early
  access". Do not paraphrase this copy.

Also built in: Virasat dark/light brand tokens (one accent colour only),
cloned voice, BGM at ~0.06, final mix mastered to -14 LUFS by the runner.
**No em dashes** anywhere in video-facing text (narration, on-screen copy,
captions); see `video-factory/brand/copy-style-guide.md`.

## Legacy v1 only: after any HyperFrames skill sync

`npx hyperframes init` / `npx hyperframes skills update` (run at Step 0 of the
v1 HyperFrames workflows, not by v2) sync skill files from HeyGen's registry
and **silently revert local customizations** to `~/.claude/skills/`. Right
after either runs, run `node "video-factory/brand/apply-skill-patches.mjs"`
(idempotent). If it reports a failed patch, flag it before continuing. v1
builds must also run `finalize-brand.mjs` after the frame build and copy
`video-factory/brand/virasat-frame-{light,dark}.md` to `frame.md`.

## Mandatory pre-render checklist — do not skip (2026-09-19 onward)

Applies to hand-built (v1 / HyperFrames-workflow) projects. v2 projects meet
all four automatically: `v2/new.mjs` writes `job.json`, `v2/build.mjs` wires
the captions overlay into `index.html` and derives every clip and audio timing
from the real voice files (`timings.json`), and kit cards size to their
content. For v2, the `/virasat-video` self-review gate (`hyperframes check` +
snapshots) is the equivalent check.

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
dashboard URL), then ask for a video. See `video-factory/README.md` for the
day-to-day guide.

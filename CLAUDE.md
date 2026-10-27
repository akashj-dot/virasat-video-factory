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

## Getting started

Run `./start-factory.sh` (environment check + starts the runner + prints the
dashboard URL), then ask for a video. See `video-factory/README.md` for the
day-to-day guide.

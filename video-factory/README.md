# Virasat Video Factory

A hands-off local render queue + live dashboard for HyperFrames videos.
Drop ideas into Claude → they land in the queue → videos render themselves
(3 at a time), tracked on a live dashboard at http://localhost:4300.

This is the same factory used to ship **200+ videos in a single day**.

## Requirements

- macOS (tested on Apple Silicon)
- Node.js 20+ (`node -v`)
- HyperFrames CLI installed (`npx hyperframes --help`)
- Optional: local voice clone setup (Chatterbox / revoice) for auto-narration

## Start it

```bash
cd video-factory
chmod +x start.command
./start.command
# or: node runner.mjs
```

Dashboard opens at http://localhost:4300/dashboard.html. Leave the Terminal open; close it to stop.

## How to run the factory

1. **Start** the factory (`./start.command`, or `../start-factory.sh` from the repo root).
2. **In Claude Code**, type `/virasat-video <topic>` (or just ask for a video). It asks only
   four things: topic, theme (dark/light), language (Hinglish/Hindi/English) and format
   (9:16 / 4:5 / 1:1 / 16:9). Several topics at once = a batch.
3. Claude then researches, scripts, voices (your cloned voice, checked word by word),
   storyboards, builds and self-reviews the video in `building/<slug>/` (shows as
   **Building** on the dashboard), and moves it to `queue/`.
4. The factory renders 3 at a time and masters the audio. Finished MP4s land in `output/`
   and `~/Desktop/ready-to-post/`.

How v2 works: `v2/AUTHORING.md`. The older 7-question v1 flow (`brand/starter-questions.md`,
`/faceless-explainer`) is legacy, kept for re-editing old projects.

Lifecycle: Building → Queued → Rendering → Done.

## What a job is

Any HyperFrames project folder in `queue/`. **Always write a `job.json`** —
it is not optional in practice, even though the runner will boot without
one:

```json
{
  "title": "My product reel",
  "voice": true,
  "skill": "product-launch-video",
  "renderArgs": ["--quality", "high"]
}
```

Without it, the runner falls back to guessing `skill` and `voice` — the
guess is wrong often enough that at least 6 videos shipped mislabeled or
re-voiced unexpectedly before this was caught (2026-09-19). State `skill`
and `voice` explicitly; don't rely on the fallback. See the root
`CLAUDE.md`'s "Mandatory pre-render checklist" for this and three other
build-blocking checks (caption wiring, audio-duration integrity, card
layout overflow) that have each caused a shipped video to have real,
user-visible defects.

If the folder has `SCRIPT.md` + `STORYBOARD.md` + `audio_meta.json`, the factory runs local voice first, then renders.

## Knobs (top of runner.mjs)

- `RENDER_CONCURRENCY` — default 3
- `PORT` — default 4300
- `EST_RENDER_S` — dashboard ETA estimate

## Folders

`building/` Claude is creating · `queue/` drop zone · `work/` in-progress ·
`done/` + `failed/` archives · `output/` MP4s · `state/` per-job status

## Reality check

This machine renders **3 videos at once**, and voice is **one-at-a-time**.
100 videos ≈ a queue that drains in ~2 hours unattended. Firehose, not teleportation —
which is how 200 in a day is real if you keep feeding the queue.

Included with **Views on Autopilot** (book + video course).

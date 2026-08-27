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

1. **Start** the factory (`./start.command`).
2. **In any Claude Code terminal**, tell Claude your video ideas ("make a reel about X", batch of 10, whatever). Claude should run through `brand/starter-questions.md`'s brief questions first, every time.
3. Claude captures each idea as `building/<slug>/` (shows as **Building** on the dashboard instantly), builds the HyperFrames project, then moves it to `queue/`.
4. The factory **voices + renders** 3 at a time. Finished MP4s land in `output/` and `~/Desktop/ready-to-post/`.

Lifecycle: Building → Queued → Voicing → Rendering → Done.

## What a job is

Any HyperFrames project folder in `queue/`. Optional `job.json`:

```json
{
  "title": "My product reel",
  "voice": true,
  "skill": "product-launch-video",
  "renderArgs": ["--quality", "high"]
}
```

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

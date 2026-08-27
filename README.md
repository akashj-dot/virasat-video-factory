# Virasat Video Factory

Everything needed to build and render Virasat's short-form videos: brand
defaults (colors, fonts, logo, closing card), a render queue, and a live
dashboard.

## Setup (one time)

1. Unzip this folder to your Desktop. Keep the folder named exactly
   `Virasat Video Factory` — `start-factory.sh` and the factory's own scripts
   assume that path.
2. Requirements:
   - macOS
   - [Node.js](https://nodejs.org) 20 or newer (`node -v` to check)
   - [Claude Code](https://claude.com/claude-code) (`claude` CLI) — this is
     how videos actually get built; the factory itself just queues and
     renders
   - ffmpeg — `start-factory.sh` installs it via Homebrew automatically if
     it's missing (needs [Homebrew](https://brew.sh) installed first)
3. Open Terminal, `cd` into this folder, and run:
   ```bash
   ./start-factory.sh
   ```
   This checks your environment, starts the render queue, and opens the
   dashboard at `http://localhost:4300`.

## Making a video

Open a Claude Code session in this folder (`claude` in Terminal, from inside
`Virasat Video Factory/`) and just say what you want — "make a video about
X". Claude reads this folder's `CLAUDE.md` automatically, which tells it to:

1. Ask the brief questions in `video-factory/brand/starter-questions.md`
2. Build the video with HyperFrames
3. Apply the Virasat brand defaults (logo, closing waitlist card, colors/fonts) automatically
4. Drop it into the render queue

Finished videos land in `video-factory/output/` and `~/Desktop/ready-to-post/`.

## Day-to-day usage, folder layout, troubleshooting

See `video-factory/README.md`.

## Brand rules

See `video-factory/brand/README.md` — design tokens, logo, outro card, and
`video-factory/brand/copy-style-guide.md` for on-screen copy rules (no em
dashes, etc). These are defaults; you shouldn't need to think about them
per-video.

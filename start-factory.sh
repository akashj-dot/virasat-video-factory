#!/bin/bash
# Virasat Video Factory — one-shot environment check + startup.
# Usage: ./start-factory.sh
# After this runs and the dashboard is open, just tell Claude Code you want a video —
# it will run through video-factory/brand/starter-questions.md for the brief, build with
# /hyperframes, apply the Virasat brand defaults (video-factory/brand/finalize-brand.mjs),
# and drop the finished project into queue/ for voicing + rendering.

set -e
FACTORY_DIR="$HOME/Desktop/Virasat Video Factory/video-factory"
PORT=4300

echo "== Environment check =="
NODE_VERSION=$(node --version 2>/dev/null || echo "MISSING")
echo "Node: $NODE_VERSION"
if ! command -v ffmpeg &>/dev/null; then
  echo "ffmpeg: MISSING — installing via Homebrew..."
  brew install ffmpeg
else
  echo "ffmpeg: $(ffmpeg -version 2>&1 | head -1)"
fi

echo ""
echo "== HyperFrames CLI =="
npx --yes hyperframes@latest --version 2>&1 | tail -1

echo ""
echo "== Starting the factory =="
if lsof -i ":$PORT" -sTCP:LISTEN &>/dev/null; then
  echo "Runner already listening on :$PORT"
else
  cd "$FACTORY_DIR"
  nohup node runner.mjs > /tmp/vf_runner.log 2>&1 &
  disown
  sleep 2
  cat /tmp/vf_runner.log
fi

echo ""
echo "Dashboard: http://localhost:$PORT"
echo "Queue folder:  $FACTORY_DIR/queue/"
echo "Output folder: $FACTORY_DIR/output/"
echo "Ready to post: $HOME/Desktop/ready-to-post/"
echo ""
echo "Next: tell Claude Code your video brief (topic, language, tone, orientation, sources)."

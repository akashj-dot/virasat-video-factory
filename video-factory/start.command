#!/bin/bash
# Double-click to start the Virasat Video Factory: launches the runner + opens the dashboard.
# Close this Terminal window to stop.
cd "$(dirname "$0")"
echo "Starting Virasat Video Factory…"
( sleep 1; open "http://localhost:4300/dashboard.html" ) &
exec node runner.mjs

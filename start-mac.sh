#!/bin/bash
# ─── PCO Service Dashboard — Mac Launcher ───────────────────────────────────
# Double-click this file (or run it in Terminal) to start the dashboard.
# Requires Node.js — download free at https://nodejs.org if not installed.

cd "$(dirname "$0")"

# Check for Node.js
if ! command -v node &>/dev/null; then
  osascript -e 'display alert "Node.js not found" message "Please install Node.js from https://nodejs.org then try again." as critical'
  exit 1
fi

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (first run only)..."
  npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
  osascript -e 'display alert "Missing .env file" message "Copy .env.example to .env and add your PCO credentials." as critical'
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         PCO Service Dashboard  ✦  v1.0          ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║   Opening:  http://localhost:3000                ║"
echo "║   Press Ctrl+C here to stop the server           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Start server in background, wait a moment, then open Chrome
node server.js &
SERVER_PID=$!

sleep 1.5
open -a "Google Chrome" "http://localhost:3000"

# Wait for server process (keeps the terminal alive)
wait $SERVER_PID

#!/bin/bash
# Legacy local server launcher for macOS.
# Preferred workflow is now the Electron desktop app via: npm run electron
# Keep this only for browser-only standalone server mode.

cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
  osascript -e 'display alert "Node.js not found" message "Please install Node.js from https://nodejs.org then try again." as critical'
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (first run only)..."
  npm install
fi

echo ""
echo "PCO Service Dashboard (legacy standalone server mode)"
echo "Opening http://127.0.0.1:3000"
echo "Press Ctrl+C here to stop the server"
echo ""

node server.js &
SERVER_PID=$!

sleep 1.5
open "http://127.0.0.1:3000"

wait $SERVER_PID

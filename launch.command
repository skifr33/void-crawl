#!/bin/bash
# ── VOID CRAWL — Launch Script ──────────────────────────────
# Double-click this file in Finder to start the game.

cd "$(dirname "$0")"

# ── Resolve node / npm ──────────────────────────────────────
NPM=""
for candidate in npm /opt/homebrew/bin/npm /usr/local/bin/npm; do
  if command -v "$candidate" &>/dev/null; then
    NPM="$candidate"; break
  fi
done

if [ -z "$NPM" ]; then
  echo "ERROR: npm not found. Install Node.js from https://nodejs.org"
  read -p "Press Enter to close..."
  exit 1
fi

# ── Install dependencies if needed ─────────────────────────
if [ ! -d "node_modules" ]; then
  echo "First run — installing dependencies..."
  "$NPM" install
fi

# ── Open browser after server starts ───────────────────────
(sleep 2 && open http://localhost:5173) &

# ── Start dev server ───────────────────────────────────────
echo ""
echo "  VOID CRAWL — http://localhost:5173"
echo "  Close this window to stop the server."
echo ""
"$NPM" run dev

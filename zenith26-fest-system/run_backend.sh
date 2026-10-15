#!/bin/bash
# Zenith '26 Backend Server Startup Script
# Usage: ./run_backend.sh [port] (defaults to 8080)
PORT="${1:-8080}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "⚡ Starting Zenith '26 FastAPI server on port $PORT..."
echo "📍 Access web portal at: http://localhost:$PORT/"
echo "📱 Android emulator connects at: http://10.0.2.2:$PORT/"

exec .venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port "$PORT" --reload

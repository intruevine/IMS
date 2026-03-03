#!/bin/sh

set -eu

APP_DIR="/volume1/web_packages/MA/server"
NODE_BIN="/var/packages/Node.js_v20/target/usr/local/bin/node"
OUT_LOG="$APP_DIR/run-backend.out.log"
ERR_LOG="$APP_DIR/run-backend.err.log"

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  echo "[ERROR] Missing $APP_DIR/.env"
  exit 1
fi

if [ ! -x "$NODE_BIN" ]; then
  echo "[ERROR] Node binary not found: $NODE_BIN"
  exit 1
fi

pkill -f "node index.js" >/dev/null 2>&1 || true

chmod 644 .env db.js index.js routes/*.js middleware/*.js

nohup "$NODE_BIN" index.js >"$OUT_LOG" 2>"$ERR_LOG" </dev/null &

sleep 3

echo "[INFO] Backend started. Health check:"
curl -fsS http://127.0.0.1:3001/api/
echo
echo "[INFO] Logs:"
echo "  OUT: $OUT_LOG"
echo "  ERR: $ERR_LOG"

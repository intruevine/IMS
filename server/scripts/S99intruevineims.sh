#!/bin/sh

# Synology rc.d boot script for Intruevine IMS backend

APP_DIR="/volume1/web_packages/MA/server"
RUN_SCRIPT="$APP_DIR/scripts/run-api.sh"

case "$1" in
  start)
    echo "[INFO] Starting Intruevine IMS backend"
    sh "$RUN_SCRIPT"
    ;;
  stop)
    echo "[INFO] Stopping Intruevine IMS backend"
    pkill -f "node index.js" >/dev/null 2>&1 || true
    ;;
  restart)
    echo "[INFO] Restarting Intruevine IMS backend"
    pkill -f "node index.js" >/dev/null 2>&1 || true
    sleep 2
    sh "$RUN_SCRIPT"
    ;;
  status)
    if pgrep -f "node index.js" >/dev/null 2>&1; then
      echo "Intruevine IMS backend is running"
      exit 0
    fi

    echo "Intruevine IMS backend is stopped"
    exit 1
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

exit 0

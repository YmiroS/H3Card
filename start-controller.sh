#!/usr/bin/env bash
set -Eeuo pipefail

# Editable settings
SERVICE_NAME="${SERVICE_NAME:-h3card-controller.service}"
PORT="${CHOUKA_PORT:-8199}"
LOG_LINES="${LOG_LINES:-100}"
ACTION="${1:-start}"
LAN_IP=""
for ip in $(hostname -I 2>/dev/null || true); do
  case "$ip" in
    *:*|127.*|169.254.*) continue ;;
  esac
  LAN_IP="$ip"
  break
done

show_urls() {
  printf '\nController dashboard:\n  http://127.0.0.1:%s/controller\n' "$PORT"
  if [[ -n "$LAN_IP" ]]; then
    printf '  http://%s:%s/controller\n' "$LAN_IP" "$PORT"
  fi
  printf '\nChouka Web:\n  http://127.0.0.1:%s/\n' "$PORT"
  if [[ -n "$LAN_IP" ]]; then
    printf '  http://%s:%s/\n' "$LAN_IP" "$PORT"
  fi
  printf '\n'
}

case "$ACTION" in
  start)
    systemctl --user start "$SERVICE_NAME"
    systemctl --user --no-pager --full status "$SERVICE_NAME"
    show_urls
    printf 'Press Ctrl+C to stop watching logs. The service will keep running.\n\n'
    exec journalctl --user -u "$SERVICE_NAME" -n "$LOG_LINES" -f
    ;;
  restart)
    systemctl --user restart "$SERVICE_NAME"
    systemctl --user --no-pager --full status "$SERVICE_NAME"
    show_urls
    printf 'Press Ctrl+C to stop watching logs. The service will keep running.\n\n'
    exec journalctl --user -u "$SERVICE_NAME" -n "$LOG_LINES" -f
    ;;
  logs)
    exec journalctl --user -u "$SERVICE_NAME" -n "$LOG_LINES" -f
    ;;
  status)
    systemctl --user --no-pager --full status "$SERVICE_NAME"
    show_urls
    ;;
  stop)
    systemctl --user stop "$SERVICE_NAME"
    printf '%s stopped.\n' "$SERVICE_NAME"
    ;;
  *)
    printf 'Usage: %s [start|restart|logs|status|stop]\n' "$0" >&2
    exit 2
    ;;
esac

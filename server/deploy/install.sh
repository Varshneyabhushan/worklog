#!/usr/bin/env bash
# Builds the server and installs it as a systemd user service that starts with WSL.
set -euo pipefail

server_dir="$(cd "$(dirname "$0")/.." && pwd)"
node_bin="$(command -v node)"
unit_dir="$HOME/.config/systemd/user"

[ -f "$server_dir/.env" ] || { echo "missing $server_dir/.env; copy sample.env first" >&2; exit 1; }

(cd "$server_dir" && npm ci && npm run build)

mkdir -p "$unit_dir"
sed -e "s#@WORKDIR@#$server_dir#" -e "s#@NODE@#$node_bin#" \
   "$server_dir/deploy/worklog.service.template" > "$unit_dir/worklog.service"

systemctl --user daemon-reload
systemctl --user enable --now worklog.service
systemctl --user --no-pager status worklog.service

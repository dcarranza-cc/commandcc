#!/usr/bin/env bash
set -euo pipefail

C2_IP="143.198.36.132"
C2_PORT="9090"
C2_BASE="/opt/fleet-c2"

FLEET_IPS=(
  "138.197.139.75"
  "159.203.31.72"
  "147.182.159.180"
  "138.197.150.69"
  "38.143.209.70"
  "137.184.164.190"
  "167.99.183.227"
)
FLEET_COMMENTS=(
  "EMPIRE1"
  "AXL-PROTOCOL"
  "AGENTXCHANGE"
  "MACHINEDEX"
  "MOTHERSHIP"
  "BATTLEGROUNDS"
  "MARKETING"
)

usage() {
  echo "Usage:"
  echo "  bash deploy.sh c2              - Full C2 server setup (run on command node)"
  echo "  bash deploy.sh client CALLSIGN - Client setup (run on fleet server)"
  exit 1
}

deploy_c2() {
  echo "[C2] Deploying CommandCC server on ${C2_IP}:${C2_PORT}"

  # Directory structure
  echo "[C2] Creating directory structure..."
  sudo mkdir -p "${C2_BASE}"/{incoming,outgoing,archive,units,opords,handoffs,claude-md,app}

  CALLSIGNS=(OPS-EMPIRE ARCH-EMPIRE PROTO EXCHANGE MDEX MOTHER BATTLE MKTG COMMAND)
  for cs in "${CALLSIGNS[@]}"; do
    sudo mkdir -p "${C2_BASE}/outgoing/${cs}"
  done

  sudo chown -R "$(whoami):$(whoami)" "${C2_BASE}"

  # Install dependencies
  echo "[C2] Installing Node.js dependencies..."
  cd "${C2_BASE}/app"
  npm install --production 2>&1 | tail -3

  # Systemd service
  echo "[C2] Setting up systemd service..."
  sudo tee /etc/systemd/system/fleet-c2.service > /dev/null << EOF
[Unit]
Description=AXL Fleet C2, Command Node
After=network.target

[Service]
Type=simple
User=$(whoami)
Group=$(whoami)
WorkingDirectory=${C2_BASE}/app
ExecStart=/usr/bin/node ${C2_BASE}/app/server.js
Restart=always
RestartSec=5
Environment=C2_PORT=${C2_PORT}
Environment=C2_BASE=${C2_BASE}

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable fleet-c2
  sudo systemctl restart fleet-c2
  echo "[C2] Service started."

  # UFW rules
  echo "[C2] Configuring firewall..."
  for i in "${!FLEET_IPS[@]}"; do
    sudo ufw allow from "${FLEET_IPS[$i]}" to any port "${C2_PORT}" comment "${FLEET_COMMENTS[$i]}" 2>/dev/null || true
  done
  sudo ufw allow from 127.0.0.1 to any port "${C2_PORT}" comment "local" 2>/dev/null || true
  echo "[C2] Firewall configured."

  # Verify
  sleep 2
  echo ""
  echo "[C2] Health check:"
  curl -s "http://localhost:${C2_PORT}/health" && echo ""
  echo ""
  echo "[C2] CommandCC deployment complete."
}

deploy_client() {
  local CALLSIGN="${1:-}"
  if [ -z "${CALLSIGN}" ]; then
    echo "Error: CALLSIGN required"
    usage
  fi

  echo "[CLIENT] Deploying fleet-c2 MCP client for ${CALLSIGN}"

  # Create app directory
  sudo mkdir -p "${C2_BASE}/app"
  sudo chown -R "$(whoami):$(whoami)" "${C2_BASE}"

  # Copy mcp-server.mjs (must already be in place or scp'd)
  if [ ! -f "${C2_BASE}/app/mcp-server.mjs" ]; then
    echo "[CLIENT] ERROR: ${C2_BASE}/app/mcp-server.mjs not found."
    echo "[CLIENT] SCP it from the C2 server first:"
    echo "  scp ${C2_IP}:${C2_BASE}/app/mcp-server.mjs ${C2_BASE}/app/"
    exit 1
  fi

  # Install MCP SDK
  echo "[CLIENT] Installing @modelcontextprotocol/sdk..."
  cd "${C2_BASE}/app"
  if [ ! -f package.json ]; then
    npm init -y > /dev/null 2>&1
  fi
  npm install @modelcontextprotocol/sdk zod 2>&1 | tail -3

  # Copy CLAUDE.md to project root if available
  if [ -f "${C2_BASE}/claude-md/${CALLSIGN}.md" ]; then
    cp "${C2_BASE}/claude-md/${CALLSIGN}.md" "${HOME}/CLAUDE.md"
    echo "[CLIENT] CLAUDE.md installed to ${HOME}/CLAUDE.md"
  else
    echo "[CLIENT] WARNING: No CLAUDE.md template found for ${CALLSIGN}"
    echo "[CLIENT] SCP it from C2: scp ${C2_IP}:${C2_BASE}/claude-md/${CALLSIGN}.md ${C2_BASE}/claude-md/"
  fi

  echo ""
  echo "[CLIENT] Register with Claude Code by running:"
  echo ""
  echo "  claude mcp add fleet-c2 --scope user \\"
  echo "    -e C2_URL=http://${C2_IP}:${C2_PORT} \\"
  echo "    -e C2_CALLSIGN=${CALLSIGN} \\"
  echo "    -- node ${C2_BASE}/app/mcp-server.mjs"
  echo ""
  echo "[CLIENT] Deployment complete for ${CALLSIGN}."
}

case "${1:-}" in
  c2) deploy_c2 ;;
  client) deploy_client "${2:-}" ;;
  *) usage ;;
esac

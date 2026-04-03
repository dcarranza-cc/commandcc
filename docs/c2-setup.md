# C2 Server Setup

The C2 (Command and Control) server is the backbone for multi-server CommandCC fleet deployments. Instead of all agents running on one machine, your fleet can span multiple servers, VMs, or containers, all coordinated through a shared REST API and file-based message store.

This is optional. Single-machine operations do not need the C2 server. Set it up when you want to distribute the agent workload across multiple machines, run very large operations (64+ agents), or maintain persistent fleet state across operations.

---

## What the C2 Server Does

The C2 server is a lightweight REST API that provides:

- **Unit registration.** Fleet members check in with their identity and receive their current orders.
- **Order distribution.** The operator pushes objectives and FRAGOs (fragmentary orders) through the C2. All connected units receive them on next check-in.
- **Report aggregation.** Units submit SITREPs and completed artifacts to the C2 store. The operator reads all reports from one place.
- **File-based message store.** All messages, orders, and reports persist on disk. If the C2 server restarts, no state is lost.
- **MCP tool exposure.** The C2 server exposes 6 MCP tools to each connected Claude Code unit so agents can interact with the C2 through standard tool calls.
- **TUI command post.** A terminal UI for the human operator to monitor fleet status, push orders, and read incoming reports.

The C2 server does not run agents. It is infrastructure. Agents run on the fleet units. The C2 is the shared coordination layer.

---

## Architecture Overview

```
                        OPERATOR
                           |
                    [TUI Command Post]
                           |
                     [C2 Server]
                    /      |      \
              [Unit A]  [Unit B]  [Unit C]
              claude     claude    claude
              (machine1) (machine2) (machine3)
```

Each unit is a machine running Claude Code with the CommandCC agents installed. Each unit connects to the C2 server via the 6 MCP tools. The operator manages all units from the TUI command post on the C2 server.

---

## Installation

### C2 Server Setup

The C2 server runs on a dedicated machine, VM, or container. It needs to be network-reachable from all fleet units.

**Requirements:**
- Linux/macOS server
- Python 3.10+
- Open port (default: 7331)
- Persistent disk for the message store

**Install:**

```bash
git clone https://github.com/axlprotocol/commandcc
cd commandcc/c2
pip install -r requirements.txt
```

**Configure:**

Copy the example config:

```bash
cp c2.config.example.yaml c2.config.yaml
```

Edit `c2.config.yaml`:

```yaml
server:
  host: 0.0.0.0
  port: 7331
  secret_key: your-secret-key-here   # change this

store:
  path: ./c2-store                   # message store directory

fleet:
  max_units: 32
  checkin_interval_seconds: 30
  unit_timeout_seconds: 120

tui:
  refresh_rate_ms: 500
```

**Start the server:**

```bash
python c2_server.py --config c2.config.yaml
```

The server starts and prints:

```
C2 Server started on 0.0.0.0:7331
Message store: ./c2-store
TUI: launch with `python c2_tui.py --server localhost:7331`
```

---

## Using deploy.sh

The `deploy.sh` script handles setup for both the C2 server and the fleet units.

**C2 mode** (run on the C2 server):

```bash
./deploy.sh --mode c2 --port 7331 --secret YOUR_SECRET
```

This starts the C2 server, initializes the message store, and launches the TUI.

**Client mode** (run on each fleet unit):

```bash
./deploy.sh --mode client --c2-host 192.168.1.10 --c2-port 7331 --secret YOUR_SECRET --unit-id unit-alpha
```

This:
1. Installs the MCP server configuration into Claude Code on the current machine
2. Registers the 6 C2 tools as available to all agents
3. Checks in with the C2 server to confirm connectivity
4. Prints the unit status to confirm readiness

You can also run `deploy.sh` without arguments for an interactive setup wizard.

---

## Firewall Configuration

The C2 server needs inbound access from all fleet units on its port (default 7331).

**Minimal firewall rules (ufw example):**

```bash
# On the C2 server
ufw allow from 10.0.0.0/8 to any port 7331  # Allow private network
ufw allow from 192.168.0.0/16 to any port 7331
# Deny public access unless you have TLS and auth configured
ufw deny 7331
```

**For internet-accessible deployments**, put the C2 server behind HTTPS with TLS termination and token authentication:

```yaml
# c2.config.yaml
server:
  tls: true
  cert_file: /path/to/cert.pem
  key_file: /path/to/key.pem
  require_token: true
  token: your-bearer-token
```

All communication between units and the C2 server uses this token in the `Authorization: Bearer` header.

---

## The 6 MCP Tools

Each fleet unit gets these 6 tools injected into its Claude Code environment through the MCP server configuration. Agents call them like any other tool.

### `c2_checkin`

Register the unit and receive current operation orders.

```
c2_checkin(unit_id: str, capabilities: list[str]) -> dict
```

Returns: current operation orders, any pending FRAGOs, and the last known fleet status summary.

Units should call this at the start of every operation. If the C2 has new orders since the unit last checked in, they are delivered here.

### `c2_sitrep`

Submit a situation report from the unit.

```
c2_sitrep(unit_id: str, phase: str, status: str, message: str) -> dict
```

The SITREP is recorded in the C2 store and displayed in the operator TUI. Use for progress updates, phase completions, and anomaly reporting.

### `c2_receive_orders`

Pull the latest FRAGO or updated objectives from the C2.

```
c2_receive_orders(unit_id: str, since_sequence: int) -> list[Order]
```

Returns all orders issued after `since_sequence`. Units track their last received sequence number and call this to check for new orders between phases.

### `c2_submit_report`

Push a completed artifact to the C2 store.

```
c2_submit_report(unit_id: str, artifact_name: str, content: str, artifact_type: str) -> dict
```

Used when a unit produces an artifact that the operator or another unit needs to access. Artifacts are stored in the C2 file store and indexed by name and type.

### `c2_request_resource`

Request a file or artifact from the C2 store that was produced by another unit.

```
c2_request_resource(unit_id: str, resource_name: str) -> str
```

Returns the content of the requested artifact. Used when units in the build phase need to read architecture documents produced by the architecture phase on a different machine.

### `c2_broadcast`

Send a message to all units in the fleet.

```
c2_broadcast(unit_id: str, message_type: str, content: str) -> dict
```

Message types: `SITREP`, `SPOTREP`, `FRAGO`, `ALERT`. Most agents do not need to broadcast. This tool is primarily for the operator to push emergency orders (`FRAGO`) or the integrator to signal operation completion to all units.

---

## How Units Check In, Receive Orders, and Submit Reports

### Operation Start Protocol

1. Operator pushes operation objectives to the C2 TUI.
2. Operator broadcasts `FRAGO` with the new objectives and operation name.
3. Each unit calls `c2_checkin` and receives the FRAGO.
4. Units acknowledge receipt with a `c2_sitrep` call.

### During Operation

Between each phase, units call `c2_receive_orders` to check for updated instructions. If the operator has issued a FRAGO (e.g., "drop objective 3, it is already deployed"), units receive it here and adjust before the next phase.

At the end of each phase, the unit submits its artifacts with `c2_submit_report`. The C2 store becomes the shared artifact repository. Units in later phases call `c2_request_resource` to pull artifacts they need.

### Operation Close Protocol

1. The integrator unit produces `BATTLE-MAP.md`.
2. The integrator calls `c2_submit_report` with the battle map.
3. The integrator calls `c2_broadcast` with message type `SITREP` and content `OPERATION COMPLETE`.
4. The C2 TUI shows the final status. The operator reads the battle map from the TUI or directly from the C2 store.

---

## The TUI Command Post

Launch the operator TUI from the C2 server:

```bash
python c2_tui.py --server localhost:7331
```

The TUI displays:

```
============================================================
  COMMANDCC C2 -- OPERATION: OPBLITZ3 -- 13:42:07 UTC
============================================================

FLEET STATUS (4 units)
  unit-alpha    ACTIVE    Phase 4: BUILD    Sub-obj 1/3 complete
  unit-bravo    ACTIVE    Phase 4: BUILD    Sub-obj 2/3 complete
  unit-charlie  ACTIVE    Phase 4: BUILD    Sub-obj 3/3 complete
  unit-delta    IDLE      Awaiting orders

RECENT SITREPS
  13:41:55  unit-alpha   Phase 3 COMPLETE -- ARCH-1.md through ARCH-3.md produced
  13:41:58  unit-bravo   Phase 3 COMPLETE -- ARCH-4.md through ARCH-6.md produced
  13:42:01  unit-charlie Phase 3 COMPLETE -- ARCH-7.md through ARCH-9.md produced
  13:42:03  unit-alpha   Phase 4 BEGIN -- Launching 3 builders

ARTIFACTS IN STORE (9)
  RECON-REPORT.md         unit-alpha  13:40:15
  OPERATION-PLAN.md       unit-alpha  13:40:52
  DECOMPOSITION.md        unit-alpha  13:41:10
  ARCH-1.md               unit-alpha  13:41:55
  ...

[P] Push FRAGO   [R] Read artifact   [B] Broadcast   [Q] Quit
```

Press `P` to push a fragmentary order to the fleet. Press `R` to read any artifact in the store. Press `B` to broadcast to all units. The TUI refreshes every 500ms.

---

## Single-Machine vs. Multi-Machine Decision Guide

| Use Case | Recommendation |
|---|---|
| 1-4 objectives, one developer | No C2 needed. Run operations locally. |
| 5-8 objectives, one developer | No C2 needed. Local operations with batching. |
| 8+ objectives, time-critical | C2 server distributes load across machines |
| Team of operators, shared state | C2 server provides shared artifact store and fleet visibility |
| Continuous deployment pipeline | C2 server with CI/CD integration |
| Air-gapped or regulated environment | C2 server on private network with TLS + token auth |

The C2 server adds operational overhead. Do not use it unless you need it. The single-machine pattern covers the majority of operations.

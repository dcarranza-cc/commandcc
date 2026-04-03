# CommandCC

**16 agents. 4 features. 131 tests. 13 minutes.**

**Command Claude Code. Conquer.**

---

CommandCC is a military-grade orchestration system for Claude Code. One human commands 16 to 128 AI agents from a single terminal. You type objectives. The system deploys a coordinated fleet of specialized agents across parallel waves. You read the battle map when it is done.

This is not a framework. This is a doctrine.

---

## The Proof: OPERATION OPBLITZ3

The operator typed four sentences. The system deployed 16 agents across 4 phases. When the operation completed 13 minutes later, 4 features had been implemented with 131 tests, all passing. Human cognitive load compression: **200x**.

| Metric | Value |
|---|---|
| Human input | ~4 sentences |
| Agents deployed | 16 |
| Features implemented | 4 |
| Tests written | 131 |
| Tests passing | 131 |
| Wall clock time | 13 minutes |
| Cognitive load compression | 200x |

See [BATTLE-MAP-OPBLITZ3.md](./BATTLE-MAP-OPBLITZ3.md) for the full record. See [examples/OPBLITZ3/](./examples/OPBLITZ3/) for the complete walkthrough.

---

## Architecture: The 9-Phase Octopus

Nine sequential phases. Each phase fans out into parallel agents, then collapses into a shared artifact before the next phase begins. The arms of the octopus are your agents. The spine is the artifact chain.

```
                          OPERATOR
                             |
              _______________v_______________
             |                               |
             |        Phase 0: RECON         |
             |   [scout] [scout] [scout] ...  |   <- Haiku, READ-ONLY, 30s
             |_______________________________|
                             |
                      RECON-REPORT.md
                             |
              _______________v_______________
             |                               |
             |       Phase 1: STRATEGY       |
             |           [strategist]         |   <- Opus, 2 min
             |_______________________________|
                             |
                      OPERATION-PLAN.md
                             |
              _______________v_______________
             |                               |
             |      Phase 2: DECOMPOSE       |
             |           [decomposer]         |   <- Opus, THE MULTIPLIER
             |_______________________________|
                    |    |    |    |
               _____|    |    |    |_____
              |          |    |          |
           ARCH-1      ARCH-2  ARCH-3  ARCH-4
              |
    __________v__________
   |   Phase 3: ARCH     |
   | [arch][arch][arch]  |   <- Opus parallel, 3 min
   |_____________________|
              |
    __________v__________
   |   Phase 4: BUILD    |
   | [bld] [bld] [bld]  |   <- Sonnet parallel, 5 min
   |_____________________|
              |
    __________v__________
   |   Phase 5: WIRE     |
   | [wire][wire][wire]  |   <- Sonnet parallel, 3 min
   |_____________________|
              |
    __________v__________
   |   Phase 6: TEST     |
   | [tst] [tst] [tst]  |   <- Sonnet parallel, 3 min
   |_____________________|
              |
    __________v__________
   |   Phase 7: REVIEW   |
   | [rev] [rev] [rev]  |   <- Opus parallel, 2 min
   |_____________________|
              |
    __________v__________
   |  Phase 8: INTEGRATE |
   |     [integrator]    |   <- Opus, 2 min
   |_____________________|
              |
         BATTLE-MAP.md
              |
           OPERATOR
```

---

## Agent Hierarchy

Three tiers. Each tier has a defined role, model, and access profile. Agents do not improvise outside their tier.

| Tier | Model | Role | Access | Agents | Count |
|------|-------|------|--------|--------|-------|
| **COMMAND** | Opus | Think, strategize, design, review | READ-ONLY | strategist, decomposer, integrator, architects, reviewers | 2-6 per op |
| **OPERATIONS** | Sonnet | Build, wire, implement, test | FULL R/W | builders, wirers, testers | 4-64 per op |
| **RECON** | Haiku | Scan, check, report | READ-ONLY | scouts | 4-16 per op |

Command tier never writes application code. It writes plans. Operations tier never modifies plans. It executes them. Recon tier never writes anything. It observes and reports.

---

## The Decomposer: The Force Multiplier

The Decomposer is the key innovation in CommandCC. It is a single Opus agent that sits between strategy and architecture and turns sequential work into massively parallel work.

**One objective becomes four independent sub-objectives.**
**Four independent sub-objectives become four architect tracks.**
**Four architect tracks become sixteen builder slots.**

The Decomposer's only job is to find the natural fault lines in a problem and split along them, guaranteeing that no two sub-objectives share a file, a component, or a dependency. Downstream agents can run fully in parallel because the Decomposer has already proven they cannot interfere with each other.

### The Math

```
Human types 4 objectives (4 sentences)
    |
    v
Decomposer produces 3 sub-objectives per objective = 12 sub-objectives
    |
    v
Each sub-objective gets:
  - 1 architect      = 12 architects
  - 1 builder        = 12 builders
  - 1 wirer          = 12 wirers (some shared)
  - 1 tester         = 12 testers
  - 1 reviewer       = 12 reviewers
    |
    v
12 x 5 roles = 60 execution agents
+ recon scouts (4) + strategist (1) + decomposer (1) + integrator (1) = overhead 7
    |
    v
TOTAL: ~67 agents from 4 sentences
```

At maximum decomposition (4 sub-objectives per objective, 16 input objectives), CommandCC deploys **128+ agents** from a single operation trigger.

---

## Quick Start

### 1. Install agents

```bash
# Clone the repo
git clone https://github.com/axlprotocol/commandcc
cd your-project

# Copy agent definitions
mkdir -p .claude/agents
cp -r /path/to/commandcc/agents/* .claude/agents/
```

### 2. Install an operation template

```bash
mkdir -p .claude/commands
cp /path/to/commandcc/operations/feature-deploy.md .claude/commands/feature-deploy.md
```

### 3. Run

Open Claude Code in your project:

```bash
claude
```

Then trigger the operation:

```
/feature-deploy Add user authentication, payment processing, email notifications, and admin dashboard
```

That is it. The fleet deploys. Read the battle map when it is done.

---

## Pre-Built Operations

Eight operations ready to use. Copy any to `.claude/commands/`.

| Command | Pattern | Purpose | Time |
|---------|---------|---------|------|
| `/feature-deploy` | 9-phase octopus | Deploy 1-8 features in parallel | ~22 min |
| `/feature-deploy-lite` | 4-phase | 1-2 features, faster path | ~10 min |
| `/security-audit` | 6-phase | Full OWASP security sweep | ~18 min |
| `/codebase-migration` | 7-phase | Migrate framework X to Y | ~25 min |
| `/research-sprint` | 4-phase | Research N topics, synthesize | ~12 min |
| `/test-blitz` | 5-phase | Comprehensive test coverage | ~15 min |
| `/documentation-sprint` | 5-phase | Document all modules | ~15 min |
| `/refactor-sweep` | 6-phase | Refactor N modules in parallel | ~20 min |
| `/incident-response` | FAST TRACK | Diagnose and fix production incident | ~8 min |

---

## Pre-Built Agents (25+)

Agents organized into 7 categories. Drop any into `.claude/agents/`.

**COMMAND**
- `command/strategist` -- Operation planning from recon
- `command/decomposer` -- The Multiplier. Breaks objectives into parallel sub-objectives
- `command/integrator` -- Assembles BATTLE-MAP.md from all review outputs

**ARCHITECT**
- `architect/system-architect` -- Full system design documents
- `architect/security-architect` -- Threat model and security design
- `architect/data-architect` -- Schema, migration, and data flow design
- `architect/api-architect` -- API contract and interface design

**BUILDER**
- `builder/backend-builder` -- Server-side implementation
- `builder/frontend-builder` -- UI and client-side implementation
- `builder/api-builder` -- API endpoints and middleware
- `builder/database-builder` -- Schema and migration execution
- `builder/infra-builder` -- Infrastructure, Docker, CI/CD

**WIRER**
- `wirer/import-wirer` -- Resolves import paths after parallel builds
- `wirer/config-wirer` -- Merges config files and env variables
- `wirer/startup-wirer` -- Service registration and startup ordering

**TESTER**
- `tester/unit-tester` -- Unit test suites per sub-objective
- `tester/integration-tester` -- Cross-service integration tests
- `tester/security-tester` -- Vulnerability and auth testing
- `tester/load-tester` -- Performance and load testing

**REVIEWER**
- `reviewer/code-reviewer` -- Code quality and correctness
- `reviewer/security-reviewer` -- Security posture review
- `reviewer/architecture-reviewer` -- Architecture conformance
- `reviewer/compliance-reviewer` -- Compliance and standards

**SCOUT** (Haiku, READ-ONLY)
- `scout/codebase-scout` -- File structure and code map
- `scout/dependency-scout` -- Dependency versions and conflicts
- `scout/security-scout` -- Quick vulnerability scan
- `scout/test-scout` -- Existing test coverage map

---

## C2 Server: Fleet Backbone

For multi-server deployments, the C2 (Command and Control) server acts as the REST backbone for your agent fleet. Units check in from separate machines, receive orders, and submit reports through a shared file-based message store.

The C2 server provides 6 MCP tools to every connected unit:

- `c2_checkin` -- Register unit and receive current operation orders
- `c2_sitrep` -- Submit a situation report
- `c2_receive_orders` -- Pull latest FRAGO or updated objectives
- `c2_submit_report` -- Push completed artifacts to the C2 store
- `c2_request_resource` -- Request a file or artifact from another unit
- `c2_broadcast` -- Send a message to all units in the fleet

See [docs/c2-setup.md](./docs/c2-setup.md) for installation and configuration.

---

## Go Deeper

| Document | What It Covers |
|---|---|
| [docs/getting-started.md](./docs/getting-started.md) | Step-by-step setup with a concrete example |
| [docs/writing-operations.md](./docs/writing-operations.md) | How to write custom operations |
| [docs/writing-agents.md](./docs/writing-agents.md) | How to write custom agents |
| [docs/c2-setup.md](./docs/c2-setup.md) | C2 server for multi-machine deployments |
| [doctrine/](./doctrine/) | The full doctrine manual: chain of command, wave structure, message types |
| [examples/OPBLITZ3/](./examples/OPBLITZ3/) | Full walkthrough of the first operation |
| [BATTLE-MAP-OPBLITZ3.md](./BATTLE-MAP-OPBLITZ3.md) | The actual battle map from OPBLITZ3 |

---

## Why This Works

Most multi-agent systems fail at scale because they treat agents as peers that coordinate with each other. Coordination between agents creates latency, confusion, and compounding failures.

CommandCC borrows from military doctrine: **agents do not coordinate with each other. They coordinate through artifacts.** Every agent reads a file, produces a file, and exits. The next agent reads that file. There is no runtime coupling, no message passing, no shared state that can deadlock.

The result is a system that is:

- **Auditable.** Every decision is a file. The operator can read the entire operation history in order.
- **Restartable.** If an agent fails, the file it was supposed to produce is absent. The orchestrator re-runs that agent. No lost state.
- **Interruptible.** The operator can edit any plan file between phases and inject updated orders. The next wave reads the updated file.
- **Scalable.** Adding more objectives scales linearly. The decomposer adds more sub-objectives. The build phase adds more agents. The 10-agent parallel limit is handled by batching.

---

## License

Apache 2.0. See [LICENSE](./LICENSE).

---

*Built by AXL Protocol. CommandCC built itself using its own pattern. See [examples/OPBLITZ3/BATTLE-MAP.md](./examples/OPBLITZ3/BATTLE-MAP.md) for the GENESIS battle map.*

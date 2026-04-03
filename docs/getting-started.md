# Getting Started with CommandCC

This guide walks you through your first operation from zero to a running fleet. By the end you will have deployed a user authentication feature using 16 agents in a single command.

---

## Prerequisites

- **Claude Code CLI** installed and authenticated (`claude --version` should work)
- A project directory with some existing code (or an empty directory to start fresh)
- Git (recommended, not required)

CommandCC has no other runtime dependencies. It is pure Claude Code.

---

## Step 1: Clone CommandCC

```bash
git clone https://github.com/axlprotocol/commandcc
```

Or, if you only want specific parts, you can copy just the agents and operations directories into your project.

---

## Step 2: Copy Agent Definitions

Agent definitions go in `.claude/agents/` inside your project directory. Claude Code discovers agents automatically from this location.

```bash
cd your-project
mkdir -p .claude/agents

# Copy all agent categories
cp -r /path/to/commandcc/agents/command  .claude/agents/command
cp -r /path/to/commandcc/agents/architect .claude/agents/architect
cp -r /path/to/commandcc/agents/builder  .claude/agents/builder
cp -r /path/to/commandcc/agents/wirer    .claude/agents/wirer
cp -r /path/to/commandcc/agents/tester   .claude/agents/tester
cp -r /path/to/commandcc/agents/reviewer .claude/agents/reviewer
cp -r /path/to/commandcc/agents/scout    .claude/agents/scout
```

To verify the installation:

```bash
ls .claude/agents/
# command  architect  builder  wirer  tester  reviewer  scout
```

---

## Step 3: Copy an Operation Template

Operations are slash commands. They go in `.claude/commands/`.

```bash
mkdir -p .claude/commands
cp /path/to/commandcc/operations/feature-deploy.md .claude/commands/feature-deploy.md
```

You can copy multiple operations at once:

```bash
cp /path/to/commandcc/operations/*.md .claude/commands/
```

---

## Step 4: Review the Operation Template

Open `.claude/commands/feature-deploy.md`. Near the top you will see the `$ARGUMENTS` variable. That is where your objectives go. You do not need to edit the file itself, you pass objectives when you run the command.

The template orchestrates all 9 phases automatically. You only need to understand what it expects: a comma-separated or newline-separated list of objectives in plain English.

---

## Step 5: Open Claude Code and Run

From your project directory:

```bash
claude
```

Inside the Claude Code session, trigger the operation:

```
/feature-deploy Add user authentication with JWT tokens, password reset flow, and session management
```

CommandCC launches immediately. You will see output as each phase begins.

---

## Step 6: Watch the Waves Execute

The operation runs in phases. You will see output as each phase begins and completes. Here is what a typical run looks like in the terminal:

```
[Phase 0] Deploying 4 recon scouts...
  scout/codebase-scout    COMPLETE
  scout/dependency-scout  COMPLETE
  scout/security-scout    COMPLETE
  scout/test-scout        COMPLETE
-> RECON-REPORT.md written

[Phase 1] Strategy...
  command/strategist      COMPLETE
-> OPERATION-PLAN.md written

[Phase 2] Decomposition...
  command/decomposer      COMPLETE  (4 sub-objectives from 1 objective)
-> DECOMPOSITION.md written

[Phase 3] Architecture (4 parallel)...
  architect/api-architect         COMPLETE
  architect/data-architect        COMPLETE
  architect/security-architect    COMPLETE
  architect/system-architect      COMPLETE
-> ARCH-1.md through ARCH-4.md written

[Phase 4] Build (4 parallel)...
  builder/backend-builder         COMPLETE
  builder/api-builder             COMPLETE
  builder/database-builder        COMPLETE
  builder/frontend-builder        COMPLETE
-> Implementation written

[Phase 5] Wire...
  wirer/import-wirer    COMPLETE
  wirer/config-wirer    COMPLETE
-> Imports and config resolved

[Phase 6] Test (4 parallel)...
  tester/unit-tester           COMPLETE  (34 tests)
  tester/integration-tester    COMPLETE  (18 tests)
  tester/security-tester       COMPLETE  (12 tests)
  ...
-> 64 tests written, 64 passing

[Phase 7] Review (4 parallel)...
  reviewer/code-reviewer          COMPLETE
  reviewer/security-reviewer      COMPLETE
  reviewer/architecture-reviewer  COMPLETE
-> REVIEW-*.md written

[Phase 8] Integration...
  command/integrator    COMPLETE
-> BATTLE-MAP.md written

OPERATION COMPLETE. Read BATTLE-MAP.md.
```

---

## Step 7: Read the Battle Map

When the operation finishes, open `BATTLE-MAP.md` in your project root:

```bash
cat BATTLE-MAP.md
```

The battle map tells you:
- Operation status: CLEAN, CONDITIONAL, or HOLD
- Which objectives were achieved
- Test counts and results
- Any outstanding findings
- What was built and what changed
- Recommended next steps

If the status is CLEAN, you are ready to review the code and ship. If CONDITIONAL, the battle map tells you exactly what to fix first.

---

## Concrete Example: Deploying User Auth

Let's walk through deploying a complete user authentication system.

**Your project:** A Python FastAPI backend with a PostgreSQL database. No auth currently exists.

**Step 1.** Start Claude Code:

```bash
cd my-fastapi-project
claude
```

**Step 2.** Run the operation:

```
/feature-deploy
Implement user authentication:
- JWT-based login and token refresh
- Password hashing with bcrypt
- User registration with email validation
- Password reset via email token
```

**What happens:**

The recon scouts map your existing codebase. They find your FastAPI app structure, your existing database models, your requirements.txt, and your test directory. This takes 30 seconds.

The strategist reads the recon report and produces an operation plan with 4 objectives: auth models and schema, JWT service, registration and reset endpoints, and test suite.

The decomposer splits each objective into 2-3 sub-objectives. The JWT service objective becomes: token generation logic, token validation middleware, and refresh token store. Three sub-objectives that share no code.

Four architects design the four tracks in parallel. You get `ARCH-1.md` through `ARCH-4.md`, each with specific file paths, class names, and interface contracts.

Four builders implement the four tracks simultaneously. One builder creates `models/user.py` and the Alembic migration. Another builds `services/jwt_service.py`. Another builds the registration and reset endpoints. Another builds the test fixtures and helpers.

Wirers resolve the import graph. The registration endpoint imports from the JWT service. The wirer ensures all import paths are consistent.

Testers write unit tests for the JWT service, integration tests for the registration flow, and security tests probing the token validation.

Reviewers check code quality, security posture (JWT algorithm choice, bcrypt rounds, token expiry), and architecture conformance.

The integrator closes the operation and writes the battle map.

**Total time:** ~20 minutes. Your repo now has a complete auth system with tests.

---

## Next Steps

- Write your own operation: [docs/writing-operations.md](./writing-operations.md)
- Write custom agents: [docs/writing-agents.md](./writing-agents.md)
- Deploy a multi-server fleet: [docs/c2-setup.md](./c2-setup.md)
- Read the full OPBLITZ3 walkthrough: [examples/OPBLITZ3/README.md](../examples/OPBLITZ3/README.md)
- Understand the doctrine: [doctrine/README.md](../doctrine/README.md)

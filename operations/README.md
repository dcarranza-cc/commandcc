# CommandCC Operations

Operations are pre-built orchestration templates for CommandCC. Copy any `.md` file from this directory into `.claude/commands/` in your project and trigger it with the corresponding slash command.

---

## The 9-Phase Octopus Pattern

The octopus pattern is the full-scale CommandCC operation. Nine sequential phases, each phase fanning out into parallel agents, then collapsing into a shared artifact before the next phase begins. The pattern is named for the parallel arms radiating from a central spine.

```
Phase 0   RECON         Haiku scouts      30 sec    READ-ONLY
Phase 1   STRATEGY      1 Opus            2 min     -> OPERATION-PLAN.md
Phase 2   DECOMPOSE     1 Opus            2 min     -> DECOMPOSITION.md  [THE MULTIPLIER]
Phase 3   ARCHITECTURE  Opus parallel     3 min     -> ARCH-*.md per sub-obj
Phase 4   BUILD         Sonnet parallel   5 min     -> implementation per sub-obj
Phase 5   WIRE          Sonnet parallel   3 min     -> imports, configs, startup resolved
Phase 6   TEST          Sonnet parallel   3 min     -> test suites per sub-obj
Phase 7   REVIEW        Opus parallel     2 min     -> REVIEW-*.md per objective
Phase 8   INTEGRATION   1 Opus            2 min     -> BATTLE-MAP.md
                                          -------
                                          ~22 min   for 4 objectives
```

### Phase 0: RECON

Haiku scouts deploy in parallel across the codebase. Each scout covers a specific domain: file structure, dependencies, existing tests, config files, API surface, security posture, database schema, or service health. Scouts are READ-ONLY and complete in under 30 seconds. Output is consolidated into `RECON-REPORT.md`.

### Phase 1: STRATEGY

A single Opus strategist reads `RECON-REPORT.md` and the user's objectives. It produces `OPERATION-PLAN.md`, which defines the operation scope, constraints, known risks, and a high-level sequence. One strategist, never parallelized. This is the reasoning anchor for everything that follows.

### Phase 2: DECOMPOSE (The Multiplier)

A single Opus decomposer reads `OPERATION-PLAN.md` and breaks each objective into independent sub-objectives. The decomposer's primary job is to ensure zero cross-dependencies between sub-objectives so that all downstream phases can parallelize freely. For 4 input objectives, expect 12-16 sub-objectives in `DECOMPOSITION.md`. This is the force multiplier of the octopus pattern.

### Phase 3: ARCHITECTURE

One Opus architect per sub-objective, all running in parallel. Each architect reads `DECOMPOSITION.md` and produces an `ARCH-{n}.md` design document covering data structures, interfaces, and integration contracts. Architects are READ-ONLY. They do not write application code.

### Phase 4: BUILD

One or more Sonnet builders per sub-objective, all running in parallel. Each builder reads the corresponding `ARCH-{n}.md` and implements the sub-objective. This is the highest-parallelism phase. Builders write application code, create files, and run shell commands. They do not modify architect documents.

### Phase 5: WIRE

Sonnet wirers resolve cross-cutting concerns that the parallel build phase cannot handle in isolation: import paths, shared config, service registration, startup ordering. Wirers run in parallel by concern (import-wirer, config-wirer, startup-wirer) but each wirer has full write access to the whole codebase. Wire phase completes before testing begins.

### Phase 6: TEST

Sonnet testers write and run tests for each sub-objective in parallel. Unit testers cover logic, integration testers cover service boundaries, security testers probe for vulnerabilities, load testers check performance. Each tester reads the relevant `ARCH-{n}.md` and the built code.

### Phase 7: REVIEW

Opus reviewers examine the completed work in parallel, one reviewer per original objective. Each reviewer reads the build output, test results, and the original architecture doc. Reviewers produce `REVIEW-{n}.md` with findings, risk ratings, and required changes. Reviewers are READ-ONLY.

### Phase 8: INTEGRATION

A single Opus integrator reads all `REVIEW-*.md` files and produces `BATTLE-MAP.md`, the final operation summary. The battle map records what was built, what passed review, what is outstanding, and the recommended next action. This is the canonical handoff document for the operator.

---

## The 10-Agent Parallel Limit

Claude Code enforces a limit of 10 concurrent agent calls per session. Operations respect this limit through batching.

**Batching strategy:**

When a phase requires more than 10 agents, the orchestrator splits them into batches of up to 10 and awaits each batch before launching the next. Batches within a phase still run in parallel. The orchestrator must track which sub-objectives have completed and not re-run them.

```
16 sub-objectives in BUILD phase:
  Batch 1: builders 1-10  (parallel, await completion)
  Batch 2: builders 11-16 (parallel, await completion)
```

**Coordination files** prevent double-work. Each agent writes a `COMPLETE-{phase}-{n}.lock` marker when it finishes. If an operation is interrupted and re-run, the orchestrator skips any sub-objective with an existing lock file.

---

## Choosing the Right Pattern

| Objectives | Recommended Pattern | Why |
|------------|--------------------|----|
| 1-2        | 4-phase lite       | Decomposer overhead not justified, low parallelism gain |
| 3-4        | 9-phase octopus    | Full pattern justified, ~22 min total |
| 5-8        | 9-phase octopus    | Decomposer essential, batching required in build phase |
| 9+         | Split into multiple operations | Coordination overhead exceeds parallelism benefit |

**Rule of thumb:** Use the lite pattern when you can hold the whole problem in your head. Use the full octopus when you cannot.

---

## Artifact Map

| File                  | Written By   | Read By                      | Phase |
|-----------------------|--------------|------------------------------|-------|
| `RECON-REPORT.md`     | scouts       | strategist                   | 0->1  |
| `OPERATION-PLAN.md`   | strategist   | decomposer                   | 1->2  |
| `DECOMPOSITION.md`    | decomposer   | architects, builders         | 2->3  |
| `ARCH-{n}.md`         | architects   | builders, testers, reviewers | 3->4  |
| `REVIEW-{n}.md`       | reviewers    | integrator                   | 7->8  |
| `BATTLE-MAP.md`       | integrator   | operator                     | 8->out|

---

## Available Operations

| Command                 | File                       | Pattern     | Purpose |
|-------------------------|----------------------------|-------------|---------|
| `/feature-deploy`       | `feature-deploy.md`        | 9-phase     | Deploy N features in parallel |
| `/feature-deploy-lite`  | `feature-deploy-lite.md`   | 4-phase     | 1-2 features, faster |
| `/security-audit`       | `security-audit.md`        | 6-phase     | Full OWASP security sweep |
| `/codebase-migration`   | `codebase-migration.md`    | 7-phase     | Migrate framework X to Y |
| `/research-sprint`      | `research-sprint.md`       | 4-phase     | Research N topics, synthesize |
| `/test-blitz`           | `test-blitz.md`            | 5-phase     | Comprehensive test coverage |
| `/documentation-sprint` | `documentation-sprint.md`  | 5-phase     | Document all modules |
| `/refactor-sweep`       | `refactor-sweep.md`        | 6-phase     | Refactor N modules in parallel |
| `/incident-response`    | `incident-response.md`     | FAST TRACK  | Diagnose and fix production incident |

---

## Installation

Copy any operation template to your project:

```bash
mkdir -p .claude/commands
cp /path/to/commandcc/operations/feature-deploy.md .claude/commands/feature-deploy.md
```

Then trigger it from Claude Code:

```
/feature-deploy Add user auth, payment processing, and email notifications
```

The `$ARGUMENTS` variable in each template receives everything after the command name.

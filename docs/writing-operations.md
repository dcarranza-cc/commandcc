# Writing Custom Operations

An operation is a Claude Code slash command that orchestrates a fleet of agents across multiple phases. This document explains how to write one from scratch, scale it to any objective count, and handle the 10-agent parallel limit.

---

## The 9-Phase Octopus Structure

Every full-scale CommandCC operation follows the same 9-phase spine. You can omit phases for lighter operations, but never reorder them. Dependencies flow in one direction: each phase consumes the artifacts of the phase before it.

```
Phase 0   RECON          Haiku scouts, READ-ONLY
Phase 1   STRATEGY       1 Opus, produces OPERATION-PLAN.md
Phase 2   DECOMPOSE      1 Opus, produces DECOMPOSITION.md       [THE MULTIPLIER]
Phase 3   ARCHITECTURE   Opus parallel, produces ARCH-{n}.md
Phase 4   BUILD          Sonnet parallel, produces implementation
Phase 5   WIRE           Sonnet parallel, resolves cross-cutting concerns
Phase 6   TEST           Sonnet parallel, produces test suites
Phase 7   REVIEW         Opus parallel, produces REVIEW-{n}.md
Phase 8   INTEGRATION    1 Opus, produces BATTLE-MAP.md
```

Each phase collapse point is an artifact file. Phases are separated by `await` calls in the operation template. You cannot reach Phase 4 until Phase 3 is fully complete.

---

## Template Structure

An operation file is a Claude Code slash command in Markdown. The `$ARGUMENTS` variable receives everything the user types after the command name.

```markdown
# Operation: Feature Deploy
Your objectives: $ARGUMENTS

## Setup

Create the operation workspace:
- Create directory: `.operation/`
- Record objectives in: `.operation/OBJECTIVES.md`

## Phase 0: Recon

Launch the following agents IN PARALLEL and await all before continuing:

- Use `scout/codebase-scout` to map the file structure
- Use `scout/dependency-scout` to map dependencies and versions
- Use `scout/test-scout` to map existing test coverage
- Use `scout/security-scout` to perform initial security scan

After all scouts complete, consolidate their outputs into `.operation/RECON-REPORT.md`.

## Phase 1: Strategy

Launch ONE agent:
- Use `command/strategist` with context: RECON-REPORT.md and the objectives

Await completion. Output: `.operation/OPERATION-PLAN.md`

## Phase 2: Decompose

Launch ONE agent:
- Use `command/decomposer` with context: OPERATION-PLAN.md

Await completion. Output: `.operation/DECOMPOSITION.md`

## Phase 3: Architecture

Read DECOMPOSITION.md. For each sub-objective listed, launch ONE architect agent
with the relevant sub-objective context. Run all architects IN PARALLEL.
Await all before continuing.

Outputs: `.operation/ARCH-{n}.md` per sub-objective

## Phase 4: Build

Read DECOMPOSITION.md. For each sub-objective listed, launch ONE builder agent
with the relevant ARCH-{n}.md as context. Run all builders IN PARALLEL.
Await all before continuing.

If there are more than 10 sub-objectives, batch into groups of 10.
Check for `.operation/COMPLETE-BUILD-{n}.lock` files before launching,
and skip any sub-objective that already has a lock file.

## Phase 5: Wire

Launch the following agents IN PARALLEL and await all:
- Use `wirer/import-wirer` to resolve all import paths
- Use `wirer/config-wirer` to merge configuration
- Use `wirer/startup-wirer` to resolve service startup ordering

## Phase 6: Test

For each original objective (not sub-objective), launch:
- `tester/unit-tester`
- `tester/integration-tester`
Run IN PARALLEL across objectives. Await all.

## Phase 7: Review

For each original objective, launch ONE `reviewer/code-reviewer` IN PARALLEL.
Also launch `reviewer/security-reviewer` once across the full codebase.
Await all. Outputs: `.operation/REVIEW-{n}.md`

## Phase 8: Integration

Launch ONE agent:
- Use `command/integrator` with all REVIEW-*.md files as context

Output: `BATTLE-MAP.md` at the project root

## Completion

Print: "OPERATION COMPLETE. Read BATTLE-MAP.md."
```

---

## Scaling from 4 to 8 to 16 Objectives

### 4 Objectives (Standard)

The default pattern. Decomposer produces ~12 sub-objectives. Build phase runs 12 builders. This fits within two batches of the 10-agent limit.

```
4 objectives -> ~12 sub-objectives -> 12 architects + 12 builders
Batch 1: 10 agents | Batch 2: 2 agents
```

No special handling required. Standard template works as written.

### 8 Objectives (Large)

Decomposer produces ~24 sub-objectives. Build phase requires 3 batches.

Add to your Phase 4 instructions:

```markdown
## Phase 4: Build (BATCHED)

Read DECOMPOSITION.md. Group sub-objectives into batches of 10.

Batch 1: Sub-objectives 1-10. Launch IN PARALLEL. Await all.
Batch 2: Sub-objectives 11-20. Launch IN PARALLEL. Await all.
Batch 3: Sub-objectives 21+. Launch IN PARALLEL. Await all.

Write `.operation/COMPLETE-BUILD-{n}.lock` for each completed sub-objective.
```

Also split the review phase:

```markdown
## Phase 7: Review (BATCHED)

Batch 1: Objectives 1-5, one reviewer each. IN PARALLEL. Await.
Batch 2: Objectives 6-8, one reviewer each. IN PARALLEL. Await.
```

### 16 Objectives (Maximum Scale)

At 16 objectives, decomposition can produce up to 64 sub-objectives. This requires 7 batches in the build phase. At this scale, add explicit progress tracking.

Add a progress file to your setup:

```markdown
## Setup

- Create `.operation/progress.md` with one line per sub-objective: `SUB-{n}: PENDING`
- Update each line to `COMPLETE` when its lock file is written
```

This lets the operator see progress mid-operation without opening individual files.

For 16 objectives, also consider splitting the operation into two halves. Run objectives 1-8 as OPERATION-A and objectives 9-16 as OPERATION-B. The 13-minute OPBLITZ3 result was 4 objectives. Expect ~25 minutes for 8 and ~35 minutes for 16.

---

## The Decomposer Pattern: When to Use It

The decomposer phase adds 2 minutes to any operation. It is worth it when:

- You have 3 or more objectives
- Any objective touches multiple distinct system layers (data, API, UI)
- Any objective can be built by two engineers independently
- You want maximum parallelism in the build phase

Skip the decomposer when:

- You have 1-2 simple objectives
- Work is tightly coupled and cannot be parallelized
- Time is critical and the 2-minute overhead matters (use the 4-phase lite pattern instead)

In the lite pattern, architects and builders work directly from objectives without sub-objective decomposition. You lose parallelism but save the decomposer overhead.

---

## File Coordination Conventions

All operation artifacts go in `.operation/` to keep the project root clean. The only file that lands at the project root is `BATTLE-MAP.md`, which is the final deliverable.

| File | Written By | Location |
|------|-----------|----------|
| `RECON-REPORT.md` | scouts (consolidated) | `.operation/` |
| `OPERATION-PLAN.md` | strategist | `.operation/` |
| `DECOMPOSITION.md` | decomposer | `.operation/` |
| `ARCH-{n}.md` | architects | `.operation/` |
| `REVIEW-{n}.md` | reviewers | `.operation/` |
| `COMPLETE-{phase}-{n}.lock` | each agent on completion | `.operation/` |
| `BATTLE-MAP.md` | integrator | project root |

Naming convention for phase artifacts: `{phase}-{role}-{sub-objective-id}.md`

Example: `3-architect-A1.md` means phase 3, architect role, sub-objective A1.

The lock file convention prevents double-work if an operation is interrupted. Before launching any agent in the build or test phase, check for the existence of its lock file. If the lock file exists, skip that agent.

---

## Handling the 10-Agent Parallel Limit

Claude Code enforces a limit of 10 concurrent agent calls per session. Any phase with more than 10 agents must batch.

**Batching rules:**

1. Batch size is always 10 or fewer.
2. Await all agents in batch N before launching batch N+1.
3. Write a lock file when each agent completes.
4. If re-running after an interrupt, skip agents with existing lock files.

**In your operation template:**

```markdown
## Phase 4: Build

Check for existing lock files in `.operation/`. Skip any sub-objective
that has a `.operation/COMPLETE-BUILD-{n}.lock` file.

For remaining sub-objectives, group into batches of 10:

While sub-objectives remain without lock files:
  Take next 10 (or fewer) sub-objectives
  Launch their builders IN PARALLEL
  Await all completions
  Each builder writes its lock file on completion
```

The orchestrator (Claude Code itself) handles the loop. You are writing the instruction to it, not code.

**Important:** Batches within a phase still run in parallel. Only batches are sequential, not individual agents within a batch. A 30-agent build phase runs as 3 batches of 10, not 30 sequential agents.

---

## Writing Lightweight Operations (4-Phase Lite)

For 1-2 objectives where full decomposition is overkill:

```markdown
# Operation: Feature Deploy Lite
Your objective: $ARGUMENTS

## Phase 0: Recon (2 scouts)
- Use `scout/codebase-scout`
- Use `scout/dependency-scout`
IN PARALLEL. Await. Produce RECON-REPORT.md.

## Phase 1: Architecture
- Use `architect/system-architect`
Await. Produce ARCH-1.md.

## Phase 2: Build + Test (parallel)
- Use `builder/backend-builder` with ARCH-1.md
- Use `tester/unit-tester` once builder completes
Sequential: builder first, then tester.

## Phase 3: Review + Integration
- Use `reviewer/code-reviewer`
Await. Use `command/integrator`. Produce BATTLE-MAP.md.
```

This runs in ~10 minutes instead of ~22. Use it when you know exactly what needs to be built.

---

## Custom Phase Design

You do not have to use the standard 9 phases. Design phases around your problem.

**Research sprint (no build phase):**
```
Phase 0: Source gathering (8 scouts in parallel)
Phase 1: Synthesis (1 Opus analyst)
Phase 2: Report generation (3 Opus writers in parallel)
Phase 3: Editorial review (1 Opus editor)
```

**Security audit (no build phase):**
```
Phase 0: Recon
Phase 1: Threat modeling
Phase 2: Vulnerability scanning (8 security scouts in parallel)
Phase 3: Deep probe on findings
Phase 4: Report + remediation plan
```

**Migration operation:**
```
Phase 0: Recon (old system + new system)
Phase 1: Strategy + risk assessment
Phase 2: Migration scripts (parallel by module)
Phase 3: Data validation
Phase 4: Rollback planning
Phase 5: Review + BATTLE-MAP
```

The pattern is always the same: fan out into parallel work, collapse to an artifact, advance to the next phase. The specific agents and phases are yours to design.

---

## Template Placeholders Reference

Standard placeholders you can use in any operation template:

| Placeholder | Meaning |
|-------------|---------|
| `$ARGUMENTS` | Everything the user typed after the command name |
| `$DATE` | Current date |
| `$PROJECT_ROOT` | Absolute path to the project directory |

You can also write static objectives directly in the template if the operation always does the same thing.

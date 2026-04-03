# File-Based Coordination Protocol

## The Fundamental Principle

All coordination in CommandCC happens through files on disk. Agents do not message each other. There is no shared runtime state. There is no message bus. There is no coordination service.

Every directive, every status report, every design, every finding, every handoff is a file.

This is not a constraint imposed by Claude Code's architecture. It is a deliberate design choice, and it is the right one.

---

## Why File-Based Coordination

### Message Passing Fails at Scale

In a message-passing system, agents receive inputs and produce outputs through a runtime. If the runtime fails, state is lost. If an agent crashes mid-task, its partial work is lost. If two agents send messages simultaneously, ordering becomes non-deterministic.

At 64 agents running in parallel, these failure modes are not hypothetical. They are guaranteed to occur. The question is whether you have a recovery mechanism.

File-based coordination solves all three problems:

**Crash recovery:** Files persist through crashes. If a builder fails halfway through, its partial output is on disk. The operator can inspect it, issue a FRAGO, and relaunch the agent to continue. Nothing is lost.

**No shared runtime state:** Each agent reads its inputs from files, writes its outputs to files, and exits. It never needs to maintain a connection to another agent. It is fully independent.

**Deterministic ordering:** Files are written atomically. A file either exists and has content, or it does not exist. There is no partial-read problem as long as agents only read files they did not write. The wave gate system (see `wave-structure.md`) ensures agents only read files from completed previous waves.

### Auditability

When an operation completes, every decision, every design, every report is a file in the operation directory. The operator can audit the entire operation by reading the files in sequence.

If something went wrong, the operator does not need to replay logs or query a database. They read the relevant files. The architect's design is there. The builder's SITREP is there. The tester's report is there. The conflict is visible.

In OPBLITZ3, the operation directory contained 47 files at completion. Reading them in sequence reproduced the entire operation: what was planned, what was built, what was tested, what passed.

### Human Intervention

File-based coordination makes FRAGO injection trivial. The operator writes a FRAGO file. The next wave reads it. There is no API to call, no message queue to publish to, no service to update. Write a file. The operation responds.

---

## Directory Structure

### Standard Operation Layout

```
/operation/                     Root directory for this operation
  /operation/plans/             Strategist and Decomposer output
  /operation/orders/            OPORDs and FRAGOs (directives)
  /operation/designs/           Architect output (one per sub-objective)
  /operation/reports/           Agent SITREPs and INTREPs
  /operation/handoffs/          HANDOFF files for lateral transfers
  /operation/battle-map.md      Final integrator output
```

The root directory is named for the operation: `opblitz3/`, `op-migration-v2/`, etc.

Subdirectories map to the message flow:
- `plans/` flows from Command Staff down to Architects
- `orders/` flows from Supreme Commander and Command Staff down to all agents
- `designs/` flows from Architects down to Operators
- `reports/` flows from all agents up to Command Staff
- `handoffs/` flows laterally between peer units, CC to Command Staff

---

## File Naming Convention

### The Convention

```
[phase]-[role]-[objective-id].[ext]
```

Components:

- `phase`: The phase number in which this file was produced (1, 2, 3, 4...)
- `role`: The role of the agent that produced it (strategist, decomposer, architect, builder, tester, scout, wirer, integrator)
- `objective-id`: The objective identifier (A, B, C... for top-level; A1, A2, B1... for sub-objectives)
- `ext`: File extension, almost always `.md` for coordination files

### Examples

```
1-scout-A.md           Phase 1, scout, objective A recon report
1-scout-B.md           Phase 1, scout, objective B recon report
2-strategist.md        Phase 2, strategist, master operation plan
2-decomposer.md        Phase 2, decomposer, sub-objective breakdown
3-architect-A1.md      Phase 3, architect, sub-objective A1 design
3-architect-A2.md      Phase 3, architect, sub-objective A2 design
3-architect-B1.md      Phase 3, architect, sub-objective B1 design
4-builder-A1.md        Phase 4, builder, sub-objective A1 SITREP
4-tester-A1.md         Phase 4, tester, sub-objective A1 test report
4-wirer-AB.md          Phase 4, wirer, A-B integration SITREP
5-integrator.md        Phase 5, integrator, battle map (= battle-map.md)
frago-phase-3.md       FRAGO injected before phase 3 launches
```

### Why This Convention

The naming convention encodes provenance. Any agent that reads `3-architect-A1.md` immediately knows: this is from the architect phase (phase 3), it covers sub-objective A1, and it was produced before the build phase. No metadata lookup required.

The convention also makes glob patterns useful. An integrator that needs all tester reports runs:
```
glob: *-tester-*.md
```

A Command Staff agent that needs all phase 3 outputs runs:
```
glob: 3-*.md
```

---

## Conflict Avoidance

### The Root Cause of Conflicts

File conflicts occur when two agents assigned to work in parallel are both assigned to modify the same source file. Both agents make changes. The second agent to write overwrites the first. The first agent's changes are lost.

This is not a file locking problem. It is a planning problem. Conflicts should never occur if the Decomposer has done its job correctly.

### The Decomposer's Role

The Decomposer's primary responsibility, beyond generating sub-objectives, is **file domain isolation**: ensuring that no two sub-objectives are assigned to the same source file.

The Decomposer accomplishes this by:

1. Reading the codebase structure (from scout INTREPs)
2. Identifying which files relate to each high-level objective
3. Assigning each file to exactly one sub-objective
4. Flagging files that are genuinely shared (utilities, common interfaces) as coupling points

Coupling points are not assigned to multiple sub-objectives. They are assigned to the WIRE phase, after all builders have completed.

When the Decomposer's output is used, parallel agents should never conflict. The file domain assignments are a guarantee, not a hope.

### The WIRE Phase

When coupling is unavoidable, the WIRE phase resolves it. After all builders complete, wirer agents integrate the connection points.

The WIRE phase is designed for this scenario:

```
Builder A1: implements feature X in feature_x.py
Builder A2: implements feature Y in feature_y.py
Both features use a shared utility in utils.py

Decomposer assigns:
  Sub-objective A1: feature_x.py (builder A1 owns this)
  Sub-objective A2: feature_y.py (builder A2 owns this)
  Coupling point: utils.py (WIRE phase owns this)

During BUILD phase:
  Builder A1 writes feature_x.py, uses utils.py but does NOT modify it
  Builder A2 writes feature_y.py, uses utils.py but does NOT modify it
  No conflict.

During WIRE phase:
  Wirer-A reads both A1 and A2 SITREPs
  Wirer-A modifies utils.py to support both features
  Wirer-A files SITREP confirming integration
```

The WIRE phase converts a potential conflict into a planned integration step.

---

## The OPBLITZ3 Lesson: empire1d.py

In the pre-operation planning for OPBLITZ3, an early decomposition draft assigned two builders to modify the same file, `empire1d.py`. Both builders needed to extend the class defined in that file with new methods.

The conflict was identified during decomposition review (not during execution). The fix was straightforward: the methods that both builders needed to add were consolidated into a single sub-objective. One builder owned all modifications to `empire1d.py`. The other builder's sub-objective was redefined to call the methods rather than implement them.

Result: the conflict was eliminated at planning time. During execution, no two builders touched `empire1d.py` simultaneously. Zero conflicts. 16 agents, 131 tests, 13 minutes.

The lesson is not that conflicts are unavoidable and must be managed. The lesson is that conflicts are a symptom of incomplete decomposition. When the Decomposer identifies a coupling point, it must be assigned to exactly one agent, not two.

---

## File Lifecycle

### Creation

A file is created by the agent responsible for it. The agent writes the file, including all content, and then exits. The file is considered complete when the agent exits successfully.

Agents do not write files incrementally and expect other agents to read partial content. A file is either complete or it does not exist.

### Reading

Agents read files at the start of their execution. They do not poll for updates. They do not wait for files to change. They read, think, act, and write their output.

The wave gate system (see `wave-structure.md`) ensures that the files an agent needs to read were completed in a previous wave. By the time a builder starts, the architect's design file is complete. The builder does not need to wait.

### Archiving

At operation completion, all operation files are preserved. The battle map (integrator output) references the key files. The full operation directory is the audit trail.

Do not delete operation files after the operation completes. The files are the record.

---

## Coordination Anti-Patterns

**Anti-pattern: Agents reading files from their own wave**
An agent should never read output from another agent in the same wave. Same-wave agents run in parallel. Their output files do not exist when the wave starts. Use the wave gate to ensure agents only read completed prior-wave files.

**Anti-pattern: Agents writing to shared files without WIRE assignment**
If two sub-objectives both need to modify a file, and that file is not explicitly assigned to the WIRE phase, a conflict is guaranteed. The Decomposer must catch this. If it slips through, the operator issues a FRAGO before the BUILD wave to reassign the shared file.

**Anti-pattern: Agents communicating through code comments**
Agents should not communicate by writing comments in source files intended for other agents to read. All coordination is through the coordination files in the operation directory. Source code comments are for future developers, not for inter-agent messages.

**Anti-pattern: Agents over-reporting**
SITREPs should be concise. An agent that writes a 5,000-word SITREP when a 200-word SITREP suffices consumes the integrator's context unnecessarily. Report status, findings, and blockers. Do not narrate your entire execution process.

**Anti-pattern: Agents expanding scope without a FRAGO**
A builder that decides mid-task to also refactor a module that was not in their sub-objective assignment is operating outside their lane. This creates undocumented changes that the Decomposer did not account for, and that the tester may not cover. Scope creep by agents is a coordination failure. If an agent identifies work that should be done outside their scope, they file an INTREP and wait for Command Staff to issue a FRAGO.

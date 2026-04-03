# CommandCC Doctrine

## What Is CommandCC?

CommandCC is a military-grade orchestration system for Claude Code. It lets one human operator command 16 to 128 AI agents from a single terminal, compressing days of engineering work into minutes.

The proof: **OPERATION OPBLITZ3**. One operator. 16 agents. 131 tests written and passing. 13 minutes. 200x compression in human cognitive load.

This doctrine is the manual. It defines how CommandCC operations are planned, structured, communicated, and executed. Read it before you deploy.

---

## Why Military-Style Coordination?

Military command-and-control (C2) doctrine was developed over centuries to solve a specific problem: how do you coordinate many people with different roles, operating under uncertainty, toward a single objective, without constant supervision?

That is exactly the AI orchestration problem.

Traditional software pipelines break down at scale because they are sequential. Traditional multi-agent frameworks break down because they lack hierarchy, authority, and coordination protocol. Agents talk to each other, loop, contradict each other, and wait.

Military doctrine solves this with three principles:

**1. Clear chain of command.** Every agent knows its role, its authority, and who it reports to. No agent improvises outside its lane. No agent overrides a higher-tier decision. Authority flows down. Reports flow up.

**2. Defined message types.** Confusion comes from ambiguity. When every communication has a type (OPORD, SITREP, FRAGO, SPOTREP), agents know what they are reading and what response is expected. There is no ambiguity about whether a message is a directive, a status update, or an emergency.

**3. Phases and waves.** Work is broken into discrete phases. Each phase is broken into waves of parallel agents. Each wave completes before the next launches. This is not bureaucracy. It is dependency management at scale, executed without a database.

---

## The File-Based Coordination Model

CommandCC does not use message passing between agents. Agents do not call each other. There is no shared runtime state.

**All coordination happens through files on disk.**

This is not a limitation. It is a deliberate architectural choice with four advantages:

**Persistence.** If an agent crashes, its work survives. The next agent reads the file and continues. No state is held in memory that can be lost.

**Auditability.** Every decision, every plan, every report is a file. The operator can read the entire operation history in sequence. There are no black-box message queues.

**Parallelism without conflict.** The decomposer phase assigns each agent a distinct set of files to touch. Agents working in parallel do not step on each other because the decomposer ensures their work domains do not overlap.

**Human intervention at any point.** The operator can read any file, modify any plan, and inject a FRAGO (fragmentary order) at any phase. The operation does not need to be paused or restarted. The next wave reads the updated plan and proceeds.

The directory structure is simple:

```
/operation/          Plans, OPORDs, decomposition outputs
/reports/            SITREPs, INTREPs, SPOTREPs from agents
/handoffs/           HANDOFF files between peer units
```

File names encode their place in the operation: `3-architect-A1.md` means phase 3, architect role, objective A1.

---

## The OPBLITZ3 Benchmark

OPERATION OPBLITZ3 is the canonical proof-of-concept for CommandCC doctrine. It is referenced throughout this manual as the baseline for what the system can do.

| Metric | Value |
|---|---|
| Human operator input | ~4 sentences |
| Agents deployed | 16 |
| Phases | 4 |
| Waves | 4 |
| Tests written | 131 |
| Tests passing | 131 |
| Total duration | 13 minutes |
| Human cognitive load compression | 200x |

The operator typed an objective. The strategist decomposed it. Architects designed solutions. Operators built and tested. The integrator assembled the final report. The human read the result.

That is the model. The rest of this doctrine explains how to replicate it at any scale.

---

## Doctrine Documents

| Document | Contents |
|---|---|
| `chain-of-command.md` | Roles, authority levels, hierarchy, and the FRAGO intervention protocol |
| `wave-structure.md` | How waves work, wave vs phase, timing math, ASCII execution diagrams |
| `agent-hierarchy.md` | The three-tier model: Command, Operations, Reconnaissance |
| `coordination.md` | File-based coordination protocol, directory conventions, conflict avoidance |
| `message-types.md` | Seven message types: OPORD, FRAGO, SITREP, INTREP, SPOTREP, HANDOFF, REQUEST |
| `battle-map-format.md` | After-action report format, integrator output, OPBLITZ3 template |

Read `chain-of-command.md` and `agent-hierarchy.md` first. They establish the mental model that everything else builds on.

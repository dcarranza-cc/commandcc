# Chain of Command

## Principle

Authority in CommandCC flows in one direction: **down**.

Every role in the hierarchy has a defined scope of authority. No agent overrides a decision made by a higher tier. No agent acts outside its lane without an explicit order. The human operator is the sole source of strategic intent. Everything else is execution.

This is not about rigid bureaucracy. It is about preventing the failure mode that kills multi-agent systems: agents that contradict each other, re-litigate decisions, or act on assumptions that have already been overridden.

---

## The Hierarchy

```
SUPREME COMMANDER (Human Operator)
         |
    COMMAND STAFF (Opus)
    Strategist | Decomposer | Integrator
         |
    ARCHITECTS (Opus)
    One per objective or sub-objective
         |
    OPERATORS (Sonnet)
    Builders | Wirers | Testers
         |
    SCOUTS (Haiku)
    Recon | Scan | Diagnose
```

---

## Role Definitions

### Supreme Commander: The Human Operator

The human operator holds all authority. All of it. Every decision of consequence is either made by the human or delegated explicitly by the human to a specific tier.

The operator's role is not to micromanage. The power of CommandCC is that the operator types approximately four sentences and deploys 64 agents. The operator sets strategic intent, approves decomposition, monitors for FRAGOs, and reads the final battle map.

**What the operator does:**
- States the objective in plain language
- Reviews the decomposer's breakdown before Architect phase launches
- Injects FRAGOs if something goes wrong mid-operation
- Accepts or rejects the integrator's final report

**What the operator does NOT do:**
- Write code
- Manage individual agents
- Resolve inter-agent conflicts (that is what the WIRE phase is for)
- Monitor wave-by-wave progress in real time (that is what SITREPs are for)

The operator is the commander, not the keyboard.

---

### Command Staff: Opus-Tier Strategists

Command Staff agents run on Opus-tier models. They think. They do not build.

Command Staff includes three roles:

**The Strategist** receives the operator's objective and produces the operation plan. It identifies phases, defines success criteria, estimates agent count, and writes the master OPORD. The strategist sees the full scope of the problem and the full capability of the force.

**The Decomposer** is the multiplication layer. It takes the operation plan and breaks it into discrete, parallelizable sub-objectives. Each sub-objective becomes a work stream. Each work stream gets its own architect. The decomposer is the reason one human can manage 64 agents, because the decomposer does the granularity work the human would otherwise have to do manually. See `agent-hierarchy.md` for the full decomposer doctrine.

**The Integrator** runs in the final phase. It reads all agent reports, resolves any remaining inconsistencies, assembles the battle map, and delivers the final SITREP to the operator. The integrator is responsible for the coherence of the total output.

**Command Staff rule:** Command Staff agents are READ-ONLY with respect to the codebase. They read files to understand context. They write plans, orders, and reports. They never write code, never edit source files, never run builds. Their output is always documents.

---

### Architects: Opus-Tier Designers

Architects are Opus-tier agents assigned to specific objectives or sub-objectives. One architect per work stream.

The architect's job is to produce a complete technical design before any Operator touches a file. The design includes: what files will be created or modified, what interfaces will be used, what the success criteria look like at the code level, and what the builder, wirer, and tester need to know.

A good architect design means Operators have no ambiguity. They execute the design. They do not invent it.

**Architects never write code.** They write design documents. The distinction matters because it forces the thinking to happen before the doing. An architect who writes code is an operator who also planned, and that agent is now doing two jobs with divided attention.

Number of architects per operation: one per sub-objective produced by the decomposer. For a 4-objective operation with 4 subs each, that is 16 architects. They run in parallel across waves.

---

### Operators: Sonnet-Tier Executors

Operators run on Sonnet-tier models. They are the workhorse of every operation.

Operators have full permissions: read, write, edit, run builds, run tests. They work from the architect's design document. They do not make architectural decisions. If they encounter something the design did not anticipate, they file a SPOTREP to Command Staff and wait for a FRAGO before proceeding.

Three operator sub-roles:

**Builders** implement features and write code. One builder per sub-objective. They touch only the files assigned to their sub-objective by the decomposer.

**Wirers** integrate components. They run after builders in the same phase or in a dedicated WIRE phase. They handle the connections between what multiple builders produced. When two builders' outputs need to interact, the wirer owns that interaction.

**Testers** write and run tests. They verify the builder's output against the architect's success criteria. They produce the test report that feeds the integrator's battle map.

**Operator count per operation:** 4 to 16 in standard operations. Up to 64 in full-scale deployments with decomposer.

---

### Scouts: Haiku-Tier Reconnaissance

Scouts run on Haiku-tier models. They are fast, cheap, and expendable.

Scouts do reconnaissance. They read files, scan directories, check build status, verify that dependencies exist, confirm that a previous phase completed correctly. They report findings up the chain via INTREP or SPOTREP.

Scouts never modify files. They never write code. They never make decisions. If a scout finds something unexpected, it files a SPOTREP and stops. Decision authority belongs to Command Staff.

Scout advantages:
- Haiku is fast. Scouts return answers in seconds.
- Haiku is cheap. Running 16 scouts costs less than running 1 Opus strategist.
- Scouts are parallelizable. Sixteen scouts checking sixteen directories simultaneously takes no more time than one scout checking one directory.

Use scouts liberally at the start of operations (reconnaissance phase), between phases (verification), and at the end (final check before integration).

---

## Authority Flow

```
OPERATOR intent flows DOWN:
  Operator -> Strategist OPORD -> Decomposer breakdown -> Architect designs -> Operator tasks

REPORTS flow UP:
  Scout INTREP -> Operator SITREP -> Architect SITREP -> Command Staff SITREP -> Human review

HANDOFFS flow LATERAL:
  Builder -> Wirer (same tier, different sub-objective)
  Always CC Command Staff on lateral handoffs
```

No agent may:
- Override a design decision made by an architect in their chain
- Modify a file outside their assigned sub-objective scope
- Contact another agent directly (all coordination through files)
- Escalate past their immediate superior without filing a SPOTREP first

---

## The FRAGO: Human Intervention Protocol

A FRAGO (Fragmentary Order) is how the operator modifies a running operation without stopping it.

The FRAGO principle: **change one thing, leave everything else intact.** A FRAGO is not a new OPORD. It modifies a specific element of the existing plan. Agents who receive a FRAGO update their behavior for that element only and continue.

**When to issue a FRAGO:**
- A builder files a SPOTREP indicating the architect design has a flaw
- A scout discovers the codebase structure does not match the strategist's assumptions
- The operator decides mid-operation to change the scope of one objective
- A wave completes with partial success and the operator wants to redirect the next wave

**How to issue a FRAGO:**
1. Write the FRAGO file to the operation directory: `frago-phase-N.md`
2. The FRAGO format: affected phase, affected agents, what changes, what stays the same
3. The next wave reads the FRAGO before launching
4. Command Staff acknowledges the FRAGO in their next SITREP

**What a FRAGO cannot do:**
- Change the fundamental objective of the operation (that requires a new OPORD)
- Authorize an operator to touch files outside their scope (that requires the decomposer to re-run)
- Override a completed phase (completed work stands, the FRAGO affects future phases only)

The FRAGO is why the human is always in control. The operation runs autonomously, but the human can steer at any phase boundary without restarting.

---

## Summary Table

| Role | Tier | Model | Permissions | Count | Reports To |
|---|---|---|---|---|---|
| Supreme Commander | Human | Human | All | 1 | N/A |
| Strategist | Command Staff | Opus | Read + Write docs | 1 | Human |
| Decomposer | Command Staff | Opus | Read + Write docs | 1 | Strategist |
| Integrator | Command Staff | Opus | Read + Write docs | 1 | Human |
| Architect | Architect | Opus | Read + Write docs | 1 per sub-obj | Decomposer |
| Builder | Operator | Sonnet | Full | 1 per sub-obj | Architect |
| Wirer | Operator | Sonnet | Full | 1-2 per obj | Architect |
| Tester | Operator | Sonnet | Full | 1 per sub-obj | Architect |
| Scout | Recon | Haiku | Read + Diagnostics | 4-16 per op | Command Staff |

OPBLITZ3 numbers: 16 agents deployed, 4 phases, 131 tests passing. The strategist issued one OPORD. No FRAGOs were required. The decomposer's sub-objective isolation was clean enough that all 16 agents ran without conflict.

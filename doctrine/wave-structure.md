# Wave Structure

## Phases vs Waves: The Critical Distinction

These two terms are often confused. Getting them right is essential to planning an operation.

**A phase** is a logical stage of the operation. Phases represent different kinds of work: reconnaissance, design, implementation, integration. Phases are sequential. Phase 2 does not start until phase 1 is complete.

**A wave** is a set of agents that execute in parallel within a phase. Waves are the unit of parallel execution. If a phase has 16 agents and the system supports 10 parallel subagents, the phase runs in two waves: wave 1 (agents 1-10), wave 2 (agents 11-16).

A phase may contain one wave or many waves. The distinction matters for timing, dependency management, and resource planning.

```
PHASE 1: RECONNAISSANCE
  Wave 1: [Scout-A] [Scout-B] [Scout-C] [Scout-D]  <-- all run simultaneously
  (all scouts complete before Phase 2 begins)

PHASE 2: DESIGN
  Wave 1: [Arch-A1] [Arch-A2] [Arch-B1] [Arch-B2]  <-- first 4 architects
  Wave 2: [Arch-C1] [Arch-C2] [Arch-D1] [Arch-D2]  <-- next 4 architects
  (all architects complete before Phase 3 begins)

PHASE 3: IMPLEMENTATION
  Wave 1: [Build-A1] [Build-A2] [Build-B1] [Build-B2] [Test-A1] [Test-A2]
  Wave 2: [Build-C1] [Build-C2] [Build-D1] [Build-D2] [Test-B1] [Test-B2]
  Wave 3: [Wirer-AB] [Wirer-CD] [Test-C1] [Test-C2] [Test-D1] [Test-D2]

PHASE 4: INTEGRATION
  Wave 1: [Integrator]
```

---

## The 10-Agent Parallel Limit

CommandCC supports up to **10 parallel subagents** at one time.

If an operation requires more than 10 agents in a single logical unit of work, batch them into sub-waves:

- Sub-wave 1: agents 1-10 (run in parallel, wait for completion)
- Sub-wave 2: agents 11-16 (run in parallel, wait for completion)

Sub-waves are not separate phases. They are batching within a wave when the agent count exceeds the parallelism limit. The operator and Command Staff treat them as a single wave for reporting purposes.

```
WAVE BATCHING EXAMPLE (16 builders in Phase 3):

Sub-wave 1 [10 agents]:
  [Build-A1][Build-A2][Build-B1][Build-B2][Build-C1]
  [Build-C2][Build-D1][Build-D2][Build-E1][Build-E2]
  |
  v (complete)
Sub-wave 2 [6 agents]:
  [Build-F1][Build-F2][Build-G1][Build-G2][Build-H1][Build-H2]
  |
  v (complete)
  --> Wave is complete. Next wave launches.
```

---

## Wave Execution Timeline

The following ASCII diagram shows how waves nest inside phases, and phases chain sequentially.

```
TIME ------>

|-- PHASE 1: RECON (2 min) --|-- PHASE 2: DESIGN (4 min) --|-- PHASE 3: BUILD (6 min) --|-- PHASE 4: INTEGRATE (1 min) --|
|                            |                             |                            |                               |
| [S1][S2][S3][S4]           | [A1][A2][A3][A4]  Wave 1   | [B1][B2][B3] Wave 1        | [INT] Wave 1                  |
|  Scout wave (parallel)     |         |                   |   [T1][T2][T3]             |                               |
|                            | [A5][A6][A7][A8]  Wave 2   |         |                  |                               |
|                            |                             | [B4][B5][B6] Wave 2        |                               |
|                            |                             |   [T4][T5][T6]             |                               |
|                            |                             |         |                  |                               |
|                            |                             | [W1][W2] Wave 3 (wiring)   |                               |
|                            |                             |         |                  |                               |

TOTAL: ~13 minutes (OPBLITZ3 actual)
```

Key observations from this diagram:

1. Phases are strictly sequential. Phase 2 cannot begin until every scout in Phase 1 has filed its INTREP.
2. Waves within a phase are sequential. Wave 2 of Phase 2 waits for Wave 1 to complete.
3. Agents within a wave are parallel. [A1], [A2], [A3], [A4] all run simultaneously.
4. The integration phase is always a single-agent wave. The integrator reads all outputs and produces one document.

---

## Wave Configuration Guide

### 4-Wave Structure (Simple Operations)

Use 4 waves for straightforward operations with a small number of well-defined objectives.

```
Wave 1: RECON (Scouts)
Wave 2: DESIGN (Architects)
Wave 3: BUILD+TEST (Builders and Testers in parallel)
Wave 4: INTEGRATE (Integrator)
```

Best for: 2-4 objectives, no complex interdependencies, known codebase structure. OPBLITZ3 used this structure.

Agent count: 4-8 scouts, 4-8 architects, 8-16 builders/testers, 1 integrator. Total: 17-33 agents.

---

### 8-Wave Structure (Full Octopus)

Use 8 waves for large operations with many objectives and cross-cutting concerns.

```
Wave 1: RECON (Scouts, broad scan)
Wave 2: DEEP RECON (Scouts, targeted follow-up on findings)
Wave 3: STRATEGY (Strategist + Decomposer)
Wave 4: DESIGN (Architects, all sub-objectives)
Wave 5: BUILD (Builders only)
Wave 6: WIRE (Wirers, integration layer)
Wave 7: TEST (Testers, full regression)
Wave 8: INTEGRATE (Integrator)
```

Best for: 8+ objectives, significant interdependencies, large codebase, multiple teams of builders whose outputs must be wired together. The WIRE wave (wave 6) is the key addition. It runs dedicated wirer agents after all building is complete, before testing begins.

Agent count: 8-16 scouts, 8-16 architects, 16-32 builders, 4-8 wirers, 8-16 testers, 1 integrator. Total: 45-89 agents.

---

### 9-Wave Structure (With Decomposer)

Use 9 waves when the operation scope is not fully known at launch, or when the objectives need to be discovered and decomposed before architecture begins.

```
Wave 1: RECON (Scouts)
Wave 2: STRATEGY (Strategist)
Wave 3: DECOMPOSE (Decomposer, generates sub-objectives)
Wave 4: DESIGN (Architects, one per sub-objective)
Wave 5: BUILD BATCH 1 (Builders, sub-waves as needed)
Wave 6: BUILD BATCH 2 (Builders, remaining sub-objectives)
Wave 7: WIRE (Wirers)
Wave 8: TEST (Testers, full regression)
Wave 9: INTEGRATE (Integrator)
```

The 9-wave structure explicitly separates decomposition from strategy. The strategist produces a coarse plan. The decomposer expands that plan into granular sub-objectives. Architects then work from the decomposer's output, not the strategist's.

This separation matters when the operation is large enough that a single Opus agent cannot hold the full decomposition in one context window. The decomposer can split the work into multiple passes.

---

## Timing Math

Understanding timing is essential for planning operations. The math is straightforward once you know the variables.

**Variables:**
- T(scout) = average scout runtime, typically 30-60 seconds
- T(architect) = average architect design time, typically 2-4 minutes
- T(builder) = average builder implementation time, typically 3-6 minutes
- T(tester) = average tester runtime, typically 1-3 minutes
- T(integrator) = average integrator runtime, typically 1-2 minutes
- P = number of parallel agents per wave

**Formula for a single wave:**
```
Wave duration = max(agent runtimes in wave)
```
Because agents run in parallel, the wave takes as long as the slowest agent, not the sum of all agents.

**Full operation timing example:**

4 objectives, each decomposed into 4 sub-objectives = 16 sub-objectives.
Each sub-objective gets 1 architect + 1 builder + 1 tester = 3 agents per sub-objective.
Total agents: 16 architects + 16 builders + 16 testers + 4 scouts + 1 strategist + 1 decomposer + 1 integrator = 55 agents.

```
Phase 1: RECON
  Wave 1: 4 scouts in parallel
  Duration: 1 minute

Phase 2: STRATEGY + DECOMPOSE
  Wave 1: Strategist (sequential)
  Wave 2: Decomposer (sequential, reads strategist output)
  Duration: 3 minutes (2 min strategy + 1 min decompose)

Phase 3: DESIGN
  Wave 1: 10 architects in parallel (sub-wave 1)
  Wave 2: 6 architects in parallel (sub-wave 2)
  Duration: ~4 minutes (limited by slowest architect)

Phase 4: BUILD
  Wave 1: 10 builders in parallel (sub-wave 1)
  Wave 2: 6 builders in parallel (sub-wave 2)
  Duration: ~6 minutes

Phase 5: TEST + WIRE
  Wave 1: 10 testers + wirers in parallel
  Wave 2: remaining testers
  Duration: ~4 minutes

Phase 6: INTEGRATE
  Wave 1: 1 integrator
  Duration: ~2 minutes

TOTAL: ~20 minutes
```

The compressed formula: **4 objectives x decomposer = 12 subs x 5 agents each = 60 agents, ~22 minutes.**

Without CommandCC, 60 agents' worth of work done sequentially by one engineer would take 60x as long, approximately 22 hours of focused engineering time. CommandCC compresses this to 22 minutes.

---

## Wave Completion Gates

Before a wave launches, CommandCC verifies:

1. **Input gate:** All required input files from the previous wave exist and are non-empty
2. **Format gate:** Input files match the expected format (OPORD, design doc, etc.)
3. **Conflict gate:** No two agents in the incoming wave are assigned to the same file

If any gate fails, the operation pauses and files a SPOTREP to the operator. The operator issues a FRAGO to resolve the conflict before the wave proceeds.

In OPBLITZ3, all wave gates passed cleanly. The decomposer's sub-objective isolation was precise enough that no file conflicts were detected. 16 agents, 4 phases, zero gate failures.

---

## Common Wave Planning Mistakes

**Mistake 1: Putting build and architecture in the same wave.**
Architects must complete before builders start. If an architect and a builder are in the same wave, the builder has no design to execute. Always separate design and implementation into distinct waves.

**Mistake 2: Skipping the WIRE wave for large operations.**
When 8+ builders each touch their own files, the connections between those files need a dedicated agent to own them. Without a WIRE wave, each builder assumes someone else handled the interfaces. They are always wrong.

**Mistake 3: Treating sub-waves as phases.**
Sub-waves are batching for the parallelism limit. They do not represent a change in the type of work being done. Do not put different roles in different sub-waves. All agents in a wave should be the same role doing the same type of work.

**Mistake 4: Launching integration before all testers report.**
The integrator's battle map is only as good as the test results it incorporates. Always confirm all tester SITREPs are received before launching the integration wave. Use a scout to verify if uncertain.

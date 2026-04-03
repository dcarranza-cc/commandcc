# Battle Map Format

## What Is a Battle Map?

A battle map is the consolidated after-action report for a CommandCC operation. It is produced by the integrator agent in the final phase. It is the document the operator reads to understand what was accomplished, how it was accomplished, and what was learned.

The battle map is not a log dump. It is not a list of files changed. It is a structured narrative of the operation, compressed into a format that lets the operator verify success, identify anomalies, and extract lessons for future operations.

When the operator types an objective and CommandCC deploys 64 agents, the battle map is the answer that comes back.

---

## Who Produces It

The integrator agent produces the battle map. The integrator is a Tier 1 (Opus) agent that runs in the final phase of every operation. It reads all SITREPs, test reports, design documents, and scout findings from the operation directory, and assembles them into the battle map.

The integrator's job is synthesis and coherence, not summarization. It is not enough to list what each agent reported. The integrator resolves discrepancies, identifies patterns across agents, and produces a unified assessment of the operation's success.

The integrator writes the battle map to `battle-map.md` in the operation root directory.

---

## Battle Map Sections

### Section 1: Operation Header

The header provides the top-line facts. Any operator who picks up the battle map should be able to determine success or failure from the header alone.

```
# BATTLE MAP: [OPERATION NAME]

**Status:** [SUCCESS | PARTIAL SUCCESS | FAILURE]
**Date:** [ISO date]
**Duration:** [total elapsed time]
**Agents Deployed:** [total count by tier]
**Phases Completed:** [N of N]
**Waves Completed:** [N of N]
**Operator:** [handle or ID]
**Integrator:** [agent ID]
```

### Section 2: Objective Status Summary

A table showing every objective and sub-objective, with status. The operator should be able to verify that every objective in the original OPORD was addressed.

```
## Objectives

| ID | Objective | Status | Owner | Notes |
|---|---|---|---|---|
| A | [objective description] | COMPLETE | builder-A | |
| A1 | [sub-objective] | COMPLETE | builder-A1 | |
| A2 | [sub-objective] | COMPLETE | builder-A2 | |
| B | [objective description] | PARTIAL | builder-B | See lessons learned |
| B1 | [sub-objective] | COMPLETE | builder-B1 | |
| B2 | [sub-objective] | BLOCKED | builder-B2 | Dependency unavailable |
```

Status values: `COMPLETE`, `PARTIAL`, `BLOCKED`, `SKIPPED`, `NOT STARTED`.

### Section 3: Phase and Wave Timeline

A chronological record of the operation. Every phase, every wave, when it started, when it completed, and what it produced.

```
## Timeline

### Phase 1: RECONNAISSANCE
  Duration: [X min Y sec]
  Waves: 1
  Agents: 4 scouts

  Wave 1 (scouts):
    - scout-A: [result summary]
    - scout-B: [result summary]
    - scout-C: [result summary]
    - scout-D: [result summary]
  Output: 4 INTREPs filed, codebase map complete

### Phase 2: DESIGN
  Duration: [X min Y sec]
  Waves: 2
  Agents: 8 architects

  Wave 1 (architects A1-A4):
    - arch-A1: design complete, 3 files planned
    - arch-A2: design complete, 2 files planned
    ...
  Wave 2 (architects B1-B4):
    ...
  Output: 8 design documents filed

### Phase 3: IMPLEMENTATION
  Duration: [X min Y sec]
  Waves: 3
  Agents: 12 (builders + testers + wirers)
  ...

### Phase 4: INTEGRATION
  Duration: [X min Y sec]
  Waves: 1
  Agents: 1 integrator
  Output: This battle map
```

### Section 4: Per-Objective Results

For each objective, a plan vs. actual comparison. This is where the operator sees whether the operation went according to plan or deviated, and why.

```
## Per-Objective Results

### Objective A: [description]

**Plan (from architect-A design):**
[What was planned: files to create, interfaces to implement, success criteria]

**Actual (from builder-A SITREP):**
[What was built: files created, approaches used]

**Variance:**
[What differed from the plan, and why. None if clean.]

**Files Created:**
- path/to/file1.py (NEW)
- path/to/file2.py (NEW)

**Files Modified:**
- path/to/existing.py (MODIFIED: added class method X)
```

### Section 5: Test Results Summary

The quantitative heart of the battle map. Total tests, pass/fail counts, coverage by objective.

```
## Test Results

**Total Tests:** [N]
**Passing:** [N]
**Failing:** [N]
**Pass Rate:** [percentage]

| Objective | Tests Written | Passing | Failing | Coverage |
|---|---|---|---|---|
| A1 | [N] | [N] | [N] | [%] |
| A2 | [N] | [N] | [N] | [%] |
| B1 | [N] | [N] | [N] | [%] |
| B2 | [N] | [N] | [N] | [N/A - blocked] |
| **TOTAL** | **[N]** | **[N]** | **[N]** | **[%]** |

### Failing Tests (if any)
[List each failing test with: test name, objective, failure message, assigned owner]
```

### Section 6: Lessons Learned

The most valuable section for improving future operations. What went well. What did not. What to do differently next time.

```
## Lessons Learned

### What Worked
- [bullet list of things that went smoothly, with brief explanation]

### What Did Not Work
- [bullet list of problems encountered, with root cause if known]

### Recommendations for Future Operations
- [bullet list of changes to doctrine, tooling, or process]

### Decomposer Notes
[How well did the Decomposer's file domain isolation hold up?
 Were there any conflicts that required FRAGO?
 Were sub-objectives sized correctly (not too large, not too small)?]

### Agent Performance
[Any notable performance by individual agents, positive or negative.
 Patterns across agents that suggest systemic issues.]
```

### Section 7: Metrics

The numbers. Every metric that can be extracted from the operation.

```
## Metrics

### Scale
| Metric | Value |
|---|---|
| Total agents deployed | [N] |
| Tier 1 (Opus) | [N] |
| Tier 2 (Sonnet) | [N] |
| Tier 3 (Haiku) | [N] |
| Peak parallel agents | [N] |

### Output
| Metric | Value |
|---|---|
| Files created | [N] |
| Files modified | [N] |
| Lines of code written | [N] |
| Tests written | [N] |
| Tests passing | [N] |

### Timing
| Phase | Duration |
|---|---|
| Phase 1: Recon | [X min] |
| Phase 2: Design | [X min] |
| Phase 3: Implementation | [X min] |
| Phase 4: Integration | [X min] |
| **Total** | **[X min]** |

### Efficiency
| Metric | Value |
|---|---|
| Human input (sentences) | [N] |
| Human active time | [X min] |
| Total operation time | [X min] |
| Cognitive load compression | [Nx] |
| Messages filed (total) | [N] |
| FRAGOs issued | [N] |
| SPOTREPs filed | [N] |
```

---

## The Full Template (Copy-Ready)

```markdown
# BATTLE MAP: [OPERATION NAME]

**Status:** [SUCCESS | PARTIAL SUCCESS | FAILURE]
**Date:** [ISO date]
**Duration:** [total elapsed time]
**Agents Deployed:** [N] ([T1] Opus / [T2] Sonnet / [T3] Haiku)
**Phases Completed:** [N of N]
**Waves Completed:** [N of N]
**Operator:** [handle]
**Integrator:** [agent ID]

---

## Objectives

| ID | Objective | Status | Owner | Notes |
|---|---|---|---|---|
| A | | | | |

---

## Timeline

### Phase 1: [NAME]
  Duration:
  Waves:
  Agents:
  Wave 1:
  Output:

---

## Per-Objective Results

### Objective A: [description]
**Plan:**
**Actual:**
**Variance:**
**Files Created:**
**Files Modified:**

---

## Test Results

**Total Tests:**
**Passing:**
**Failing:**
**Pass Rate:**

| Objective | Tests Written | Passing | Failing |
|---|---|---|---|
| **TOTAL** | | | |

---

## Lessons Learned

### What Worked

### What Did Not Work

### Recommendations

### Decomposer Notes

---

## Metrics

### Scale
| Metric | Value |
|---|---|
| Total agents | |
| Tier 1 (Opus) | |
| Tier 2 (Sonnet) | |
| Tier 3 (Haiku) | |

### Output
| Metric | Value |
|---|---|
| Files created | |
| Files modified | |
| Tests written | |
| Tests passing | |

### Timing
| Phase | Duration |
|---|---|
| Total | |

### Efficiency
| Metric | Value |
|---|---|
| Human input (sentences) | |
| Total operation time | |
| Cognitive load compression | |
| FRAGOs issued | |
| SPOTREPs filed | |
```

---

## OPBLITZ3: The Canonical Example

OPERATION OPBLITZ3 is the first large-scale CommandCC operation conducted under this doctrine. Its battle map is the reference example for all future operations.

**Operation Header:**

```
# BATTLE MAP: OPBLITZ3

Status: SUCCESS
Date: 2026-04-02
Duration: 13 minutes
Agents Deployed: 16 (4 Opus / 8 Sonnet / 4 Haiku)
Phases Completed: 4 of 4
Waves Completed: 4 of 4
```

**Test Results:**

```
Total Tests: 131
Passing: 131
Failing: 0
Pass Rate: 100%
```

**Efficiency Metrics:**

```
Human input: ~4 sentences
Total operation time: 13 minutes
Cognitive load compression: 200x
FRAGOs issued: 0
SPOTREPs filed: 0
```

**Lessons Learned (from OPBLITZ3):**

The Decomposer's file domain isolation prevented the `empire1d.py` conflict that was identified in planning. Assigning coupled changes to a single sub-objective is the correct approach. Two builders in the same wave should never be assigned to the same file.

Zero SPOTREPs across 16 agents indicates that architect designs were complete and the OPORDs were unambiguous. This is the target state. Any operation with more than two SPOTREPs per 16 agents should be reviewed for planning gaps.

The 13-minute total is the benchmark for a 16-agent, 4-phase operation. Operations at this scale should complete in 10-20 minutes depending on complexity and builder runtime. Operations taking longer than 30 minutes at this scale indicate a wave design problem.

**OPBLITZ3 validates the CommandCC model.** One human. Four sentences. 16 agents. 131 passing tests. 13 minutes. The doctrine works.

---

## Integrator Instructions

The integrator agent that produces the battle map should follow this procedure:

1. Read all files in the operation directory, starting with phase 1 and proceeding in order
2. Cross-reference each agent's SITREP against the OPORD they received
3. Build the objectives table from the Decomposer's sub-objective list, filled in with actual outcomes
4. Compile the test results table from all tester SITREPs
5. Identify any discrepancies between plan and actual
6. Write the lessons learned section from patterns across agents (not from any single agent's perspective)
7. Calculate all metrics from the raw data in agent reports
8. Write the operation header last, after all sections are complete, to ensure the status reflects the full picture

The integrator must never editorialize about agent performance in the main sections. Observations about individual agents belong only in the Lessons Learned section, and only when they are relevant to improving future operations.

The battle map is the operator's document. It is written for the human, not for the agents.

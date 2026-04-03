# Feature Deploy Lite

Deploy 1-2 features using the streamlined 4-phase pattern. No decomposer, no architects. For simple, well-understood objectives.

**Usage:** `/feature-deploy-lite <1 or 2 features>`

**Pattern:** 4-phase lite
**Estimated time:** ~10 minutes for 1-2 objectives
**Agent count:** 2-8 agents across phases

Use this when the objective is small enough to hold in your head. Use `/feature-deploy` (OPBLITZ) for 3+ objectives or anything requiring architectural planning.

---

## Operation: LITE

**Objectives received:** $ARGUMENTS

Execute the 4-phase lite pattern. Keep it tight. No DECOMPOSITION.md, no ARCH-*.md documents.

---

## Wave 0: RECON (30 seconds, parallel)

Launch 4 Haiku scouts simultaneously. All scouts are READ-ONLY.

```
Scout 1 - Structure and entry point scanner
  model: haiku
  tools: Glob, Read
  task: Map the top-level directory structure. Find the main entry point, config files,
        and the directories most likely to be affected by: $ARGUMENTS
        Write findings to RECON-structure.md.

Scout 2 - Dependency and stack scanner
  model: haiku
  tools: Read, Glob
  task: Read the dependency manifest (package.json, requirements.txt, go.mod, etc).
        Identify the framework, testing library, and any relevant existing packages.
        Write findings to RECON-deps.md.

Scout 3 - Existing test scanner
  model: haiku
  tools: Glob, Read
  task: Find existing test files. Identify the test runner and test conventions used.
        Note any modules related to: $ARGUMENTS that already have tests.
        Write findings to RECON-tests.md.

Scout 4 - Related code scanner
  model: haiku
  tools: Grep, Read
  task: Search for any existing code related to the objectives: $ARGUMENTS
        Find similar patterns, existing handlers, or relevant utilities already in the codebase.
        Write findings to RECON-related.md.
```

Await all scouts. Consolidate into RECON-REPORT.md.

---

## Wave 1: PLAN + BUILD (7 minutes, single strategist then parallel builders)

First, run the strategist:

```
Strategist
  model: opus
  tools: Read
  context: Read RECON-REPORT.md
  task: |
    Read the recon report and the objectives: $ARGUMENTS

    Produce OPERATION-PLAN.md containing:
    1. Objectives (1-2 max for lite pattern)
    2. Files to create and files to modify, listed by objective
    3. Interface contracts: function signatures, API routes, or data structures needed
    4. Integration points: how the new code connects to the existing codebase
    5. Test approach: what to unit test and what to integration test
    6. Any risks or constraints from recon

    Keep this tight. This is a lite operation, not a full architecture review.
    Do not write application code.
```

Await strategist. Verify OPERATION-PLAN.md exists.

Then launch builders, one per objective:

```
Builder-{n} (one per objective, up to 2 builders in parallel)
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read OPERATION-PLAN.md, read any existing source files mentioned
  task: |
    Implement objective {n} from OPERATION-PLAN.md.

    Follow the interface contracts and file list in the operation plan exactly.
    Write production-ready code. Handle errors. Do not skip edge cases.
    If you discover the plan is incorrect, implement the closest correct solution
    and write a note to DEVIATION-{n}.md.

    When complete, write COMPLETE-BUILD-{n}.lock with a one-line summary
    and list of files created or modified.
```

Await all builders.

---

## Wave 2: TEST (3 minutes, parallel per objective)

```
Tester-{n} (one per objective, parallel)
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read OPERATION-PLAN.md sections for objective {n},
           read all files created or modified by Builder-{n}
  task: |
    Write and run tests for objective {n}.

    Cover:
    - Unit tests for all new functions
    - Integration test for the main user-facing behavior
    - At least one edge case and one error path per function

    Run the tests. Write TEST-RESULTS-{n}.md with pass/fail counts and any failures diagnosed.
```

Await all testers.

---

## Wave 3: REVIEW + CLOSE (2 minutes)

```
Reviewer
  model: opus
  tools: Read, Grep
  context: Read OPERATION-PLAN.md, all built source files,
           all TEST-RESULTS-*.md, all DEVIATION-*.md files
  task: |
    Review the complete implementation for: $ARGUMENTS

    Produce BATTLE-MAP.md containing:
    1. Objectives and whether each is complete
    2. Overall verdict: APPROVED, APPROVED WITH NOTES, or REQUIRES CHANGES
    3. Any critical or high severity findings with file and line references
    4. Test results summary
    5. Files created and modified
    6. Deployment readiness: READY, READY WITH CAVEATS, or BLOCKED

    Do not modify any source files.
```

---

## Operation Complete

BATTLE-MAP.md is the final deliverable.

Wave timing summary:
- Wave 0 RECON:            ~0:30
- Wave 1 PLAN + BUILD:     ~7:00
- Wave 2 TEST:             ~3:00
- Wave 3 REVIEW + CLOSE:   ~2:00
- Total:                   ~12:30

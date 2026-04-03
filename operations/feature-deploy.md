# Feature Deploy (OPBLITZ)

Deploy N features in parallel using the full 9-phase octopus pattern.

**Usage:** `/feature-deploy <list of features or objectives>`

**Pattern:** 9-phase octopus (OPBLITZ)
**Estimated time:** ~22 minutes for 3-4 objectives
**Agent count:** 2-16 agents across phases

---

## Operation: OPBLITZ

**Objectives received:** $ARGUMENTS

Execute the full 9-phase octopus pattern against the objectives above. Do not skip phases. Do not collapse phases. Await each wave before launching the next.

---

## Wave 0: RECON (30 seconds, parallel)

Launch 6 Haiku scouts simultaneously. All scouts are READ-ONLY.

```
Scout 1 - File structure mapper
  model: haiku
  tools: Glob, Read
  task: Map the top-level directory structure. List all source directories, config files,
        and entry points. Write findings to RECON-structure.md.

Scout 2 - Dependency scanner
  model: haiku
  tools: Read, Glob, Bash
  task: Read package.json, requirements.txt, go.mod, Cargo.toml, or equivalent.
        List all runtime and dev dependencies with versions. Write findings to RECON-deps.md.

Scout 3 - Existing test scanner
  model: haiku
  tools: Glob, Read
  task: Find all test files. Count total tests. Identify untested modules.
        Write findings to RECON-tests.md.

Scout 4 - Config and environment scanner
  model: haiku
  tools: Glob, Read
  task: Find all config files, .env examples, and environment variable references.
        List required env vars. Write findings to RECON-config.md.

Scout 5 - API surface scanner
  model: haiku
  tools: Grep, Read
  task: Find all route definitions, exported functions, and public interfaces.
        Write findings to RECON-api.md.

Scout 6 - Code health scanner
  model: haiku
  tools: Grep, Read, Bash
  task: Count TODO/FIXME/HACK comments. Find any obvious error handling gaps.
        Identify any deprecated dependencies. Write findings to RECON-health.md.
```

Await all scouts. Then consolidate all RECON-*.md files into a single RECON-REPORT.md summary.

---

## Wave 1: STRATEGY (2 minutes, single agent)

```
Strategist
  model: opus
  tools: Read
  context: Read RECON-REPORT.md
  task: |
    Read the recon report and the operation objectives: $ARGUMENTS

    Produce OPERATION-PLAN.md containing:
    1. Operation scope: what will and will not be changed
    2. Objectives list: numbered, one per line
    3. Known risks and constraints from recon
    4. Technology decisions required before build
    5. Integration points between objectives (if any)
    6. Recommended sub-objective count for decomposition
    7. File ownership map: which files are likely affected by which objective

    Do not write application code. Do not modify any source files.
```

Await strategist. Verify OPERATION-PLAN.md exists before proceeding.

---

## Wave 2: DECOMPOSE (2 minutes, single agent) [THE MULTIPLIER]

```
Decomposer
  model: opus
  tools: Read
  context: Read OPERATION-PLAN.md and RECON-REPORT.md
  task: |
    Read the operation plan. Break each objective into independent sub-objectives.

    Rules for decomposition:
    - Each sub-objective must be completable by a single builder agent working alone
    - Sub-objectives within the same objective must have zero cross-dependencies
    - Sub-objectives across different objectives may share read dependencies on existing files
      but must never share write targets
    - Each sub-objective must have a clear, testable completion condition
    - Target 3-4 sub-objectives per original objective

    Produce DECOMPOSITION.md containing for each sub-objective:
    - ID: SUB-{objective_number}-{sub_number}
    - Parent objective
    - Description: one sentence
    - Files to create or modify
    - Inputs: what this sub-objective reads (existing files or other sub-objective outputs)
    - Outputs: what this sub-objective produces
    - Completion condition: how to verify it is done
    - Recommended builder type: backend, frontend, api, database, or infra

    After the sub-objective list, include a dependency graph section confirming zero
    intra-phase write conflicts.
```

Await decomposer. Verify DECOMPOSITION.md exists before proceeding.
Count sub-objectives. If count exceeds 10, plan batching for phases 3 and 4.

---

## Wave 3: ARCHITECTURE (3 minutes, parallel per sub-objective)

Launch one Opus architect per sub-objective, batched at 10 max concurrent.

For each sub-objective SUB-{n} from DECOMPOSITION.md:

```
Architect-{n}
  model: opus
  tools: Read, Grep
  context: Read DECOMPOSITION.md entry for SUB-{n}, read OPERATION-PLAN.md,
           read any existing files listed in the sub-objective's inputs
  task: |
    Design the implementation for sub-objective SUB-{n}.

    Produce ARCH-{n}.md containing:
    1. Sub-objective restatement
    2. Data structures and types to create or modify
    3. Function signatures with parameter types and return types
    4. Interface contracts (what this module promises to callers)
    5. External dependencies this implementation requires
    6. File list: exact paths to create or modify, with purpose of each
    7. Error handling strategy
    8. Testing approach: what to unit test and what to integration test
    9. Security considerations specific to this sub-objective

    Do not write application code. Do not create source files. Design only.
```

Batch if sub-objective count exceeds 10. Await all architects before proceeding.

---

## Wave 4: BUILD (5 minutes, parallel per sub-objective)

Launch one Sonnet builder per sub-objective, batched at 10 max concurrent.

For each sub-objective SUB-{n} from DECOMPOSITION.md:

```
Builder-{n}
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read ARCH-{n}.md, read DECOMPOSITION.md entry for SUB-{n},
           read any existing source files listed as inputs
  task: |
    Implement sub-objective SUB-{n} exactly as designed in ARCH-{n}.md.

    Rules:
    - Implement every function and type defined in the architecture document
    - Follow the exact file paths specified in ARCH-{n}.md
    - Match the interface contracts exactly, no deviations
    - Do not implement anything not in the architecture document
    - If you discover the architecture document is incorrect or incomplete,
      write a note to ARCH-{n}-DEVIATION.md and implement the closest correct solution
    - Write clean, production-ready code with inline comments where logic is non-obvious
    - Handle all error cases defined in the architecture document

    When complete, write COMPLETE-BUILD-{n}.lock containing a one-line summary
    of what was built and the list of files created or modified.
```

Batch if sub-objective count exceeds 10. Await all builders before proceeding.

---

## Wave 5: WIRE (3 minutes, parallel by concern)

Launch 3 Sonnet wirers simultaneously. Wirers have full write access.

```
Import Wirer
  model: sonnet
  tools: Read, Edit, Glob, Grep, Bash
  task: |
    Read all COMPLETE-BUILD-*.lock files to understand what was built.
    Find all import errors, missing module references, and circular dependencies.
    Fix all import paths across the codebase so that all built modules can find each other.
    Do not add new features. Only fix import and module resolution issues.
    Write WIRE-imports.md listing every file touched and every change made.

Config Wirer
  model: sonnet
  tools: Read, Edit, Glob, Grep, Write
  task: |
    Read all COMPLETE-BUILD-*.lock files and RECON-config.md.
    Find all new configuration requirements introduced by the build phase.
    Update config files, .env.example, and any config validation code to include new settings.
    Ensure all new modules have their required environment variables documented.
    Write WIRE-config.md listing every change made.

Startup Wirer
  model: sonnet
  tools: Read, Edit, Glob, Grep, Bash
  task: |
    Read all COMPLETE-BUILD-*.lock files and RECON-structure.md.
    Find the application entry point(s). Ensure all new modules are registered,
    initialized, and started in the correct order.
    Update dependency injection containers, service registries, or module loaders as needed.
    Run the application in dry-run or check mode if available to verify startup.
    Write WIRE-startup.md listing every change made.
```

Await all wirers before proceeding.

---

## Wave 6: TEST (3 minutes, parallel per sub-objective)

Launch one Sonnet tester per sub-objective, batched at 10 max concurrent.

For each sub-objective SUB-{n}:

```
Tester-{n}
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read ARCH-{n}.md, read built source files for SUB-{n},
           read WIRE-*.md for any wiring changes affecting SUB-{n}
  task: |
    Write and run a comprehensive test suite for sub-objective SUB-{n}.

    Required test types:
    - Unit tests: every function in the architecture document gets at least one test
    - Edge case tests: null inputs, empty collections, max values, error paths
    - Integration tests: test the interfaces defined in ARCH-{n}.md against real dependencies
      or realistic mocks

    Run all tests. Capture the output.

    Write TEST-RESULTS-{n}.md containing:
    - Total tests written
    - Total tests passed
    - Total tests failed
    - For each failure: test name, expected, actual, and a diagnosis
    - Coverage estimate for SUB-{n} code
```

Batch if sub-objective count exceeds 10. Await all testers before proceeding.

---

## Wave 7: REVIEW (2 minutes, parallel per original objective)

Launch one Opus reviewer per original objective (not per sub-objective). All reviewers are READ-ONLY.

```
Reviewer-{objective_n}
  model: opus
  tools: Read, Grep
  context: Read all ARCH-*.md for sub-objectives under this objective,
           read all built source files, read all TEST-RESULTS-*.md for this objective,
           read WIRE-*.md files
  task: |
    Review the complete implementation for objective {n}: [objective description].

    Examine:
    - Correctness: does the code match the architecture document?
    - Completeness: is everything in the architecture document implemented?
    - Code quality: readability, error handling, edge cases
    - Security: any obvious vulnerabilities, missing auth checks, exposed secrets
    - Test quality: are the tests meaningful or just coverage theater?
    - Integration: do the wiring changes look correct?

    Produce REVIEW-{n}.md containing:
    1. Objective summary
    2. Overall verdict: APPROVED, APPROVED WITH NOTES, or REQUIRES CHANGES
    3. Findings list, each with:
       - Severity: CRITICAL, HIGH, MEDIUM, LOW, or INFO
       - File and line number (if applicable)
       - Description
       - Recommended fix
    4. Test assessment: adequate or inadequate, with reasons
    5. Security assessment: clean or concerns found
    6. Final recommendation to integrator

    Do not modify any source files.
```

Await all reviewers before proceeding.

---

## Wave 8: INTEGRATION (2 minutes, single agent)

```
Integrator
  model: opus
  tools: Read
  context: Read OPERATION-PLAN.md, DECOMPOSITION.md, all REVIEW-*.md files,
           all COMPLETE-BUILD-*.lock files, all WIRE-*.md files
  task: |
    Read all review documents and produce the final operation summary.

    Produce BATTLE-MAP.md containing:
    1. Operation name and timestamp
    2. Original objectives: $ARGUMENTS
    3. Sub-objectives completed: list with status (built, tested, reviewed)
    4. Review summary: count of APPROVED, APPROVED WITH NOTES, REQUIRES CHANGES
    5. Critical findings requiring immediate action (CRITICAL or HIGH severity)
    6. Files created: full list of all new files
    7. Files modified: full list of all changed files
    8. Configuration changes required before deployment
    9. Known outstanding issues with severity
    10. Deployment readiness: READY, READY WITH CAVEATS, or BLOCKED
    11. Recommended next action

    If any REVIEW-*.md has verdict REQUIRES CHANGES with CRITICAL findings,
    set deployment readiness to BLOCKED and list the blockers explicitly.
```

---

## Operation Complete

BATTLE-MAP.md is the final deliverable. Read it to understand what was built, what passed review, and whether the operation is deployment-ready.

Wave timing summary:
- Wave 0 RECON:        ~0:30
- Wave 1 STRATEGY:     ~2:00
- Wave 2 DECOMPOSE:    ~2:00
- Wave 3 ARCHITECTURE: ~3:00
- Wave 4 BUILD:        ~5:00
- Wave 5 WIRE:         ~3:00
- Wave 6 TEST:         ~3:00
- Wave 7 REVIEW:       ~2:00
- Wave 8 INTEGRATION:  ~2:00
- Total:               ~22:30

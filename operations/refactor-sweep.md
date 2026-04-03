# Refactor Sweep

Refactor N modules simultaneously. Identifies code smells, designs a refactoring strategy per module, refactors in parallel, updates imports, and verifies nothing broke.

**Usage:** `/refactor-sweep [scope: full | path/to/directory | list of files or modules]`

**Pattern:** 6-phase refactor sweep
**Estimated time:** ~20 minutes for a medium codebase
**Agent count:** 4-16 agents across phases

**Scope:** $ARGUMENTS (default: full codebase, prioritized by code quality metrics)

---

## Operation: CLEANUP

Execute a disciplined refactoring sweep. No new features. No behavior changes. The codebase before and after this operation must be functionally identical. Every refactored module must pass its original tests.

---

## Wave 0: RECON (45 seconds, parallel)

Launch 5 Haiku scouts simultaneously. All scouts are READ-ONLY.

```
Scout 1 - Code smell scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Scan the codebase for common code smells:
        - Functions longer than 50 lines
        - Files longer than 300 lines
        - Deeply nested code (4+ levels of indentation)
        - Duplicated code blocks (same logic appearing in 2+ places)
        - Functions with more than 4 parameters
        - Boolean parameters (often a sign of functions doing two things)
        - Long chains of if/else or switch with many cases
        List each finding with file path, line number, and smell type.
        Write findings to RECON-smells.md.

Scout 2 - Duplication scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find duplicated code: look for functions, logic blocks, or data transformation
        patterns that appear more than once in the codebase.
        Look for copy-pasted constants, repeated validation logic, and similar utility functions.
        Write findings to RECON-duplication.md.

Scout 3 - Naming and clarity scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find naming issues:
        - Single-letter variable names outside of loop counters
        - Abbreviations that are not standard in the domain
        - Functions whose names do not describe what they do
        - Misleading names (function named "get" that has side effects)
        - Inconsistent naming conventions (camelCase vs snake_case mixed)
        Write findings to RECON-naming.md.

Scout 4 - Architecture smell scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find architectural issues:
        - God objects or modules that do too many things
        - Modules with too many imports (fan-in suggests misplaced responsibility)
        - Circular dependencies between modules
        - Business logic in presentation layer (controllers or views)
        - Data access code mixed with business logic
        Write findings to RECON-architecture.md.

Scout 5 - Test coverage scanner
  model: haiku
  tools: Glob, Read, Grep, Bash
  task: Run the test suite if possible (quick run, no long tests).
        Find which modules have test coverage and which do not.
        The refactorer must not reduce test coverage.
        Write findings to RECON-tests.md.
```

Await all scouts. Consolidate into RECON-REPORT.md.

---

## Wave 1: REFACTORING STRATEGY (3 minutes, single agent)

```
Refactoring Strategist
  model: opus
  tools: Read
  context: Read RECON-REPORT.md and all individual RECON-*.md files
  task: |
    Analyze the reconnaissance and produce REFACTOR-PLAN.md containing:

    1. Priority findings: the top 10 most impactful code quality issues ranked by:
       - Maintainability impact: how much does this hurt future development?
       - Risk: how likely is this to cause bugs?
       - Scope: how many files are affected?
    2. Refactoring units: group related refactoring work into independent units.
       Each unit should be refactorable without affecting other units.
       Target 4-8 units for parallelism.
    3. Per-unit refactoring plan:
       - Files to refactor
       - Specific changes: extract function, rename variable, remove duplication,
         split file, consolidate logic, etc
       - Expected outcome: what the code will look like after (not just "better")
       - Risk level: LOW (pure rename), MEDIUM (restructuring), HIGH (logic extraction)
       - Test requirement: which tests must pass before and after
    4. Import change map: if any refactoring moves or renames modules,
       list every file that will need its imports updated
    5. Out of scope: issues identified in recon that are NOT being addressed in this sweep
       and why (too risky, too large, need separate feature work, etc)
    6. Rollback strategy: if a refactoring unit causes test failures, how to revert it

    Hard rule: no behavior changes. If a refactoring would change behavior,
    exclude it from this plan and note it as a follow-up requiring feature work.
```

Await strategist. Verify REFACTOR-PLAN.md exists.

---

## Wave 2: ARCHITECTURE SIGN-OFF (2 minutes, single agent)

```
Refactoring Architect
  model: opus
  tools: Read, Grep
  context: Read REFACTOR-PLAN.md, read source files for the highest-risk units
  task: |
    Review the refactoring plan for safety and correctness.

    Verify:
    - No planned change alters observable behavior
    - The import change map is complete (no import updates will be missed)
    - HIGH risk units have adequate rollback plans
    - No unit has hidden dependencies on other units that would create sequencing issues
    - The test requirement for each unit is sufficient to catch regressions

    Produce ARCH-REFACTOR.md containing:
    1. Validation result: APPROVED or NEEDS REVISION
    2. If NEEDS REVISION: specific concerns and required changes to the plan
    3. Approved unit list with any added safety notes
    4. Sequencing requirements: any units that must complete before others can start
    5. Units to treat with extra caution: flag any units where a small mistake could
       have broad impact

    Do not modify any source files.
```

Await architect. If ARCH-REFACTOR.md contains NEEDS REVISION, update REFACTOR-PLAN.md
before proceeding.

---

## Wave 3: REFACTOR (5 minutes, parallel per unit)

Launch one Sonnet refactorer per unit, batched at 10 max concurrent.
Respect any sequencing requirements from ARCH-REFACTOR.md.

For each refactoring unit {n} from ARCH-REFACTOR.md:

```
Refactorer-{n}
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read ARCH-REFACTOR.md (safety notes for unit {n}),
           read REFACTOR-PLAN.md (per-unit plan for unit {n}),
           read all source files in unit {n}
  task: |
    Execute the refactoring plan for unit {n}.

    Strict rules:
    - Implement every change listed in the unit plan
    - Do not implement any change NOT in the unit plan
    - Do not change any logic, only structure and naming
    - Do not add new features, tests, or documentation in this pass
    - If a planned change would require a behavior change to work correctly,
      stop, do not make the change, and write a note to REFACTOR-BLOCKED-{n}.md

    After completing the structural changes:
    - Run the tests specified for this unit in REFACTOR-PLAN.md
    - If any test fails: revert the specific change that caused the failure,
      document it in REFACTOR-BLOCKED-{n}.md, and continue with the remaining changes
    - Do not merge the unit's work with other units' files

    Write COMPLETE-REFACTOR-{n}.lock containing:
    - List of files modified
    - Summary of changes made (one line per change)
    - Test results: passing count, failing count
    - Any blocked changes documented in REFACTOR-BLOCKED-{n}.md
```

Batch if unit count exceeds 10. Await all refactorers before proceeding.

---

## Wave 4: IMPORT UPDATE AND VERIFY (3 minutes, parallel)

```
Import Updater
  model: sonnet
  tools: Read, Edit, Grep, Glob, Bash
  context: Read REFACTOR-PLAN.md (import change map),
           read all COMPLETE-REFACTOR-*.lock files to know what was actually moved or renamed
  task: |
    Update all imports affected by the refactoring.

    Only update imports for changes that were actually made (check COMPLETE-REFACTOR-*.lock).
    Skip imports for any changes that were blocked (check REFACTOR-BLOCKED-*.md).

    After updating imports, run the full test suite.
    Write IMPORT-UPDATE-COMPLETE.lock with:
    - Files with updated imports
    - Test run result: passing/failing counts
    - Any import errors remaining

Regression Verifier
  model: sonnet
  tools: Read, Bash, Glob
  task: |
    Run the full test suite and verify there are no regressions.
    Compare test results to RECON-tests.md (the baseline before refactoring).
    Write VERIFY-REGRESSION.md with:
    - Tests passing before refactoring (from RECON-tests.md)
    - Tests passing after refactoring
    - Any tests that were passing before but are now failing (regressions)
    - Any tests that are now failing for reasons unrelated to refactoring
    - Verdict: NO REGRESSIONS, MINOR REGRESSIONS, or REGRESSIONS DETECTED
```

Await both. If VERIFY-REGRESSION.md shows REGRESSIONS DETECTED, run a triage pass:

```
Regression Fixer (conditional, only if regressions detected)
  model: sonnet
  tools: Read, Edit, Grep, Glob, Bash
  context: Read VERIFY-REGRESSION.md, read the failing tests,
           read the refactored source files for the failing tests
  task: |
    Fix the regressions identified in VERIFY-REGRESSION.md.
    Only fix regressions caused by the refactoring (structural issues, not logic bugs).
    If a regression requires a logic change to fix, document it in REGRESSION-UNFIXED.md
    and do not attempt to fix it.
    Run the test suite again after fixes. Write REGRESSION-FIX-COMPLETE.lock with results.
```

---

## Wave 5: REVIEW AND CLOSE (2 minutes, single agent)

```
Refactoring Reviewer
  model: opus
  tools: Read
  context: Read REFACTOR-PLAN.md, ARCH-REFACTOR.md, VERIFY-REGRESSION.md,
           all COMPLETE-REFACTOR-*.lock files, all REFACTOR-BLOCKED-*.md files,
           IMPORT-UPDATE-COMPLETE.lock
  task: |
    Review the completed refactoring and produce BATTLE-MAP.md containing:

    1. Refactoring summary: units completed, files changed, changes made
    2. Blocked changes: list from all REFACTOR-BLOCKED-*.md files with reasons
    3. Regression status: from VERIFY-REGRESSION.md
    4. Code quality improvement: qualitative assessment of what improved
    5. Outstanding smells: issues from recon that were not addressed in this sweep
    6. Follow-up recommendations:
       - Blocked changes that need feature work to resolve
       - High-risk areas that need dedicated refactoring with more test coverage first
       - Any regressions that could not be fixed structurally
    7. Overall verdict: CLEAN (all units complete, no regressions),
       PARTIAL (some blocked, no regressions), or UNSTABLE (regressions remain)

    Do not modify any source files.
```

---

## Operation Complete

BATTLE-MAP.md is the final deliverable. Any blocked changes are documented. Any regressions not fixed are listed explicitly.

Wave timing summary:
- Wave 0 RECON:                ~0:45
- Wave 1 REFACTORING STRATEGY: ~3:00
- Wave 2 ARCHITECTURE SIGN-OFF:~2:00
- Wave 3 REFACTOR:             ~5:00
- Wave 4 IMPORT + VERIFY:      ~3:00
- Wave 5 REVIEW + CLOSE:       ~2:00
- Total:                       ~15:45

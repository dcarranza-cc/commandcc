# Codebase Migration

Migrate a codebase from one framework, library, or runtime to another. Scans all affected files, designs the migration path per module, transforms modules in parallel, and verifies nothing was missed.

**Usage:** `/codebase-migration <from: X> <to: Y> [scope: full path or directory]`

**Pattern:** 7-phase migration sweep
**Estimated time:** ~25 minutes for a medium codebase
**Agent count:** 4-18 agents across phases

**Migration parameters:** $ARGUMENTS

Examples:
- `/codebase-migration from: Express to: Fastify`
- `/codebase-migration from: Python 2.7 to: Python 3.12`
- `/codebase-migration from: Mongoose to: Prisma`
- `/codebase-migration from: Jest to: Vitest`

---

## Operation: OVERHAUL

Execute the full migration. Do not begin transforming files until the migration plan is approved by the architect. Do not skip the verification phase.

---

## Wave 0: RECON (45 seconds, parallel)

Launch 6 Haiku scouts simultaneously. All scouts are READ-ONLY.

```
Scout 1 - Source framework usage scanner
  model: haiku
  tools: Grep, Glob, Read
  task: Find every file in the codebase that imports, requires, or references the SOURCE
        framework from: $ARGUMENTS
        List each file, the line numbers of the references, and which features of the
        source framework are used in each file.
        Write findings to RECON-source-usage.md.

Scout 2 - File and module inventory
  model: haiku
  tools: Glob, Read
  task: Map the full module structure of the codebase. List every source file with:
        - File path
        - File type and language
        - Approximate line count
        - Whether it uses the source framework (yes/no)
        Write findings to RECON-inventory.md.

Scout 3 - Test inventory
  model: haiku
  tools: Glob, Read, Grep
  task: Find all test files. For each test file, note whether it uses the source framework
        directly (e.g. a test runner being migrated) or tests code that uses the source framework.
        Write findings to RECON-tests.md.

Scout 4 - Configuration scanner
  model: haiku
  tools: Glob, Read
  task: Find all configuration files, build scripts, CI/CD configs, and deployment configs.
        Identify any that reference the source framework and will need updating.
        Write findings to RECON-config.md.

Scout 5 - Dependency scanner
  model: haiku
  tools: Read, Bash
  task: Read the dependency manifest. List all packages that are the source framework,
        plugins for the source framework, or type definitions for the source framework.
        Also list packages for the target framework that are already installed (if any).
        Write findings to RECON-deps.md.

Scout 6 - Pattern and idiom scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find recurring patterns in the source framework usage. Look for the top 5-10
        most common idioms, patterns, or API calls used with the source framework.
        These will need mechanical translation rules in the migration plan.
        Write findings to RECON-patterns.md.
```

Await all scouts. Consolidate into RECON-REPORT.md.

---

## Wave 1: MIGRATION STRATEGY (3 minutes, single agent)

```
Migration Strategist
  model: opus
  tools: Read
  context: Read RECON-REPORT.md and all individual RECON-*.md files
  task: |
    Analyze the reconnaissance and produce MIGRATION-PLAN.md containing:

    1. Migration summary: from X to Y, scope, total files affected
    2. Translation guide: for each source framework pattern found in RECON-patterns.md,
       provide the exact target framework equivalent with code examples
    3. Module grouping: group the affected files into logical migration units
       (e.g. by directory, by feature, by type). Each group becomes one migration unit.
       Target 4-8 migration units for parallelism.
    4. Per-unit migration steps: for each migration unit, list the specific files
       and the exact changes required (not just "update imports", but which imports to what)
    5. Dependency changes: exact packages to remove and exact packages to install,
       with versions
    6. Config changes: exact changes needed in each config file
    7. Test strategy: which tests will break during migration and how to fix them
    8. Migration order: if any units have dependencies on other units completing first,
       list the required sequence. Prefer independent units to maximize parallelism.
    9. Risk areas: any source framework features with no clean target equivalent,
       and the recommended approach for each

    Do not write application code. Do not modify any files.
```

Await strategist. Verify MIGRATION-PLAN.md exists.

---

## Wave 2: ARCHITECTURE REVIEW (2 minutes, single agent)

```
Migration Architect
  model: opus
  tools: Read, Grep
  context: Read MIGRATION-PLAN.md, read all RECON-*.md files,
           read a sample of source files from each migration unit
  task: |
    Review the migration plan and validate it is complete and correct.

    Verify:
    - The translation guide covers all patterns found in RECON-patterns.md
    - Each migration unit's file list matches RECON-source-usage.md
    - The dependency changes are complete and correct for the target framework
    - The migration order is valid (no circular dependencies)
    - No patterns are missing a target equivalent without an explanation

    Produce ARCH-MIGRATION.md containing:
    1. Validation result: APPROVED or NEEDS REVISION
    2. If NEEDS REVISION: specific gaps or errors in the migration plan
    3. Approved translation guide (copy from or reference MIGRATION-PLAN.md)
    4. Final migration unit list with file assignments
    5. Any additional architectural concerns for builders to watch for
    6. Rollback strategy: how to revert if migration fails

    Do not write application code.
```

Await architect. If ARCH-MIGRATION.md contains NEEDS REVISION, re-run the strategist with
the architect's feedback before proceeding. Otherwise continue.

---

## Wave 3: TRANSFORM (5 minutes, parallel per migration unit)

Launch one Sonnet transformer per migration unit, batched at 10 max concurrent.

For each migration unit {n} defined in ARCH-MIGRATION.md:

```
Transformer-{n}
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read ARCH-MIGRATION.md (translation guide and this unit's file list),
           read MIGRATION-PLAN.md (per-unit steps for unit {n}),
           read all source files in migration unit {n}
  task: |
    Transform all files in migration unit {n} from the source to the target framework.

    For each file in the unit:
    1. Replace all source framework imports with target framework equivalents
       (use exact translations from the translation guide in ARCH-MIGRATION.md)
    2. Replace all source framework API calls with target equivalents
    3. Update middleware, hooks, or lifecycle methods to match target conventions
    4. Preserve all business logic exactly, only change framework-specific code
    5. Update inline comments that reference the source framework
    6. Do not add new features or refactor beyond the migration scope

    If you encounter a pattern not covered in the translation guide:
    - Look for a reasonable equivalent in the target framework
    - Write a note to MIGRATION-GAP-{n}.md describing the pattern and your solution
    - Continue transforming; do not stop

    When complete, write COMPLETE-TRANSFORM-{n}.lock with:
    - List of files modified
    - Count of import replacements
    - Count of API call replacements
    - Any gaps logged to MIGRATION-GAP-{n}.md
```

Batch if unit count exceeds 10. Await all transformers before proceeding.

---

## Wave 4: DEPENDENCY AND CONFIG UPDATE (2 minutes, parallel)

```
Dependency Updater
  model: sonnet
  tools: Read, Edit, Bash
  context: Read MIGRATION-PLAN.md (dependency changes section),
           read current dependency manifest
  task: |
    Update the project dependencies per MIGRATION-PLAN.md.

    1. Remove all source framework packages from the dependency manifest
    2. Add all target framework packages at the versions specified in the plan
    3. Run the package manager install command to update the lockfile
    4. Verify the install completes without errors
    5. Write COMPLETE-DEPS.lock with the list of packages added and removed

Config Updater
  model: sonnet
  tools: Read, Edit, Glob
  context: Read MIGRATION-PLAN.md (config changes section), read RECON-config.md,
           read all config files listed in RECON-config.md
  task: |
    Update all configuration files per MIGRATION-PLAN.md.

    Update each config file, build script, and CI/CD config that references the source framework.
    Preserve all non-framework-specific configuration exactly.
    Write COMPLETE-CONFIG.lock with the list of files modified and changes made.
```

Await both updaters before proceeding.

---

## Wave 5: VERIFY (3 minutes, parallel)

Launch 3 Sonnet verifiers in parallel.

```
Build Verifier
  model: sonnet
  tools: Read, Bash
  task: |
    Attempt to build or type-check the migrated codebase.
    Run: the project's build command, type check command, or linter.
    Capture all output. Write VERIFY-build.md with:
    - Command run
    - Exit code
    - Full output
    - List of any remaining source framework references causing errors
    - List of any target framework errors indicating incorrect translation

Import Completeness Verifier
  model: sonnet
  tools: Grep, Glob, Read
  context: Read RECON-source-usage.md (original list of all source framework references),
           read all COMPLETE-TRANSFORM-*.lock files
  task: |
    Check that ALL source framework references have been replaced.

    Scan the entire codebase for any remaining imports, requires, or references to the
    source framework. Compare against RECON-source-usage.md.

    Write VERIFY-completeness.md with:
    - Total original references found in recon
    - Total references remaining after migration
    - List of any remaining references with file and line number
    - Assessment: COMPLETE (zero remaining), PARTIAL (some remaining), or FAILED

Test Verifier
  model: sonnet
  tools: Read, Bash, Glob
  context: Read RECON-tests.md, read migrated test files
  task: |
    Run the full test suite on the migrated codebase.
    Capture all output. Write VERIFY-tests.md with:
    - Total tests run
    - Tests passed
    - Tests failed
    - For each failure: test name, error message, and whether the failure is
      migration-related (framework API change) or a regression in business logic
```

Await all verifiers. If VERIFY-completeness.md shows PARTIAL or FAILED, or if
VERIFY-build.md shows errors from remaining source framework references, launch
a cleanup pass before the review phase:

```
Cleanup Agent (conditional, only if verification found remaining references)
  model: sonnet
  tools: Read, Edit, Grep, Glob
  context: Read VERIFY-completeness.md and VERIFY-build.md,
           read ARCH-MIGRATION.md (translation guide)
  task: |
    Fix all remaining source framework references identified in the verification phase.
    Use the translation guide in ARCH-MIGRATION.md for all replacements.
    Write CLEANUP-COMPLETE.lock with list of files fixed.
```

---

## Wave 6: REVIEW AND CLOSE (2 minutes, single agent)

```
Migration Reviewer
  model: opus
  tools: Read
  context: Read MIGRATION-PLAN.md, ARCH-MIGRATION.md, RECON-REPORT.md,
           all VERIFY-*.md files, all MIGRATION-GAP-*.md files,
           all COMPLETE-TRANSFORM-*.lock files, COMPLETE-DEPS.lock, COMPLETE-CONFIG.lock
  task: |
    Review the completed migration and produce BATTLE-MAP.md containing:

    1. Migration summary: from X to Y, files transformed, packages updated
    2. Completeness: COMPLETE or PARTIAL (with what remains)
    3. Build status: passing or failing, with error summary if failing
    4. Test status: pass count, fail count, regression count
    5. Translation gaps: list from all MIGRATION-GAP-*.md files with assessment
       of whether the solutions are acceptable
    6. Risk items: any areas requiring manual review or testing in a real environment
    7. Rollback instructions: reference ARCH-MIGRATION.md rollback strategy
    8. Migration verdict: COMPLETE, COMPLETE WITH CAVEATS, or INCOMPLETE
    9. Required follow-up actions before the migration is production-ready

    Do not modify any source files.
```

---

## Operation Complete

BATTLE-MAP.md is the final deliverable. Check VERIFY-*.md files for any remaining issues before marking the migration production-ready.

Wave timing summary:
- Wave 0 RECON:                     ~0:45
- Wave 1 MIGRATION STRATEGY:        ~3:00
- Wave 2 ARCHITECTURE REVIEW:       ~2:00
- Wave 3 TRANSFORM:                 ~5:00
- Wave 4 DEPENDENCY + CONFIG:       ~2:00
- Wave 5 VERIFY:                    ~3:00
- Wave 6 REVIEW AND CLOSE:          ~2:00
- Total:                            ~17:45

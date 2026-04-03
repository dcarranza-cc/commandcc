# Test Blitz

Write comprehensive tests for the entire codebase in parallel. Identifies untested modules, designs a test strategy per module, writes tests in parallel, runs everything, and checks coverage and quality.

**Usage:** `/test-blitz [scope: full | unit | integration | path/to/directory]`

**Pattern:** 5-phase test blitz
**Estimated time:** ~18 minutes for a medium codebase
**Agent count:** 4-16 agents across phases

**Scope:** $ARGUMENTS (default: full codebase)

---

## Operation: COVERAGE

Execute a comprehensive test-writing operation. The goal is meaningful coverage, not metric coverage. Tests must verify real behavior, not just call functions.

---

## Wave 0: RECON (30 seconds, parallel)

Launch 4 Haiku scouts simultaneously. All scouts are READ-ONLY.

```
Scout 1 - Module inventory
  model: haiku
  tools: Glob, Read
  task: List every source file in scope. For each file, record:
        - File path
        - File type (module, utility, handler, model, service, etc)
        - Approximate function/method count
        Write findings to RECON-modules.md.

Scout 2 - Existing test scanner
  model: haiku
  tools: Glob, Read, Grep
  task: Find all existing test files. For each test file, record:
        - Test file path and which source file it tests
        - Test framework and assertion library in use
        - Number of test cases
        - Test naming conventions used
        Also identify source files with zero existing tests.
        Write findings to RECON-tests.md.

Scout 3 - Testing infrastructure scanner
  model: haiku
  tools: Read, Glob
  task: Find the test runner configuration (jest.config, pytest.ini, .mocharc, etc).
        Find any test helpers, fixtures, factories, or mocks already in the codebase.
        Find CI configuration to understand how tests are run in the pipeline.
        Write findings to RECON-infra.md.

Scout 4 - Complexity scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find the most complex functions and modules: those with the most conditionals,
        loops, or external dependencies. Identify any functions with known edge cases
        (null handling, empty collections, type coercion, async error paths).
        Write findings to RECON-complexity.md.
```

Await all scouts. Consolidate into RECON-REPORT.md.

---

## Wave 1: STRATEGY (2 minutes, single agent)

```
Test Strategist
  model: opus
  tools: Read
  context: Read RECON-REPORT.md and all individual RECON-*.md files
  task: |
    Analyze the recon and produce TEST-STRATEGY.md containing:

    1. Coverage gap analysis: list all source files with zero or insufficient tests,
       ranked by complexity (most complex untested code first)
    2. Module groupings: group source files into test batches.
       Each batch should be independently testable (no shared write state).
       Target 4-8 batches for parallelism.
    3. Per-batch test plan:
       - Files to be tested
       - Test types required: unit, integration, or both
       - Key behaviors to cover (not just "test all functions" but "test that X returns Y
         when Z is empty, test that auth middleware rejects expired tokens", etc)
       - Mocking strategy: what external dependencies need mocking
       - Priority: CRITICAL, HIGH, MEDIUM, LOW based on code importance and complexity
    4. Testing conventions to follow: naming pattern, directory placement,
       assertion style based on RECON-infra.md
    5. Do-not-test list: generated code, vendored code, or trivial getters/setters
       that do not warrant test coverage
    6. Coverage targets: recommended minimum coverage percentage per module type

    Do not write any test code. Strategy only.
```

Await strategist. Verify TEST-STRATEGY.md exists before proceeding.

---

## Wave 2: WRITE TESTS (5 minutes, parallel per batch)

Launch one Sonnet tester per batch, batched at 10 max concurrent.

For each batch {n} from TEST-STRATEGY.md:

```
Tester-{n}
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read TEST-STRATEGY.md batch {n} plan, read all source files in batch {n},
           read RECON-infra.md (test conventions and existing helpers)
  task: |
    Write comprehensive tests for all files in batch {n}.

    Follow the test plan in TEST-STRATEGY.md exactly:
    - Cover every key behavior listed in the plan
    - Use the naming conventions and assertion style from RECON-infra.md
    - Place test files in the correct directory per project conventions
    - Use existing test helpers, fixtures, and factories where available
    - Mock external dependencies as specified in the mocking strategy

    Quality requirements:
    - Each test must have a clear, descriptive name that states what behavior is verified
    - Each test must have exactly one logical assertion (multiple expect() calls for one
      behavior is fine, but do not test multiple behaviors in one test)
    - Test edge cases: empty inputs, null values, maximum values, error conditions
    - Do not write tests that only verify the function was called (test outcomes, not calls)
    - Do not write tests that duplicate existing passing tests

    After writing all tests, run them and fix any test infrastructure issues
    (wrong import paths, missing mocks, etc). Do not fix bugs in source code,
    only fix test setup issues.

    Write COMPLETE-TESTS-{n}.lock containing:
    - List of test files written
    - Total test cases written
    - Test run result: passed/failed/errored counts
    - Any source file bugs discovered (do not fix, just report)
```

Batch if batch count exceeds 10. Await all testers before proceeding.

---

## Wave 3: RUN AND QUALITY CHECK (3 minutes, parallel)

```
Full Suite Runner
  model: sonnet
  tools: Read, Bash
  task: |
    Run the complete test suite (all existing tests plus all newly written tests).
    Capture the full output including coverage report if the test runner supports it.
    Write TEST-RUN-RESULTS.md containing:
    - Total tests: passing, failing, skipped
    - Coverage summary by module (if available)
    - Any test failures with full error messages
    - Any test environment issues (missing dependencies, wrong env vars, etc)

Test Quality Reviewer
  model: sonnet
  tools: Read, Glob, Grep
  context: Read TEST-STRATEGY.md, read all newly written test files,
           read all COMPLETE-TESTS-*.lock files
  task: |
    Review the quality of the newly written tests.

    Check a sample of tests from each batch and assess:
    - Are tests testing behavior or just calling functions?
    - Are edge cases actually covered or just the happy path?
    - Are mocks realistic or trivially returning null?
    - Are test names descriptive enough to diagnose a failure without reading the code?
    - Are there any duplicate tests across batches?
    - Are tests in the correct directory and following naming conventions?

    Write TEST-QUALITY-REVIEW.md containing:
    - Overall quality rating: EXCELLENT, GOOD, ADEQUATE, or POOR
    - Specific examples of good tests (2-3)
    - Specific examples of weak tests that should be improved (list with file and line)
    - Gaps: any behaviors from TEST-STRATEGY.md that were not actually covered
    - Bug reports from all COMPLETE-TESTS-*.lock files (bugs found in source, not tests)
```

Await both before proceeding.

---

## Wave 4: REVIEW AND CLOSE (2 minutes, single agent)

```
Test Blitz Reviewer
  model: opus
  tools: Read
  context: Read TEST-STRATEGY.md, TEST-RUN-RESULTS.md, TEST-QUALITY-REVIEW.md,
           all COMPLETE-TESTS-*.lock files, RECON-tests.md
  task: |
    Review the test blitz results and produce BATTLE-MAP.md containing:

    1. Coverage before and after: untested files at start vs untested files now
    2. Total tests written (new) and total tests passing (all)
    3. Test run summary: passing, failing, skipped
    4. Quality assessment summary from TEST-QUALITY-REVIEW.md
    5. Bugs discovered in source code during testing: list with file and severity
    6. Weak tests requiring improvement: list from quality review
    7. Coverage gaps remaining: source files still below target coverage
    8. Recommended follow-up actions:
       - Bugs to fix (with severity)
       - Tests to strengthen
       - Remaining coverage gaps to address
    9. Overall verdict: COMPREHENSIVE, ADEQUATE, or INSUFFICIENT

    Do not modify any source files or test files.
```

---

## Operation Complete

BATTLE-MAP.md is the final deliverable. Any bugs found in source code during testing are listed with severity, they were not fixed by this operation.

Wave timing summary:
- Wave 0 RECON:         ~0:30
- Wave 1 STRATEGY:      ~2:00
- Wave 2 WRITE TESTS:   ~5:00
- Wave 3 RUN + CHECK:   ~3:00
- Wave 4 REVIEW CLOSE:  ~2:00
- Total:                ~12:30

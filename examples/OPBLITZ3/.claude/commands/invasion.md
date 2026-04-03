# INVASION

Deploys a full 4-phase operation against empire1.io. Launches 16+ agents across architecture, build, test, and review phases. Produces BATTLE-MAP.md on completion.

**Installation:** Copy this file to `.claude/commands/invasion.md` in your project root.

Arguments (optional): $ARGUMENTS
If no arguments are provided, uses the default OPBLITZ3 objectives below.

---

## Objectives

$ARGUMENTS

If $ARGUMENTS is empty, use these default objectives:

1. Moltbook engine: structured notebook system with typed pages (note, outline, reference, log), full-text search, and REST API
2. Hybrid content: document model combining rich-text blocks and structured data fields in a single entity, with a schema registry per document type
3. Lifecycle management: state machine for content items (DRAFT -> REVIEW -> PUBLISHED -> ARCHIVED), with transition validation, event history, and lifecycle hooks
4. LLM integration: AI service layer with summarize, expand, rephrase, and tag operations, provider-agnostic design, and async job queue

---

## Setup

Create the operation workspace:

- Create directory: `.operation/`
- Write `.operation/OBJECTIVES.md` with the objectives listed above (or from $ARGUMENTS)
- Write `.operation/progress.md` with this content:

```
# OPERATION PROGRESS

Phase 0: RECON         [ PENDING ]
Phase 1: STRATEGY      [ PENDING ]
Phase 2: DECOMPOSE     [ PENDING ]
Phase 3: ARCHITECTURE  [ PENDING ]
Phase 4: BUILD         [ PENDING ]
Phase 5: WIRE          [ PENDING ]
Phase 6: TEST          [ PENDING ]
Phase 7: REVIEW        [ PENDING ]
Phase 8: INTEGRATION   [ PENDING ]
```

---

## Phase 0: Recon

Launch the following agents IN PARALLEL. Do not proceed until all four are complete.

- Use `scout/codebase-scout` to map the directory structure, key files, and module boundaries. Output: `.operation/RECON-CODEBASE.md`
- Use `scout/dependency-scout` to map all dependencies, versions, and any known conflicts. Output: `.operation/RECON-DEPS.md`
- Use `scout/test-scout` to map existing test coverage, test runner configuration, and test patterns in use. Output: `.operation/RECON-TESTS.md`
- Use `scout/security-scout` to perform an initial security scan: auth surface, exposed endpoints, input validation, secrets in code. Output: `.operation/RECON-SECURITY.md`

After all scouts complete:
- Consolidate the four outputs into `.operation/RECON-REPORT.md`
- Update progress.md: Phase 0 COMPLETE

---

## Phase 1: Strategy

Launch ONE agent:

- Use `command/strategist` with the following context:
  - Read `.operation/RECON-REPORT.md`
  - Read `.operation/OBJECTIVES.md`
  - Produce `.operation/OPERATION-PLAN.md`

Await completion. Update progress.md: Phase 1 COMPLETE.

---

## Phase 2: Decompose

Launch ONE agent:

- Use `command/decomposer` with the following context:
  - Read `.operation/OPERATION-PLAN.md`
  - Read `.operation/RECON-REPORT.md` for codebase context
  - Produce `.operation/DECOMPOSITION.md`

Await completion. Update progress.md: Phase 2 COMPLETE.

Read `.operation/DECOMPOSITION.md` and note the total number of sub-objectives produced. You will need this count for Phase 4 batching.

---

## Phase 3: Architecture

Read `.operation/DECOMPOSITION.md`. Launch one architect agent per ORIGINAL objective (not per sub-objective). Each architect handles all sub-objectives for its objective.

Launch all four IN PARALLEL:

- Use `architect/system-architect` for OBJ-1 (Moltbook). Context: DECOMPOSITION.md OBJ-1 section, RECON-REPORT.md. Output: `.operation/ARCH-1.md`
- Use `architect/api-architect` for OBJ-2 (Hybrid Content). Context: DECOMPOSITION.md OBJ-2 section, RECON-REPORT.md. Output: `.operation/ARCH-2.md`
- Use `architect/data-architect` for OBJ-3 (Lifecycle). Context: DECOMPOSITION.md OBJ-3 section, RECON-REPORT.md. Output: `.operation/ARCH-3.md`
- Use `architect/system-architect` for OBJ-4 (LLM Integration). Context: DECOMPOSITION.md OBJ-4 section, RECON-REPORT.md. Output: `.operation/ARCH-4.md`

Await all four. Update progress.md: Phase 3 COMPLETE.

---

## Phase 4: Build

Check `.operation/` for any existing `COMPLETE-BUILD-{n}.lock` files. Skip any sub-objective with an existing lock file.

For each sub-objective in DECOMPOSITION.md without a lock file, assign a builder based on the owner type field:

- `database-builder` owner type: use `builder/database-builder`
- `backend-builder` owner type: use `builder/backend-builder`
- `api-builder` owner type: use `builder/api-builder`
- `frontend-builder` owner type: use `builder/frontend-builder`

Each builder receives:
- Its sub-objective entry from DECOMPOSITION.md (scope, inputs, outputs)
- The corresponding ARCH-{n}.md for its parent objective
- Instruction to write `.operation/COMPLETE-BUILD-{sub-id}.lock` on completion

If more than 10 sub-objectives lack lock files, batch in groups of 10:
- Batch 1: sub-objectives 1-10, IN PARALLEL, await all
- Batch 2: sub-objectives 11+, IN PARALLEL, await all

After all builds complete, update progress.md: Phase 4 COMPLETE.

---

## Phase 5: Wire

Launch the following agents IN PARALLEL. Await all before proceeding.

- Use `wirer/import-wirer`. Context: scan all files created or modified in Phase 4 and resolve import paths. Fix broken or missing imports only, do not modify logic.
- Use `wirer/config-wirer`. Context: merge new configuration keys from Phase 4 into project config files (settings.py, .env.example). Add new keys only, do not change existing values.
- Use `wirer/startup-wirer`. Context: register all new services, routes, and startup hooks in the application entry file (empire1d.py). Import and call `register_routes(app)` and `register_services(app)` from each new module.

After all wirers complete, verify syntax on all modified Python files and report any errors.

Update progress.md: Phase 5 COMPLETE.

---

## Phase 6: Test

Launch the following agents IN PARALLEL. Await all before proceeding.

- Use `tester/unit-tester` for OBJ-1. Context: ARCH-1.md, Moltbook built files. Output: `tests/test_moltbook.py`
- Use `tester/unit-tester` for OBJ-2. Context: ARCH-2.md, hybrid content built files. Output: `tests/test_hybrid_content.py`
- Use `tester/unit-tester` for OBJ-3. Context: ARCH-3.md, lifecycle built files. Output: `tests/test_lifecycle.py`
- Use `tester/unit-tester` for OBJ-4. Context: ARCH-4.md, LLM integration built files. Output: `tests/test_llm_integration.py`
- Use `tester/integration-tester`. Context: all ARCH-*.md files. Focus on cross-objective integration points. Output: `tests/test_integration.py`
- Use `tester/security-tester`. Context: RECON-SECURITY.md, all new API endpoints. Output: `tests/test_security.py`

After all testers complete:
- Run the full test suite
- Write results to `.operation/TEST-RESULTS.md` (total, passing, failing counts)

Update progress.md: Phase 6 COMPLETE.

---

## Phase 7: Review

Launch the following agents IN PARALLEL. Await all before proceeding.

- Use `reviewer/code-reviewer` for OBJ-1 and OBJ-2. Context: ARCH-1.md, ARCH-2.md, related built files, TEST-RESULTS.md. Output: `.operation/REVIEW-1.md`
- Use `reviewer/code-reviewer` for OBJ-3 and OBJ-4. Context: ARCH-3.md, ARCH-4.md, related built files, TEST-RESULTS.md. Output: `.operation/REVIEW-2.md`
- Use `reviewer/security-reviewer`. Context: RECON-SECURITY.md, all new built files, security test results. Output: `.operation/REVIEW-SECURITY.md`
- Use `reviewer/architecture-reviewer`. Context: all ARCH-*.md, DECOMPOSITION.md, all new built files. Output: `.operation/REVIEW-ARCH.md`

After all reviewers complete, update progress.md: Phase 7 COMPLETE.

---

## Phase 8: Integration

Launch ONE agent:

- Use `command/integrator` with all review and test artifacts as context:
  - `.operation/OPERATION-PLAN.md`
  - `.operation/DECOMPOSITION.md`
  - `.operation/TEST-RESULTS.md`
  - `.operation/REVIEW-1.md`
  - `.operation/REVIEW-2.md`
  - `.operation/REVIEW-SECURITY.md`
  - `.operation/REVIEW-ARCH.md`
  - Output: `BATTLE-MAP.md` at the project root

Await completion. Update progress.md: Phase 8 COMPLETE.

---

## Completion

Print:

```
============================================================
  OPERATION COMPLETE
  Read BATTLE-MAP.md for the full record.
============================================================
```

Then print the Operation Summary section from BATTLE-MAP.md.

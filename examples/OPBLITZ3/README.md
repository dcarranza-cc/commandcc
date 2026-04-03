# OPBLITZ3: The First Operation

OPBLITZ3 is the canonical proof-of-concept for CommandCC. It is the operation that validated the doctrine, surfaced the need for the Decomposer, and produced the benchmark that defines what the system can do.

**Result:** 16 agents. 4 features. 131 tests. 13 minutes.

---

## Context

AXL Protocol runs empire1.io, a platform built on a Python FastAPI backend with a PostgreSQL database and a React frontend. In early development, four features were needed before a demo deadline:

1. A Moltbook engine for structured note-taking and knowledge management
2. Hybrid content support for rich-text and structured data in a single document model
3. Lifecycle management for content items (draft, review, published, archived states)
4. LLM integration for AI-powered content generation and summarization

All four had to ship together. They shared a data layer. They touched the same FastAPI router. They were interconnected, but each was substantial enough to be a multi-hour solo engineering task.

Total estimated sequential development time: 8-12 hours. The operation completed in 13 minutes.

---

## The 4 Objectives

### OBJ-1: Moltbook Engine

A structured notebook system for empire1.io. Users create Moltbooks, which are collections of typed pages (note, outline, reference, log). Each page has a schema enforcing its type. The engine stores pages, supports full-text search across pages, and exposes a REST API.

**Sub-objectives after Decomposer:**
- SUB-1.1: Data models and Alembic migration (database-builder)
- SUB-1.2: CRUD API endpoints and page type schemas (api-builder)
- SUB-1.3: Full-text search service (backend-builder)

### OBJ-2: Hybrid Content

A document model that holds both rich-text blocks (like Notion) and structured data fields (like Airtable) in a single entity. The hybrid content record has a `blocks` array and a `fields` dict, with a defined schema per document type.

**Sub-objectives after Decomposer:**
- SUB-2.1: HybridContent model, schema registry, and migration (database-builder)
- SUB-2.2: Block and field validation service (backend-builder)
- SUB-2.3: HybridContent REST API with type-specific endpoints (api-builder)

### OBJ-3: Lifecycle Management

A state machine for content items. Items transition through states: `DRAFT -> REVIEW -> PUBLISHED -> ARCHIVED`. Each transition has a set of required conditions (e.g., a review approval is required to move from REVIEW to PUBLISHED). The system tracks transition history and exposes lifecycle events for downstream consumers.

**Sub-objectives after Decomposer:**
- SUB-3.1: State machine implementation and transition validation (backend-builder)
- SUB-3.2: Lifecycle event store and history API (backend-builder)
- SUB-3.3: Lifecycle hooks for integration with Moltbook and HybridContent (wirer, deferred to wire phase)

### OBJ-4: LLM Integration

An AI service layer that connects to an LLM provider and provides: summarize, expand, rephrase, and tag operations on any content item. The service is provider-agnostic (configured via env var) and supports async job queuing for long operations.

**Sub-objectives after Decomposer:**
- SUB-4.1: LLM provider abstraction and client (backend-builder)
- SUB-4.2: Job queue and async operation management (backend-builder)
- SUB-4.3: LLM API endpoints and request models (api-builder)

---

## Agent Organization: 4 Phases, 16 Agents

The operation ran in 4 phases with a simplified octopus pattern (recon was done manually before the operation, reducing it to 4 execution phases).

### Phase 1: Architecture (4 agents, parallel)

| Agent | Sub-objectives | Output |
|-------|---------------|--------|
| architect-alpha | SUB-1.1, SUB-1.2, SUB-1.3 | ARCH-1.md |
| architect-bravo | SUB-2.1, SUB-2.2, SUB-2.3 | ARCH-2.md |
| architect-charlie | SUB-3.1, SUB-3.2 | ARCH-3.md |
| architect-delta | SUB-4.1, SUB-4.2, SUB-4.3 | ARCH-4.md |

Duration: 3 minutes 12 seconds

### Phase 2: Build (4 agents, parallel)

| Agent | Sub-objectives | Files Created |
|-------|---------------|---------------|
| builder-alpha | SUB-1.1, SUB-1.2, SUB-1.3 | 8 files (models, migrations, routes, search service) |
| builder-bravo | SUB-2.1, SUB-2.2, SUB-2.3 | 7 files (hybrid model, schema registry, validation, routes) |
| builder-charlie | SUB-3.1, SUB-3.2 | 6 files (state machine, event store, history routes) |
| builder-delta | SUB-4.1, SUB-4.2, SUB-4.3 | 9 files (provider client, job queue, LLM routes, request models) |

Duration: 4 minutes 47 seconds

### Phase 3: Wire + Test (8 agents, parallel)

| Agent | Task |
|-------|------|
| wirer-imports | Resolved all import paths across 30 files |
| wirer-config | Merged provider configuration into settings.py |
| tester-alpha | Unit tests for Moltbook engine (34 tests) |
| tester-bravo | Unit tests for hybrid content (28 tests) |
| tester-charlie | Unit tests for lifecycle management (22 tests) |
| tester-delta | Unit tests for LLM integration (25 tests) |
| integration-tester | End-to-end API tests (22 tests) |
| security-tester | Auth and input validation tests (0 findings, 0 additional tests needed) |

Duration: 3 minutes 58 seconds

### Phase 4: Review + Integration (4 agents, then 1)

| Agent | Task |
|-------|------|
| reviewer-alpha | Code review: Moltbook + hybrid content |
| reviewer-bravo | Code review: lifecycle + LLM |
| security-reviewer | Full security posture review |
| architecture-reviewer | Conformance check against ARCH-*.md |
| integrator | BATTLE-MAP.md |

Duration: 1 minute 3 seconds (reviewers in parallel) + 12 seconds (integrator)

---

## Timeline

```
T+00:00   Operation start. Strategist invoked.
T+00:45   OPERATION-PLAN.md produced.
T+01:20   Decomposer invoked.
T+02:10   DECOMPOSITION.md produced. 4 objectives -> 11 sub-objectives.
T+02:15   Phase 1 launched. 4 architects in parallel.
T+05:27   Phase 1 complete. ARCH-1.md through ARCH-4.md written.
T+05:30   Phase 2 launched. 4 builders in parallel.
T+10:17   Phase 2 complete. 30 files written across 4 tracks.
T+10:20   Phase 3 launched. 2 wirers + 6 testers in parallel.
T+14:18   Phase 3 complete. 131 tests written, 131 passing.
T+14:20   Phase 4 launched. 4 reviewers in parallel.
T+15:23   Review complete. 4 REVIEW-*.md files written.
T+15:24   Integrator invoked.
T+15:36   BATTLE-MAP.md written.
T+15:36   OPERATION COMPLETE.

Wall clock: 15 minutes 36 seconds
```

*Note: the 13-minute figure in the README refers to the build and test phases (T+02:10 to T+15:36 minus setup overhead). The full wall clock including initial strategy was 15:36. Both numbers are accurate for different definitions of "operation time."*

---

## Results

| Metric | Value |
|---|---|
| Total agents deployed | 16 (+ 2 wirer agents in Phase 3 = 18 total) |
| Files created or modified | ~45 |
| Lines of code written | ~3,200 |
| Tests written | 131 |
| Tests passing | 131 |
| Tests failing | 0 |
| Critical review findings | 0 |
| High review findings | 1 (resolved before battle map) |
| Operation status | CLEAN |

The one HIGH finding from the security reviewer: the LLM API endpoints accepted user-controlled `provider` parameters that could be used to exfiltrate the provider API key via SSRF. The architecture-reviewer flagged the same issue independently. The integrator noted both findings and marked the resolution as complete (builder-delta had already locked the provider to env-var-only before the review ran).

---

## Lessons Learned: The empire1d.py Conflict

The most instructive problem in OPBLITZ3 was not a test failure. It was a conflict in `empire1d.py`, the main application startup file.

Builder-alpha (Moltbook), builder-bravo (hybrid content), and builder-charlie (lifecycle) all needed to register their routers in `empire1d.py`. All three were running in parallel. All three wrote their router registration lines to `empire1d.py` at roughly the same time.

The result: the file had three conflicting versions, two of them with partial writes.

**Resolution:** The wirer-imports agent was able to reconstruct the correct file by reading all three builder outputs and merging the registration calls. The operation completed successfully. But the conflict made clear that parallel builds cannot touch shared files.

**The Decomposer concept emerged from this.** Before OPBLITZ3, the plan was to have builders work from the original objectives. After OPBLITZ3, the Decomposer was added as a mandatory pre-build phase to explicitly assign each shared file (like `empire1d.py`) to exactly one agent or to the wirer, before any builders run.

In the current CommandCC architecture, `empire1d.py` is in the wirer's AOR, not any builder's. Builders stub out their registration calls in a `register_routes(app)` function. The startup-wirer imports all of them. The parallel conflict cannot happen.

This lesson is now encoded in doctrine. See [doctrine/coordination.md](../../doctrine/README.md) for the full file ownership model.

---

## Re-Running OPBLITZ3

The operation trigger command is in [.claude/commands/invasion.md](.claude/commands/invasion.md). To re-run it against a fresh empire1.io checkout:

```bash
cd path/to/empire1.io
mkdir -p .claude/commands .claude/agents
cp -r /path/to/commandcc/agents/* .claude/agents/
cp /path/to/commandcc/examples/OPBLITZ3/.claude/commands/invasion.md .claude/commands/

claude
/invasion
```

The operation will adapt to whatever state the codebase is in. If the features already exist, the scouts will report them and the strategist will scope the objectives accordingly.

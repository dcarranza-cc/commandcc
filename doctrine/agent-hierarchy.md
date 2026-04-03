# Agent Hierarchy

## The Three-Tier Model

CommandCC organizes all agents into three tiers. Tier determines model selection, permissions, role, cost profile, and count. Every agent in every operation belongs to exactly one tier.

```
TIER 1: COMMAND (Opus)
  Think. Strategize. Decompose. Design. Review. Integrate.
  READ-ONLY on codebase. Writes plans, orders, reports.
  High cost. Use sparingly. 2-3 at command level.

TIER 2: OPERATIONS (Sonnet)
  Build. Wire. Implement. Test. Execute.
  FULL permissions. Deep focus on one task.
  Medium cost. The workhorse. 4-16 per operation.

TIER 3: RECONNAISSANCE (Haiku)
  Scan. Check. Report. Fast answers.
  READ-ONLY plus diagnostics. Minimal context.
  Cheap. Use liberally. 8-16 per operation.
```

---

## Tier 1: Command (Opus)

### Who They Are

Tier 1 agents run on Opus-tier models. They are the strategic and design intelligence of the operation. Every word they produce becomes a directive or a design that lower tiers execute.

Tier 1 includes:
- Strategist
- Decomposer
- Integrator
- All Architects
- All Reviewers

### What They Do

Tier 1 agents think. They do not build. This distinction is enforced, not aspirational.

A Tier 1 agent that writes code is doing two jobs: thinking and building. When an agent does two jobs, it does both worse. The architect who also implements becomes an architect who makes compromises based on what is easy to implement rather than what is the right design. The strategist who also builds loses strategic perspective by getting absorbed in implementation details.

Tier 1 agents read the codebase to understand it. They write plans, design documents, orders, and reports. Their output is always a document. Never a code change.

### Permissions

- Read: all files
- Write: plan files, design files, order files, report files only
- Edit source code: never
- Run tests: never
- Run builds: never

### Cost Profile

Opus-tier models are the most expensive per token. The discipline of using Tier 1 agents sparingly is a cost discipline as much as a design discipline. Two to three Tier 1 agents at the command level (strategist, decomposer, integrator) plus one Tier 1 architect per sub-objective is the standard allocation.

Do not run Tier 1 agents for tasks that Tier 2 can handle. Tier 1 is for decisions and designs, not implementation.

---

## THE DECOMPOSER: The Multiplication Layer

The Decomposer is the most important agent in any large-scale CommandCC operation. It is the reason the system scales.

### The Problem It Solves

Without a Decomposer, the human operator must manually define the granularity of every work stream. The operator must answer: how many parallel agents, what exactly does each one do, and what are the boundaries between their work domains?

For a simple 4-objective operation, a skilled operator can do this in their head. For a 16-objective operation with interdependencies, the manual decomposition takes longer than the operation itself. This is the bottleneck that kills scaling.

The Decomposer solves this by owning the granularity decision. The operator defines objectives. The Decomposer defines sub-objectives.

### How It Works

The Decomposer receives the strategist's operation plan. It reads the objectives, understands the codebase structure (from scout INTREPs), and produces a decomposition document that specifies:

1. How many sub-objectives each objective produces
2. What each sub-objective covers
3. Which files each sub-objective touches
4. Which sub-objectives have dependencies on each other
5. Which sub-objectives can run in parallel

The Decomposer's output is the input for every Architect. Each Architect receives exactly one sub-objective assignment.

### The Math

```
Without Decomposer:
  Human defines 4 objectives manually
  Human assigns 4 agents
  4 agents working in parallel

With Decomposer:
  Human defines 4 objectives (same input)
  Decomposer produces 4 sub-objectives per objective = 16 sub-objectives
  16 architects design 16 work streams in parallel
  16 builders implement in parallel
  16 testers verify in parallel
  = 48 agents from the same 4-sentence human input
```

The Decomposer is the multiplication layer. It converts human intent into agent fuel.

### Scaling the Math

```
1 sentence from human
  -> 1 strategist produces 4 objectives
  -> 1 decomposer produces 4 sub-objectives per objective = 16 sub-objectives
  -> 16 architects (Tier 1, parallel)
  -> 16 builders + 16 testers (Tier 2, parallel)
  -> 4 scouts verify (Tier 3, parallel)
  -> 1 integrator assembles
  = 54 agents from 1 human sentence

At maximum scale:
  4 objectives x 4 subs each x 4 agents per sub = 64 Tier 2 agents
  Plus 16 architects, 4 scouts, command staff
  = ~86 agents from ~4 sentences
```

OPBLITZ3 used 16 agents and 4 waves. The Decomposer was not deployed in OPBLITZ3 because the objectives were already well-defined by the operator. At larger scale, the Decomposer is not optional. It is the mechanism that makes 64-agent operations tractable.

### Critical Decomposer Rule: File Domain Isolation

The most important output of the Decomposer is not the sub-objective list. It is the **file domain assignment**.

Each sub-objective must be assigned a non-overlapping set of files to touch. Two builders working in parallel may never be assigned to the same file. The Decomposer enforces this at planning time.

When the codebase structure makes clean separation impossible (shared utilities, common interfaces), the Decomposer identifies these coupling points and assigns them to a single sub-objective. The wirer then handles the integration point after all builders complete.

The OPBLITZ3 lesson: two builders editing the same file (empire1d.py) caused a conflict in an early planning draft. The Decomposer's redesign assigned the coupled changes to a single sub-objective. The conflict disappeared. Both builders ran cleanly in parallel without conflict.

### The Decomposer Decomposed

The Decomposer itself can be run in multiple passes for very large operations:

- Pass 1: High-level decomposition (objectives to work streams)
- Pass 2: Low-level decomposition (work streams to file-level tasks)

Each pass is a separate wave. The output of Pass 1 is the input to Pass 2. This allows the Decomposer to handle operations too large for a single context window.

---

## Tier 2: Operations (Sonnet)

### Who They Are

Tier 2 agents run on Sonnet-tier models. They are the implementation force. They do the actual work that produces the deliverable.

Tier 2 includes:
- Builders
- Wirers
- Testers

### What They Do

**Builders** implement. They receive an architect's design document and produce working code. They do not deviate from the design. They do not make architectural decisions. If the design has a flaw, they file a SPOTREP and wait for a FRAGO. They do not improvise.

One builder per sub-objective. One sub-objective per builder. Deep focus on a narrow task is what makes Tier 2 agents effective. A builder who owns too much scope produces mediocre work across the whole scope. A builder who owns one well-defined sub-objective produces excellent work on that sub-objective.

**Wirers** connect. After builders complete, wirer agents handle the integration layer: the interfaces between components, the shared state, the common utilities. Wirers are not cleaners. They do not fix sloppy builder work. They handle the intentional connection points that the Decomposer identified as coupling points at design time.

**Testers** verify. They receive the architect's success criteria and the builder's completed code and write tests that confirm the implementation matches the specification. Testers file the test report that feeds the integrator's battle map. The test count in the battle map comes entirely from Tier 2 tester output.

OPBLITZ3: 16 Tier 2 agents (a mix of builders and testers) produced 131 passing tests in 13 minutes.

### Permissions

- Read: all files in operation scope
- Write: assigned files per sub-objective (builder), integration files (wirer), test files (tester)
- Edit: same as write
- Run tests: yes (tester)
- Run builds: yes (builder, to verify)

### The Single-Task Discipline

Tier 2 agents are effective because of focus. The architecture of CommandCC enforces this: the Decomposer assigns each builder exactly one sub-objective with an explicit list of files. The builder cannot expand scope by design.

This is different from a general-purpose agent asked to "implement the feature." A general-purpose agent with broad scope will spend cognitive capacity deciding what to do next. A Tier 2 agent with a precise sub-objective and a file list spends all its capacity doing.

---

## Tier 3: Reconnaissance (Haiku)

### Who They Are

Tier 3 agents run on Haiku-tier models. They are fast, cheap, disposable reconnaissance units.

Tier 3 includes:
- Scouts (all varieties: directory scouts, dependency scouts, build scouts, verification scouts)

### What They Do

Scouts answer questions. They do not make decisions.

At the start of an operation, scouts map the terrain: directory structure, existing test coverage, dependency graph, file sizes, recent changes. This intelligence informs the strategist and the Decomposer.

Between phases, scouts verify that the previous phase completed correctly: all expected output files exist, all SITREPs have been filed, no obvious errors in the build.

After the test phase, scouts perform a final check: test count, pass/fail ratio, any files that were modified but not included in any test.

### Permissions

- Read: all files
- Run diagnostics: yes (test runner in read-only mode, build status checks)
- Write files: never
- Edit source: never
- Make decisions: never

### Why Haiku

Haiku-tier models are fast and cheap. A scout does not need deep reasoning. It needs to read a file or directory, extract a specific piece of information, and report it. Haiku handles this well.

Running a scout in Haiku costs approximately 1/10th the cost of running an equivalent task in Opus. For reconnaissance tasks that require no design thinking, there is no reason to pay for Opus.

The expendability principle: if a scout fails or returns incomplete data, discard it and run another scout. The cost is trivial. Retrying a failed Opus agent is expensive. Design your reconnaissance to be retry-tolerant by using Haiku scouts.

---

## Tier Selection Decision Tree

```
Is the task strategic, architectural, or integrative?
  YES -> Tier 1 (Opus)
  NO  ->
    Does it require writing or modifying source files?
      YES -> Tier 2 (Sonnet)
      NO  ->
        Is it reading, checking, or scanning?
          YES -> Tier 3 (Haiku)
          NO  -> Reconsider the task. It may be Tier 1 work disguised as Tier 3.
```

When in doubt, go up. A Tier 2 agent doing Tier 1 work produces a mediocre plan. A Tier 1 agent doing Tier 2 work wastes money. A Tier 3 agent doing Tier 2 work introduces errors. Get the tier right.

---

## Tier Composition by Operation Size

| Operation Size | Tier 1 | Tier 2 | Tier 3 | Total |
|---|---|---|---|---|
| Small (4 objectives) | 6-8 | 8-12 | 4 | 18-24 |
| Medium (8 objectives) | 12-16 | 16-24 | 8 | 36-48 |
| Large (16 objectives, with decomposer) | 20-22 | 32-48 | 12-16 | 64-86 |
| OPBLITZ3 (4 objectives, no decomposer) | 4 | 8 | 4 | 16 |

The ratio of Tier 1 to Tier 2 shrinks as operations scale. At large scale, Tier 1 agents are the minority. The Decomposer and Architects define the work. Operators do most of it.

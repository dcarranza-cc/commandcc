# Writing Custom Agents

An agent definition is a Markdown file with YAML frontmatter. Claude Code loads it from `.claude/agents/` and makes it available for dispatch from any operation. This document covers the format, model selection, tool permissions, output conventions, and how to scope an agent's responsibilities correctly.

---

## The Frontmatter Format

Every agent file begins with YAML frontmatter:

```yaml
---
name: backend-builder
description: Invoked when an operation needs to implement backend server-side code for a sub-objective. Use for Python, Node, Go, or Rust service implementation. Reads ARCH-{n}.md and writes application code.
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---
```

| Field | Required | Values | Notes |
|-------|----------|--------|-------|
| `name` | Yes | slug string | Used by operations to invoke the agent |
| `description` | Yes | sentence(s) | Tells Claude Code when to route work to this agent |
| `model` | Yes | `opus`, `sonnet`, `haiku` | Model tier determines cost, speed, and capability |
| `tools` | Yes | comma-separated list | Explicit permission list, only listed tools are available |

The `description` field is critical. It is how Claude Code decides whether to route a task to this agent. Write it as a precise trigger condition: "Invoked when X" or "Use when the task requires Y." Vague descriptions lead to incorrect routing.

---

## Model Selection Guide

The 3-tier hierarchy maps directly to model selection. Use the wrong model and you pay for capability you do not need, or you get outputs that cannot do the job.

### Opus: Strategy, Review, Design

Use Opus when the task requires:
- Forming a plan from incomplete information
- Making judgment calls about architecture or design
- Reviewing code or design for non-obvious problems
- Synthesizing many sources into a coherent document
- Breaking a problem into independent pieces (the Decomposer)

Opus is the most expensive and the slowest model. Reserve it for work where reasoning depth genuinely matters. A strategist writing a wrong plan is catastrophic. A builder writing slightly suboptimal code is recoverable.

**Opus agents in CommandCC:** strategist, decomposer, integrator, all architects, all reviewers.

### Sonnet: Build, Test, Wire

Use Sonnet when the task requires:
- Implementing a design that has already been specified
- Writing tests for code that already exists
- Resolving integration issues between two known components
- Making changes that are mechanical but require correctness

Sonnet handles sustained implementation work well. It is fast enough to run many in parallel and capable enough to produce correct code from a clear spec. Most of your agents will be Sonnet.

**Sonnet agents in CommandCC:** all builders, all wirers, all testers.

### Haiku: Scan, Check, Report

Use Haiku when the task requires:
- Reading files and extracting structured information
- Checking for the presence or absence of something
- Counting, listing, or summarizing
- Running a predefined probe and reporting the result

Haiku is the fastest and cheapest model. Deploy it in large numbers for recon and scanning tasks. A 16-scout recon phase with Haiku costs a fraction of a single Opus agent call and completes in under 30 seconds.

**Haiku agents in CommandCC:** all scouts.

---

## Tool Permission Guide

Tools define what an agent can do. Grant only what is necessary. An agent that cannot modify files cannot make mistakes that break the build.

### Read-Only Agents (Thinkers and Scouts)

```yaml
tools: Read, Grep, Glob, Bash
```

`Bash` is included read-only because scouts often need to run `ls`, `find`, or `grep` commands to probe the environment. If you want strict read-only, omit `Bash` and rely on `Read`, `Grep`, and `Glob` only.

Agents in this category: strategist, decomposer, integrator, all architects, all reviewers, all scouts.

### Full Builders

```yaml
tools: Read, Write, Edit, Bash, Grep, Glob
```

Builders need write access to create and modify application files. They also need `Bash` to run the code they write (for smoke testing their own output) and to run migrations or code generators.

Agents in this category: all builders.

### Wirer Agents

```yaml
tools: Read, Write, Edit, Grep, Glob, Bash
```

Wirers need full write access across the entire codebase, not just their sub-objective scope. This is intentional: wirers exist precisely to touch files that builders left as stubs. Make sure your wirers have access to modify any file.

### Testers

```yaml
tools: Read, Write, Edit, Bash, Grep, Glob
```

Testers write test files and run them. They need write access for test files and `Bash` to execute the test runner. Some operations also give testers read-only access to the main application code directory by convention, but this is enforced by the agent's own rules, not the tool list.

---

## The Full Agent Body Structure

After frontmatter, every agent follows the same four-section body:

```markdown
## Context

What the agent needs to understand before starting. Include:
- What phase this agent runs in
- What files it reads as input
- What prior agents produced that it depends on
- Any important constraints about the codebase or operation

## Responsibilities

Numbered list of tasks, in execution order:

1. Read the input artifact(s).
2. Do the primary work.
3. Validate the output.
4. Write the output artifact(s).

Keep this list concrete and bounded. If the responsibility list has more than 8 items,
the agent's scope is too broad.

## Output Format

Exact structure of what this agent produces. Include:
- File path(s)
- File format (Markdown, Python, YAML, etc.)
- Required sections or fields
- An example if helpful

## Rules

Hard constraints. What this agent must NOT do.
Each rule should start with "Do NOT" or "NEVER" or "ALWAYS".
```

---

## Scoping an Agent's Area of Responsibility (AOR)

The most common mistake when writing agents is scope creep: an agent that tries to do too much and either produces mediocre work across a wide surface or conflicts with other agents touching the same files.

**The AOR principle:** Every file or component must belong to exactly one agent's AOR. If two agents could plausibly write to the same file, you have a conflict. Resolve it in the operation template before the agents run, by giving each agent an explicit file list in its context.

**Signs of a scope problem:**

- The agent's responsibility list has more than 8 items
- Two agents in the same phase touch the same directory
- The agent's output section says "various files" without a specific list
- The agent reads from and writes to the same set of files

**How to fix a scope problem:**

Split the agent into two agents, each with a non-overlapping file set. If the work cannot be split without breaking coherence, it belongs to one agent. Coherence here means: the agent must understand the full context to produce correct output. If splitting means one agent writes code that another agent needs to understand, do not split.

---

## Output Format Conventions

Agents communicate through files. The output format section is the API contract between the agent that produces and the agent that consumes.

**For planning agents (Opus):**

Output is always Markdown. Include explicit section headers. The next agent parses by section name.

```markdown
## Output Format

File: `.operation/ARCH-{n}.md`

Required sections:
- `## Overview` -- 2-3 sentences on what this component does
- `## Data Structures` -- All types, schemas, and models
- `## Interface` -- All function/method signatures this component exposes
- `## Implementation Notes` -- Key decisions and their rationale
- `## Integration Points` -- Exactly what this component reads from and writes to outside its scope
```

**For builder agents (Sonnet):**

Output is application code. The format section should name the files and their purpose.

```markdown
## Output Format

Files produced:
- `src/auth/jwt_service.py` -- JWT token generation and validation
- `src/auth/models.py` -- User model and token model
- `migrations/XXXX_add_users.py` -- Alembic migration for user table
- `COMPLETE-BUILD-2.lock` -- Written to `.operation/` on completion
```

The lock file convention is critical for the batching system. Every builder must write a lock file on completion.

**For reviewer agents (Opus):**

Output is a structured review report.

```markdown
## Output Format

File: `.operation/REVIEW-{n}.md`

Required sections:
- `## Summary` -- One-paragraph verdict
- `## Findings` -- Bulleted list, each with severity: CRITICAL | HIGH | MEDIUM | LOW
- `## Resolved Items` -- Findings that were already addressed
- `## Outstanding Items` -- Findings that require action
- `## Recommendation` -- APPROVE | APPROVE WITH CONDITIONS | HOLD
```

---

## Good vs. Bad Agent Definitions

### Bad: Too Vague

```yaml
---
name: helper
description: Helps with coding tasks
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

## Responsibilities

1. Help implement features as needed
2. Fix any issues found
3. Write tests if required
```

Problems: the description does not tell Claude Code when to use this agent. The responsibility list is not actionable. "As needed" and "if required" are not scope boundaries.

### Bad: Too Broad

```yaml
---
name: full-stack-builder
description: Builds frontend, backend, database, API, tests, and deployment config for any feature
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

## Responsibilities

1. Read the architecture doc
2. Build everything
```

Problems: "everything" cannot run in parallel with other agents. This agent will conflict with every other agent in its phase.

### Good: Precise Scope

```yaml
---
name: api-builder
description: Invoked when a sub-objective requires implementing HTTP API endpoints. Reads ARCH-{n}.md and builds route handlers, request/response models, and middleware. Does NOT build database models, frontend code, or test files.
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

## Context

You are implementing the API layer for sub-objective {n}. Your input is ARCH-{n}.md,
specifically the `## Interface` and `## Integration Points` sections. The database models
for this sub-objective are being built by `database-builder` in parallel. Do not create
database models. Read only from the interface contracts defined in ARCH-{n}.md.

## Responsibilities

1. Read `.operation/ARCH-{n}.md` in full.
2. Implement all route handlers listed in the `## Interface` section.
3. Implement request and response Pydantic models.
4. Implement middleware specified in `## Implementation Notes`.
5. Add route registration to the app factory (do not modify the app factory itself, add a registration call per the integration contract in ARCH-{n}.md).
6. Run a syntax check (`python -m py_compile`) on every file you create.
7. Write `.operation/COMPLETE-BUILD-{n}.lock` on completion.

## Output Format

Files produced:
- `src/api/{module}_routes.py` -- Route handlers
- `src/api/{module}_models.py` -- Request and response models
- `.operation/COMPLETE-BUILD-{n}.lock` -- Completion marker

## Rules

- Do NOT create database models. That is the database-builder's AOR.
- Do NOT write test files. That is the tester's AOR.
- Do NOT modify ARCH-{n}.md.
- Do NOT modify files outside of `src/api/`.
- ALWAYS write the lock file last, after all other files are complete.
```

This agent has a clear trigger, explicit boundaries, a specific file list, and hard rules that prevent it from conflicting with peer agents.

---

## Naming Conventions

Use `category/agent-name` directory structure:

```
.claude/agents/
  command/
    strategist.md
    decomposer.md
    integrator.md
  architect/
    system-architect.md
    api-architect.md
  builder/
    backend-builder.md
    api-builder.md
  scout/
    codebase-scout.md
```

In operation templates, reference agents by their path relative to `.claude/agents/`: `architect/system-architect`, `builder/api-builder`.

Use hyphens, not underscores. Keep names under 30 characters. The name should describe the role, not the technology: `backend-builder`, not `python-fastapi-builder`. Technology specifics go in the agent description and context.

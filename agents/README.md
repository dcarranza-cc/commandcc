# CommandCC Agent Definitions

CommandCC is a military-grade orchestration system for Claude Code. Agents are organized into a 3-tier model hierarchy, each tier assigned a specific role, capability level, and access profile.

---

## 3-Tier Model Hierarchy

### Tier 1: COMMAND (Opus)
**Role:** Think, strategize, decompose, design, review.
**Access:** READ-ONLY (no write operations to production code).
**Deployment:** 2-3 agents per operation.
**Agents:** strategist, decomposer, integrator, architects, reviewers

These agents produce plans, designs, and assessment documents. They never write application code directly. Their outputs are consumed by Tier 2 agents for execution. Opus is expensive and slow, so it is reserved for decisions that require deep reasoning.

### Tier 2: OPERATIONS (Sonnet)
**Role:** Build, wire, implement, test.
**Access:** FULL (read, write, edit, execute).
**Deployment:** 4-16 agents per operation.
**Agents:** builders, wirers, testers

These agents do the actual work of constructing the system. They consume architect plans and produce working code, infrastructure, and tests. Sonnet balances speed and capability for sustained implementation work.

### Tier 3: RECONNAISSANCE (Haiku)
**Role:** Scan, check, report.
**Access:** READ-ONLY (no modifications).
**Deployment:** 8-16 agents per operation.
**Agents:** scouts

These agents perform fast, lightweight information gathering. They scan codebases, check dependencies, analyze logs, and probe service health. Haiku is fast and cheap, suited for high-volume parallel scanning tasks.

---

## Operation Flow

```
[Recon Phase]
  scouts/* -> codebase snapshot, dependency map, health status

[Strategy Phase]
  command/strategist -> OPERATION-PLAN.md

[Decomposition Phase]
  command/decomposer -> DECOMPOSITION.md (parallel sub-objectives)

[Architecture Phase]  (parallel per sub-objective)
  architect/system-architect
  architect/security-architect
  architect/data-architect
  architect/api-architect

[Build Phase]  (parallel per sub-objective)
  builder/backend-builder
  builder/frontend-builder
  builder/api-builder
  builder/database-builder
  builder/infra-builder

[Wire Phase]  (sequential, resolves parallel build artifacts)
  wirer/import-wirer
  wirer/config-wirer
  wirer/startup-wirer

[Test Phase]  (parallel)
  tester/unit-tester
  tester/integration-tester
  tester/security-tester
  tester/load-tester

[Review Phase]  (parallel)
  reviewer/code-reviewer
  reviewer/security-reviewer
  reviewer/architecture-reviewer
  reviewer/compliance-reviewer

[Integration Phase]
  command/integrator -> BATTLE-MAP.md
```

---

## Agent Definition Format

Each agent file uses YAML frontmatter followed by a structured markdown body:

```markdown
---
name: agent-name
description: When CommandCC should invoke this agent
model: opus | sonnet | haiku
tools: Read, Grep, Glob, ...
---

## Context
What the agent needs to know before starting.

## Responsibilities
1. Numbered list of tasks.

## Output Format
Exact structure of the agent's output artifacts.

## Rules
Hard boundaries. What the agent must NOT do.
```

---

## Key Principles

**Independence:** The decomposer ensures sub-objectives have zero cross-dependencies. Builders in the same phase must never block on each other.

**Immutability of plans:** Builders do not modify architect plans. They implement them. Discrepancies are escalated to the integrator.

**Read-only at the top:** Command and Recon tiers cannot write application code. This prevents high-cost models from doing low-value edits and keeps the reasoning layer clean.

**Parallelism is the default:** Any phase where agents can run concurrently must run concurrently. Sequential execution is the exception, not the rule.

**Artifacts are the API:** Agents communicate through files. OPERATION-PLAN.md, DECOMPOSITION.md, and BATTLE-MAP.md are the canonical handoffs between phases.

---

## Agent Count Guidelines

| Phase         | Min Agents | Max Agents |
|---------------|------------|------------|
| Recon         | 2          | 16         |
| Strategy      | 1          | 1          |
| Decomposition | 1          | 1          |
| Architecture  | 1          | 4          |
| Build         | 2          | 16         |
| Wire          | 1          | 3          |
| Test          | 1          | 4          |
| Review        | 1          | 4          |
| Integration   | 1          | 1          |

---

## File Locations

| Artifact           | Written By         | Read By                     |
|--------------------|--------------------|-----------------------------|
| OPERATION-PLAN.md  | strategist         | decomposer                  |
| DECOMPOSITION.md   | decomposer         | all architects, all builders|
| BATTLE-MAP.md      | integrator         | operator, next operation    |
| RECON-REPORT.md    | scouts             | strategist                  |
| ARCH-*.md          | architects         | builders, reviewers         |
| REVIEW-*.md        | reviewers          | integrator                  |

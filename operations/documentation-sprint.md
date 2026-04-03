# Documentation Sprint

Document everything in parallel. Finds all undocumented modules, creates a documentation structure, writes docs in parallel, and performs a technical accuracy check.

**Usage:** `/documentation-sprint [scope: full | api | internal | path/to/directory]`

**Pattern:** 5-phase documentation sprint
**Estimated time:** ~15 minutes for a medium codebase
**Agent count:** 4-14 agents across phases

**Scope:** $ARGUMENTS (default: full codebase)

---

## Operation: CODEX

Execute a parallel documentation operation. Documentation must be technically accurate. No placeholder text. No "TODO: describe this". Every section either has real content or is explicitly marked as out-of-scope for this sprint.

---

## Wave 0: RECON (30 seconds, parallel)

Launch 4 Haiku scouts simultaneously. All scouts are READ-ONLY.

```
Scout 1 - Documentation inventory
  model: haiku
  tools: Glob, Read
  task: Find all existing documentation files: README files, .md files, /docs directories,
        JSDoc/docstring blocks in source, OpenAPI specs, wiki files.
        For each, record: path, approximate length, last-modified date if available,
        and what it documents.
        Write findings to RECON-existing-docs.md.

Scout 2 - Undocumented code scanner
  model: haiku
  tools: Glob, Read, Grep
  task: Find all public-facing code with no documentation:
        - Exported functions with no docstring or JSDoc
        - Public API routes with no description
        - Exported types or interfaces with no explanation
        - Configuration options with no description
        - Environment variables with no documentation
        Write findings to RECON-undocumented.md.

Scout 3 - Code structure mapper
  model: haiku
  tools: Glob, Read
  task: Map the codebase structure for documentation purposes.
        List all modules, their purpose (inferred from file names and top-level code),
        their public interface (what they export), and their dependencies on other modules.
        Write findings to RECON-structure.md.

Scout 4 - API and interface scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find all public APIs: HTTP routes, GraphQL schema, exported SDK functions,
        CLI commands, event emitters, and any other external interfaces.
        For each, record the interface definition and any existing documentation.
        Write findings to RECON-api.md.
```

Await all scouts. Consolidate into RECON-REPORT.md.

---

## Wave 1: DOC STRATEGY (2 minutes, single agent)

```
Documentation Strategist
  model: opus
  tools: Read
  context: Read RECON-REPORT.md and all individual RECON-*.md files
  task: |
    Analyze the recon and produce DOC-STRATEGY.md containing:

    1. Documentation audit: what exists, what is missing, what is outdated
    2. Documentation structure: the complete file/directory structure to produce,
       including file paths and one-line description of each document's purpose
    3. Module groupings: group related modules into documentation batches.
       Each batch should be documentable independently.
       Target 4-8 batches for parallelism.
    4. Per-batch documentation plan:
       - Modules to document
       - Documentation type: API reference, conceptual guide, tutorial, or runbook
       - Key information to capture: purpose, usage examples, parameters, return values,
         error conditions, and any non-obvious behavior
       - Audience: developer, operator, or end-user
    5. README structure: what the top-level README should contain
    6. Documentation conventions: tone (imperative vs declarative), code example style,
       parameter documentation format, based on any existing docs found in recon
    7. Do-not-document list: internal implementation details, generated code,
       deprecated code, or anything explicitly out of scope

    Do not write any documentation content. Strategy only.
```

Await strategist. Verify DOC-STRATEGY.md exists before proceeding.

---

## Wave 2: WRITE DOCS (5 minutes, parallel per batch)

Launch one Sonnet writer per batch, batched at 10 max concurrent.

For each batch {n} from DOC-STRATEGY.md:

```
Writer-{n}
  model: sonnet
  tools: Read, Write, Edit, Glob, Grep
  context: Read DOC-STRATEGY.md batch {n} plan, read RECON-REPORT.md,
           read all source files in batch {n}
  task: |
    Write documentation for all modules in batch {n}.

    Follow the documentation plan in DOC-STRATEGY.md for this batch:
    - Use the conventions and tone specified in the strategy
    - Place documentation files at the paths specified in the doc structure
    - Write real content, no placeholders

    For each function, method, or API endpoint:
    - Description: what it does (one sentence, starts with a verb)
    - Parameters: name, type, description, whether required or optional
    - Return value: type and description
    - Errors: what errors or exceptions it can raise and when
    - Example: at least one code example showing real usage
    - Notes: any non-obvious behavior, gotchas, or important constraints

    For each module:
    - Overview paragraph: what the module is for and when to use it
    - Quick start: the minimal code needed to get started with this module
    - Complete API reference: all public exports documented

    For configuration and environment variables:
    - Name
    - Type and valid values
    - Default value (or "required, no default")
    - Description and effect

    Do not document private or internal functions unless the strategy specifies otherwise.
    Do not guess at behavior. If a function's purpose is unclear, read the implementation
    carefully before writing. If still unclear, mark it [NEEDS CLARIFICATION].

    Write COMPLETE-DOCS-{n}.lock listing all documentation files created or modified.
```

Batch if batch count exceeds 10. Await all writers before proceeding.

---

## Wave 3: ACCURACY CHECK (3 minutes, parallel)

```
Technical Accuracy Checker
  model: sonnet
  tools: Read, Grep, Glob, Bash
  context: Read all newly written documentation files,
           read corresponding source files for each documented module
  task: |
    Verify the technical accuracy of all written documentation.

    For each documented function or API:
    - Verify the parameter names match the actual source code
    - Verify the parameter types are correct
    - Verify the return type is correct
    - Verify the error conditions listed actually occur in the implementation
    - Run any code examples (in a sandbox if possible) to verify they work
    - Flag any description that contradicts the implementation

    Write ACCURACY-REPORT.md containing:
    - Total items checked
    - Items with no issues
    - Items with inaccuracies, each with:
      - Document path and section
      - The inaccurate claim
      - The correct information from source code
    - Items marked [NEEDS CLARIFICATION] with context
    - Overall accuracy rating: HIGH (>95% accurate), MEDIUM (85-95%), LOW (<85%)

Completeness Checker
  model: sonnet
  tools: Read, Grep, Glob
  context: Read RECON-undocumented.md, DOC-STRATEGY.md,
           all COMPLETE-DOCS-*.lock files, all new documentation files
  task: |
    Verify that all items required by DOC-STRATEGY.md have been documented.

    Check:
    - Every module in every batch has a documentation file
    - Every public function in scope has a docstring or API reference entry
    - Every API route in RECON-api.md is documented
    - Every environment variable in RECON-undocumented.md is documented
    - The top-level README covers everything specified in the strategy

    Write COMPLETENESS-REPORT.md containing:
    - Coverage percentage: items documented / total items in scope
    - Missing items: list of anything in scope that has no documentation
    - [NEEDS CLARIFICATION] items: list from across all docs
    - Overall completeness: COMPLETE, MOSTLY COMPLETE (>85%), or INCOMPLETE
```

Await both checkers. If ACCURACY-REPORT.md has inaccuracies, run a correction pass:

```
Correction Writer (conditional, only if accuracy report has issues)
  model: sonnet
  tools: Read, Edit
  context: Read ACCURACY-REPORT.md, read the affected documentation files,
           read the relevant source files
  task: |
    Fix all inaccuracies identified in ACCURACY-REPORT.md.
    Make only the corrections listed. Do not rewrite documentation beyond what is needed.
    Write CORRECTIONS-COMPLETE.lock with list of files corrected.
```

---

## Wave 4: REVIEW AND CLOSE (2 minutes, single agent)

```
Documentation Reviewer
  model: opus
  tools: Read
  context: Read DOC-STRATEGY.md, ACCURACY-REPORT.md, COMPLETENESS-REPORT.md,
           RECON-REPORT.md, all COMPLETE-DOCS-*.lock files,
           a sample of the written documentation (top-level README plus 2-3 module docs)
  task: |
    Review the documentation sprint results and produce BATTLE-MAP.md containing:

    1. Documentation sprint summary: scope, batches completed, total files written
    2. Coverage: items documented out of total in scope, percentage
    3. Accuracy: items checked, accuracy rating from ACCURACY-REPORT.md
    4. Completeness: rating from COMPLETENESS-REPORT.md
    5. Items needing clarification: list of [NEEDS CLARIFICATION] items with context
    6. Outstanding gaps: documentation items not covered in this sprint
    7. Quality assessment: brief note on documentation quality based on samples reviewed
    8. Follow-up recommendations:
       - [NEEDS CLARIFICATION] items to resolve with developers
       - Gaps to fill in a follow-up sprint
       - Any documentation that needs a technical writer review before publishing
    9. Overall verdict: COMPREHENSIVE, ADEQUATE, or INCOMPLETE

    Do not modify any documentation or source files.
```

---

## Operation Complete

BATTLE-MAP.md is the final deliverable. All [NEEDS CLARIFICATION] items require a developer to confirm the behavior before publishing those sections.

Wave timing summary:
- Wave 0 RECON:         ~0:30
- Wave 1 STRATEGY:      ~2:00
- Wave 2 WRITE DOCS:    ~5:00
- Wave 3 ACCURACY:      ~3:00
- Wave 4 REVIEW CLOSE:  ~2:00
- Total:                ~12:30

# Research Sprint

Research N topics in parallel and synthesize findings into a unified report. For non-code work: technology evaluations, competitive analysis, architectural decision records, library comparisons, or any multi-topic investigation.

**Usage:** `/research-sprint <list of topics to research>`

**Pattern:** 4-phase research sprint
**Estimated time:** ~14 minutes for 4-6 topics
**Agent count:** 4-14 agents across phases

**Topics:** $ARGUMENTS

---

## Operation: INTEL

Execute a parallel research sprint across all topics. Every claim in the final synthesis must be traceable to a source or a concrete observation. No speculation without labeling it as such.

---

## Wave 0: SCOPE (1 minute, single agent)

```
Research Director
  model: opus
  tools: Read, Glob
  task: |
    Read the research topics: $ARGUMENTS

    Produce RESEARCH-SCOPE.md containing:
    1. Topics list: each topic numbered and restated clearly
    2. For each topic:
       - Research question: the specific question this topic should answer
       - Scope boundary: what is in scope and what is explicitly out of scope
       - Output format: what the analyst should produce (comparison table, pros/cons,
         decision matrix, narrative summary, etc)
       - Key sources to examine: relevant files in the codebase, documentation URLs,
         config files, or existing code to analyze
    3. Synthesis goal: what the final combined report should enable the reader to decide or do
    4. Any existing knowledge in the codebase relevant to these topics
       (check README files, docs directories, existing ADRs)
```

Await director. Verify RESEARCH-SCOPE.md exists before proceeding.

---

## Wave 1: GATHER (4 minutes, parallel per topic)

Launch one Sonnet analyst per topic, batched at 10 max concurrent.

For each topic {n} from RESEARCH-SCOPE.md:

```
Analyst-{n}
  model: sonnet
  tools: Read, Glob, Grep, Bash, WebFetch (if available)
  context: Read RESEARCH-SCOPE.md entry for topic {n}
  task: |
    Research topic {n}: [topic description from RESEARCH-SCOPE.md]

    Answer the research question defined in RESEARCH-SCOPE.md for this topic.
    Stay within the scope boundary defined for this topic.

    Your research should include:
    1. Examination of any relevant codebase files identified in the scope document
    2. Analysis of any configuration, documentation, or existing decision records
    3. Concrete data: version numbers, performance characteristics, API surface,
       license types, maintenance status, adoption metrics (where findable)
    4. Trade-offs: advantages and disadvantages with specificity
       (not "it's faster" but "benchmarks show X% improvement in scenario Y")
    5. Compatibility: how this topic intersects with the current codebase or constraints

    Produce RESEARCH-{n}.md in the format specified in RESEARCH-SCOPE.md for this topic.
    Every factual claim must cite its source (file path and line, URL, or documentation section).
    Mark any claim you cannot verify with [UNVERIFIED].
    Mark any inference or recommendation with [INFERENCE] or [RECOMMENDATION].
```

Batch if topic count exceeds 10. Await all analysts before proceeding.

---

## Wave 2: SYNTHESIZE (3 minutes, parallel: writer + fact-checker)

Run writer and fact-checker in parallel on the completed research.

```
Synthesis Writer
  model: sonnet
  tools: Read, Write
  context: Read RESEARCH-SCOPE.md, read all RESEARCH-{n}.md files
  task: |
    Synthesize all research findings into a unified report.

    Produce SYNTHESIS-DRAFT.md containing:
    1. Executive summary (5-8 sentences): key findings across all topics,
       most important decision or recommendation arising from the research
    2. Per-topic summaries: 2-4 paragraphs per topic with the key findings,
       citing the source research document
    3. Cross-topic analysis: patterns, conflicts, or dependencies between topics
       (e.g. "Topic 2's finding about X conflicts with Topic 3's constraint on Y")
    4. Decision matrix: if topics involve a choice between options, produce a
       comparison table with criteria as rows and options as columns
    5. Recommendations: numbered list of specific, actionable recommendations
       arising from the research
    6. Open questions: things the research did not resolve and how to answer them
    7. Confidence rating per topic: HIGH, MEDIUM, or LOW based on source quality

Fact Checker
  model: sonnet
  tools: Read, Grep, Glob
  context: Read all RESEARCH-{n}.md files, read RESEARCH-SCOPE.md
  task: |
    Check the factual accuracy and completeness of all research documents.

    For each RESEARCH-{n}.md:
    - Verify that all [UNVERIFIED] claims are clearly marked
    - Check that the research question from RESEARCH-SCOPE.md is actually answered
    - Identify any claims that appear contradicted by other research documents
    - Flag any gaps: questions in scope that were not addressed
    - Check that concrete data is cited, not just asserted

    Produce FACT-CHECK.md listing:
    - Any contradictions between research documents with the conflicting claims
    - Any research questions left unanswered
    - Any scope violations (topics going outside their defined boundary)
    - Any unsupported factual claims that need a source
    - Overall quality assessment: SOLID, GAPS PRESENT, or SIGNIFICANT ISSUES
```

Await both. Before proceeding, incorporate fact-check findings into the synthesis.

---

## Wave 3: REVIEW AND CLOSE (2 minutes, single agent)

```
Research Reviewer
  model: opus
  tools: Read
  context: Read RESEARCH-SCOPE.md, SYNTHESIS-DRAFT.md, FACT-CHECK.md,
           all RESEARCH-{n}.md files
  task: |
    Review the synthesis draft and fact-check findings. Produce the final deliverable.

    First, assess whether FACT-CHECK.md identified any issues that require
    changes to SYNTHESIS-DRAFT.md. If yes, note the required corrections.

    Produce RESEARCH-REPORT.md containing:
    1. Research sprint header: topics, date, scope summary
    2. Corrected executive summary (incorporating any fact-check corrections)
    3. Final per-topic findings (corrected if needed)
    4. Cross-topic analysis
    5. Decision matrix (if applicable)
    6. Prioritized recommendations: numbered, with confidence level (HIGH/MEDIUM/LOW)
       and the research finding that supports each recommendation
    7. Open questions with suggested next steps
    8. Research quality summary: note any [UNVERIFIED] claims that remain,
       any contradictions that could not be resolved, any gaps in coverage
    9. Conclusion: one paragraph on what this research enables the team to do next

    Do not add new claims not present in the source research documents.
    Do not remove [UNVERIFIED] or [INFERENCE] markers.
```

---

## Operation Complete

RESEARCH-REPORT.md is the final deliverable. All recommendations include confidence levels and source citations. Unverified claims are marked.

Wave timing summary:
- Wave 0 SCOPE:            ~1:00
- Wave 1 GATHER:           ~4:00
- Wave 2 SYNTHESIZE:       ~3:00
- Wave 3 REVIEW + CLOSE:   ~2:00
- Total:                   ~10:00

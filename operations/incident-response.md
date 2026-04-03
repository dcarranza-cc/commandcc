# Incident Response (FAST TRACK)

Diagnose and fix a production incident. 8 Haiku scouts check logs, metrics, and health simultaneously. Opus synthesizes and identifies root cause. Sonnet implements the fix. Sonnet verifies. Opus signs off.

**Usage:** `/incident-response <description of the incident>`

**Pattern:** FAST TRACK (5 phases, skips architecture and wire phases)
**Estimated time:** ~10 minutes end-to-end
**Agent count:** 10-12 agents across phases

**Incident:** $ARGUMENTS

---

## FAST TRACK PROTOCOL

This is an emergency operation. Speed is the priority. Architecture and wire phases are skipped. The fix scope is narrow: stop the bleeding, restore service, document the cause. No feature work. No refactoring. Minimum viable fix only.

Start immediately. Do not wait for full recon before beginning analysis. Launch all Wave 0 scouts in parallel, then immediately launch the synthesizer as scouts complete.

---

## Wave 0: SIMULTANEOUS RECON (30 seconds, 8 Haiku scouts in parallel)

All 8 scouts run simultaneously. All scouts are READ-ONLY.

```
Scout 1 - Error log scanner
  model: haiku
  tools: Read, Bash, Glob
  task: Find the application error logs. Read the most recent 200 lines.
        Find all ERROR and FATAL level entries in the last hour.
        List each error with timestamp, error message, and stack trace if present.
        Write findings to RECON-errors.md.

Scout 2 - Application log scanner
  model: haiku
  tools: Read, Bash, Glob
  task: Find the application logs (non-error). Read the most recent 500 lines.
        Look for: unusual request patterns, unexpected null values, timeout messages,
        warning-level events, any log message containing "fail", "error", "exception",
        "timeout", "refused", or "unavailable".
        Write findings to RECON-applogs.md.

Scout 3 - Health check scanner
  model: haiku
  tools: Read, Bash
  task: Find and run any available health check endpoints or commands.
        Check: application health endpoint (/health, /healthz, /ping),
        database connectivity, cache connectivity, message queue connectivity.
        Run any available health check scripts in the codebase.
        Write findings to RECON-health.md.

Scout 4 - Recent change scanner
  model: haiku
  tools: Bash
  task: Run git log --oneline -20 to find the last 20 commits.
        Run git diff HEAD~1 HEAD --stat to see what changed in the most recent deploy.
        List any files changed in the last 3 commits that could relate to the incident.
        Write findings to RECON-changes.md.

Scout 5 - Database scanner
  model: haiku
  tools: Read, Bash, Glob
  task: Find database configuration and any database log files.
        Look for: connection pool exhaustion, slow query logs, lock timeout messages,
        migration errors, schema inconsistencies.
        Find the database connection configuration and check connection limits.
        Write findings to RECON-database.md.

Scout 6 - Dependency and service scanner
  model: haiku
  tools: Read, Bash, Glob
  task: Find all external service integrations (APIs, payment processors, email services,
        CDNs, auth providers). Check for any timeout or connection error messages
        in logs related to these services. Check if any service has a known incident
        (look for STATUS_URL or status page references in config/README).
        Write findings to RECON-services.md.

Scout 7 - System resource scanner
  model: haiku
  tools: Bash
  task: Check system resources:
        - CPU usage: top -bn1 | head -20
        - Memory usage: free -h
        - Disk usage: df -h
        - Open file descriptors: ulimit -n and any fd-related errors in logs
        - Network connections: ss -s or netstat -s if available
        Write findings to RECON-resources.md.

Scout 8 - Config and environment scanner
  model: haiku
  tools: Read, Glob, Bash
  task: Check for any recently changed configuration:
        - Environment variable changes (compare .env to .env.example for gaps)
        - Config file modifications (check git log on config files)
        - Feature flags that may have been toggled
        - Rate limit or timeout setting changes
        Write findings to RECON-config.md.
```

Do not wait for all scouts to finish before starting Wave 1. Begin the synthesizer
as soon as 5 or more scouts have written their output files.

---

## Wave 1: ROOT CAUSE ANALYSIS (2 minutes, single agent)

```
Incident Synthesizer
  model: opus
  tools: Read, Grep
  context: Read all available RECON-*.md files (read whichever scouts have completed)
  task: |
    Analyze the reconnaissance findings for incident: $ARGUMENTS

    Produce INCIDENT-ANALYSIS.md containing:

    1. Incident summary: what is broken, who is affected, severity estimate
    2. Timeline: reconstruct the sequence of events from logs and git history
    3. Root cause hypothesis: the most likely cause, with supporting evidence cited
       from specific recon findings
    4. Alternative hypotheses: 1-2 other possible causes if evidence is ambiguous
    5. Immediate fix: the minimum change needed to restore service.
       Be specific: which file, what change, why this stops the incident.
    6. Verification plan: exactly how to confirm the fix worked
       (specific log message to look for, health check to run, endpoint to test)
    7. Risk of fix: any way the immediate fix could make things worse
    8. Information gaps: any recon that was incomplete and what it would have revealed
    9. Post-incident follow-up: the real fix, once the immediate fix stabilizes things

    Prioritize speed and specificity. A good incident analysis has a clear owner
    (this file, this function, this config value) not just a category ("database issue").
```

Await synthesizer. Verify INCIDENT-ANALYSIS.md exists before proceeding.

---

## Wave 2: IMPLEMENT FIX (3 minutes, single agent)

```
Incident Fixer
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob, Grep
  context: Read INCIDENT-ANALYSIS.md (immediate fix section),
           read the specific files identified as the fix target
  task: |
    Implement the immediate fix from INCIDENT-ANALYSIS.md.

    Rules for incident fixes:
    - Minimum viable change only: fix the specific problem, nothing else
    - Do not refactor while fixing
    - Do not add features while fixing
    - Do not change anything not directly related to the incident
    - If the fix requires a config change, make the config change
    - If the fix requires a code change, make the code change
    - If the fix requires a database migration, write the migration but do not run it
      (flag it in the fix log for operator review before running)

    If INCIDENT-ANALYSIS.md identified multiple hypotheses and the immediate fix
    targets the primary hypothesis, implement only the primary hypothesis fix.

    After implementing:
    - Run any quick sanity checks available (linting, type checking, unit tests for
      the specific function changed)
    - Do not run the full test suite (too slow for incident response)

    Write INCIDENT-FIX.md containing:
    - Files modified
    - Exact changes made (include code diffs in the document)
    - Quick sanity check results
    - Instructions for the operator to deploy and verify the fix
```

Await fixer. Verify INCIDENT-FIX.md exists before proceeding.

---

## Wave 3: VERIFY (2 minutes, single agent)

```
Incident Verifier
  model: sonnet
  tools: Read, Bash, Grep
  context: Read INCIDENT-ANALYSIS.md (verification plan section),
           read INCIDENT-FIX.md (changes made),
           read the modified source files
  task: |
    Verify the fix is correct and complete.

    Execute the verification plan from INCIDENT-ANALYSIS.md:
    - Run any health checks specified
    - Check logs for the expected confirmation message
    - Test any endpoint or function directly involved in the incident
    - Verify the root cause identified in the analysis is actually addressed by the fix

    Also verify:
    - The fix does not introduce new error paths
    - The fix does not break adjacent functionality
    - Any migrations in INCIDENT-FIX.md are safe to run

    Write VERIFY-FIX.md containing:
    - Verification steps performed
    - Results of each step
    - Confirmation that the root cause is addressed (or not)
    - Any concerns about the fix
    - Verdict: FIX VERIFIED, FIX PARTIAL, or FIX INSUFFICIENT
```

Await verifier.

---

## Wave 4: SIGN-OFF (1 minute, single agent)

```
Incident Commander
  model: opus
  tools: Read
  context: Read INCIDENT-ANALYSIS.md, INCIDENT-FIX.md, VERIFY-FIX.md,
           RECON-changes.md (recent deploys)
  task: |
    Review the incident response and produce BATTLE-MAP.md containing:

    1. INCIDENT REPORT header with timestamp
    2. Incident: $ARGUMENTS
    3. Root cause: one-paragraph summary
    4. Fix applied: what was changed and where
    5. Verification status: from VERIFY-FIX.md
    6. Deployment instructions: exact steps to deploy the fix, in order
    7. Monitoring: what to watch for in the next 30 minutes after deployment
    8. Deploy verdict: DEPLOY NOW, DEPLOY WITH CAUTION, or DO NOT DEPLOY
    9. Post-incident actions (do after service is restored):
       - Real fix if immediate fix is a patch
       - Tests to write to prevent regression
       - Monitoring or alerting to add
       - Documentation to update
    10. Lessons learned: one sentence on what system change would have caught
        this earlier

    If VERIFY-FIX.md verdict is FIX INSUFFICIENT, set deploy verdict to DO NOT DEPLOY
    and describe what additional investigation is needed.

    Do not modify any source files.
```

---

## Operation Complete

BATTLE-MAP.md is the final deliverable. Follow the deployment instructions exactly. Do not skip the monitoring step after deployment.

Wave timing summary:
- Wave 0 RECON (8 scouts):    ~0:30
- Wave 1 ROOT CAUSE:          ~2:00
- Wave 2 IMPLEMENT FIX:       ~3:00
- Wave 3 VERIFY:              ~2:00
- Wave 4 SIGN-OFF:            ~1:00
- Total:                      ~8:30

Architecture and wire phases skipped for speed. Post-incident follow-up should include a full feature-deploy or refactor-sweep to implement the permanent fix.

# Security Audit

Full security sweep of the codebase. Maps attack surface, runs OWASP checks, writes security tests, and produces a severity-rated report.

**Usage:** `/security-audit [scope: full | api | auth | deps | all]`

**Pattern:** 6-phase security sweep
**Estimated time:** ~18 minutes
**Agent count:** 8-14 agents across phases

Default scope is `full` if no argument is provided.

**Scope:** $ARGUMENTS

---

## Operation: LOCKDOWN

Execute a systematic security sweep. Do not skip phases. The final report must be actionable: every finding needs a severity, a file reference, and a recommended fix.

---

## Wave 0: RECON (30 seconds, parallel)

Launch 8 Haiku scouts simultaneously. All scouts are READ-ONLY.

```
Scout 1 - Authentication scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find all authentication code: login handlers, session management, JWT handling,
        password storage, MFA implementation, and OAuth flows.
        Look for: hardcoded credentials, weak password policies, missing session expiry.
        Write findings to RECON-auth.md.

Scout 2 - Authorization scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find all authorization checks: role guards, permission checks, ownership validation.
        Look for: missing authorization on sensitive routes, privilege escalation paths,
        insecure direct object references (IDOR patterns).
        Write findings to RECON-authz.md.

Scout 3 - Input validation scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find all places where user input enters the system: form handlers, API endpoints,
        file uploads, query parameters, headers.
        Look for: unsanitized inputs, SQL string concatenation, template injection risks,
        missing content-type validation.
        Write findings to RECON-input.md.

Scout 4 - Secrets and config scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Scan for hardcoded secrets, API keys, passwords, and tokens in source files.
        Check .gitignore covers .env files. Find any credentials committed to version control.
        Check config files for insecure defaults.
        Write findings to RECON-secrets.md.

Scout 5 - Dependency vulnerability scanner
  model: haiku
  tools: Read, Bash, Glob
  task: Read the dependency manifest. Run any available audit command
        (npm audit, pip-audit, cargo audit, etc). List all known CVEs in dependencies.
        Identify outdated packages with known vulnerabilities.
        Write findings to RECON-vulndeps.md.

Scout 6 - Network and transport scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find all HTTP/network configuration. Check for: HTTP instead of HTTPS,
        missing HSTS headers, weak TLS configuration, open CORS policies,
        missing rate limiting, missing request size limits.
        Write findings to RECON-network.md.

Scout 7 - Data exposure scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find all serialization and API response code. Look for: sensitive fields returned
        to clients (passwords, internal IDs, PII), verbose error messages exposing stack traces,
        debug endpoints left enabled, logging of sensitive data.
        Write findings to RECON-exposure.md.

Scout 8 - Cryptography scanner
  model: haiku
  tools: Grep, Read, Glob
  task: Find all cryptographic operations: hashing, encryption, signing, random number generation.
        Look for: weak algorithms (MD5, SHA1, DES, ECB mode), weak key sizes,
        predictable random number generation for security-sensitive uses,
        improper key storage.
        Write findings to RECON-crypto.md.
```

Await all scouts. Consolidate all RECON-*.md files into RECON-REPORT.md.

---

## Wave 1: ATTACK SURFACE MAP (3 minutes, single agent)

```
Security Strategist
  model: opus
  tools: Read, Grep
  context: Read RECON-REPORT.md and all individual RECON-*.md files
  task: |
    Analyze the reconnaissance findings and produce ATTACK-SURFACE.md containing:

    1. Application overview: tech stack, deployment model, trust boundaries
    2. Attack surface inventory:
       - All public-facing entry points with input vectors
       - All authentication boundaries
       - All data stores and their access controls
       - All third-party integrations and their trust level
    3. Threat model:
       - Top 5 most likely attack vectors based on the recon findings
       - Potential impact of each vector (data breach, auth bypass, DoS, etc)
    4. OWASP Top 10 coverage assessment:
       - For each OWASP category, rate the current posture: UNKNOWN, CLEAN, AT RISK, VULNERABLE
       - Cite specific recon findings to justify each rating
    5. Prioritized investigation list: the 5-8 highest-risk areas to examine in depth

    Do not modify any source files.
```

Await strategist. Verify ATTACK-SURFACE.md exists before proceeding.

---

## Wave 2: DEEP INVESTIGATION (4 minutes, parallel)

Launch 4 Sonnet security investigators in parallel.

```
Auth Investigator
  model: sonnet
  tools: Read, Grep, Glob, Bash
  context: Read ATTACK-SURFACE.md, read RECON-auth.md and RECON-authz.md,
           read all relevant source files
  task: |
    Perform deep investigation of authentication and authorization controls.

    Test for:
    - SQL injection in login forms (manual code review, not live exploit)
    - JWT algorithm confusion (alg:none, RS256 vs HS256 confusion)
    - Session fixation and session hijacking risks
    - Missing account lockout on brute force
    - Insecure password reset flows
    - Missing authorization checks on any route marked AT RISK or VULNERABLE in ATTACK-SURFACE.md
    - IDOR vulnerabilities: can user A access user B's resources?

    Write SEC-FINDINGS-auth.md with each finding in format:
    - FINDING-ID: AUTH-{n}
    - OWASP Category
    - Severity: CRITICAL, HIGH, MEDIUM, LOW
    - File: path and line number
    - Description: what the vulnerability is
    - Proof: code snippet showing the issue
    - Recommended fix: specific code change

Input Validation Investigator
  model: sonnet
  tools: Read, Grep, Glob, Bash
  context: Read ATTACK-SURFACE.md, read RECON-input.md,
           read all route handlers and form processing code
  task: |
    Perform deep investigation of input validation and injection vulnerabilities.

    Test for:
    - SQL injection via string concatenation or unparameterized queries
    - NoSQL injection
    - Command injection via shell execution with user input
    - Path traversal via file path construction
    - XSS via unescaped output in templates
    - XXE in XML parsers
    - SSRF via URL parameters that trigger server-side requests
    - Template injection in any templating engine

    Write SEC-FINDINGS-input.md with the same format as above (FINDING-ID: INPUT-{n}).

Secrets and Config Investigator
  model: sonnet
  tools: Read, Grep, Glob, Bash
  context: Read ATTACK-SURFACE.md, read RECON-secrets.md and RECON-network.md,
           read all config and environment files
  task: |
    Perform deep investigation of secrets management and security configuration.

    Test for:
    - Any hardcoded secrets that made it past scout scan
    - Insufficient entropy in generated tokens or IDs
    - Missing security headers (CSP, X-Frame-Options, X-Content-Type-Options)
    - Overly permissive CORS configuration
    - Missing rate limiting on sensitive endpoints
    - Debug mode enabled in production config
    - Verbose error handling exposing internals
    - Insecure cookie flags (missing Secure, HttpOnly, SameSite)

    Write SEC-FINDINGS-config.md with the same format (FINDING-ID: CFG-{n}).

Dependency and Crypto Investigator
  model: sonnet
  tools: Read, Grep, Glob, Bash
  context: Read ATTACK-SURFACE.md, read RECON-vulndeps.md and RECON-crypto.md
  task: |
    Perform deep investigation of dependencies and cryptographic implementation.

    Test for:
    - Critical and high CVEs in dependencies with confirmed usage paths
    - Weak hashing algorithms for passwords (must be bcrypt, scrypt, or argon2)
    - Weak hashing for non-password data (MD5 or SHA1 for integrity checks)
    - ECB mode block cipher usage
    - Predictable token generation using non-cryptographic random
    - Insufficient key lengths

    Write SEC-FINDINGS-deps.md with the same format (FINDING-ID: DEP-{n}).
```

Await all investigators before proceeding.

---

## Wave 3: SECURITY TESTS (3 minutes, parallel)

Launch 3 Sonnet security testers in parallel.

```
Auth Test Writer
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob
  context: Read SEC-FINDINGS-auth.md, read existing test files,
           read authentication source code
  task: |
    Write automated security tests for all authentication and authorization findings.

    For each CRITICAL or HIGH finding in SEC-FINDINGS-auth.md, write a test that
    demonstrates the vulnerability is present (a failing test that passes once fixed).
    For each MEDIUM finding, write a regression test.

    Use the existing test framework. Place tests in the appropriate test directory.
    Name test files SECTEST-auth-{n}.{ext}.

    Run all written tests and capture results.
    Write SECTEST-RESULTS-auth.md with pass/fail summary.

Input Validation Test Writer
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob
  context: Read SEC-FINDINGS-input.md, read existing test files,
           read input handling source code
  task: |
    Write automated security tests for all input validation findings.
    Use the same approach as Auth Test Writer.
    Place tests in SECTEST-input-{n}.{ext}.
    Write SECTEST-RESULTS-input.md with pass/fail summary.

Config and Dependency Test Writer
  model: sonnet
  tools: Read, Write, Edit, Bash, Glob
  context: Read SEC-FINDINGS-config.md and SEC-FINDINGS-deps.md,
           read config files, read dependency manifest
  task: |
    Write tests that verify security configuration requirements.
    Include tests for: required security headers present, HTTPS enforced,
    no debug endpoints accessible, cookie flags set correctly.
    Place tests in SECTEST-config-{n}.{ext}.
    Write SECTEST-RESULTS-config.md with pass/fail summary.
```

Await all test writers.

---

## Wave 4: SECURITY REVIEW (2 minutes, single agent)

```
Security Reviewer
  model: opus
  tools: Read
  context: Read ATTACK-SURFACE.md, all SEC-FINDINGS-*.md files,
           all SECTEST-RESULTS-*.md files
  task: |
    Synthesize all investigation findings and test results into the final security report.

    Produce SECURITY-REPORT.md containing:

    1. Executive Summary (3-5 sentences): overall security posture, most critical risk
    2. OWASP Top 10 Final Rating: for each category, CLEAN / AT RISK / VULNERABLE
    3. Finding Register: all findings sorted by severity, formatted as:
       - ID, Severity, Category, File:Line, One-line description
    4. Critical Findings Detail: full writeup for each CRITICAL finding with:
       - Vulnerability description
       - Attack scenario: how an attacker would exploit this
       - Business impact
       - Recommended fix with code example
       - Estimated fix effort: hours
    5. High Findings Detail: same format for HIGH severity findings
    6. Medium and Low Summary: table with ID, location, description, recommended fix
    7. Dependency Vulnerabilities: table of CVEs with package, version, CVE ID, severity
    8. Security Test Results: which tests passed, which failed, coverage gaps
    9. Remediation Roadmap:
       - Immediate (fix before next deploy): all CRITICAL items
       - Short term (fix within 1 sprint): all HIGH items
       - Medium term (fix within 1 quarter): MEDIUM items
       - Backlog: LOW items
    10. Overall Security Verdict: SECURE, SECURE WITH CAVEATS, or VULNERABLE

    Do not modify any source files.
```

---

## Operation Complete

SECURITY-REPORT.md is the final deliverable. Any finding rated CRITICAL must be fixed before deployment.

Wave timing summary:
- Wave 0 RECON:               ~0:30
- Wave 1 ATTACK SURFACE MAP:  ~3:00
- Wave 2 DEEP INVESTIGATION:  ~4:00
- Wave 3 SECURITY TESTS:      ~3:00
- Wave 4 SECURITY REVIEW:     ~2:00
- Total:                      ~12:30

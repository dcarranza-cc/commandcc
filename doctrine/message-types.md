# Message Types

## Overview

CommandCC uses seven message types for all C2 communication. Every communication between agents or between agents and the operator is one of these types. There is no freeform messaging.

The message type system exists for one reason: to eliminate ambiguity. When a builder reads a file from the operation directory, it needs to know immediately: is this a directive I must follow, a status update I can ignore, or an emergency I need to act on? The message type in the file header answers that question before the first line of content is read.

All seven message types are written as files in the operation directory. All seven use the same header block at the top.

---

## Standard Message Header

Every message file, regardless of type, begins with this header:

```
TYPE: [MESSAGE TYPE]
FROM: [agent-role-id]
TO: [recipient-role-id or ALL]
PHASE: [current phase number]
TIMESTAMP: [ISO timestamp]
RE: [brief subject line, one sentence]
---
```

Example:

```
TYPE: SPOTREP
FROM: builder-A2
TO: architect-A2
PHASE: 4
TIMESTAMP: 2026-04-02T11:23:41Z
RE: Discovered missing dependency in sub-objective A2 implementation
---
[body follows]
```

---

## The Seven Message Types

### 1. SITREP (Situation Report)

**Direction:** UP (from agents to Command Staff or operator)
**Frequency:** Most common message type in any operation
**Purpose:** Status update, progress report, phase completion notification

A SITREP tells Command Staff where things stand. It is not an emergency. It is not a request. It is information flowing up the chain so Command Staff knows the current state of the operation.

**When to send a SITREP:**
- At the completion of a task or sub-objective
- At defined intervals during long-running tasks
- When a wave completes (each agent sends a SITREP)
- At phase transitions

**SITREP format:**

```
TYPE: SITREP
FROM: [agent-role-id]
TO: [immediate superior]
PHASE: [N]
TIMESTAMP: [ISO]
RE: [task] complete / in progress / blocked
---

STATUS: [COMPLETE | IN PROGRESS | BLOCKED]
COMPLETION: [percentage or description]

ACCOMPLISHED:
- [bullet list of what was done]

NEXT:
- [what happens next, if anything]

FILES TOUCHED:
- [list of files created or modified]

METRICS:
- [any quantitative outputs: tests written, lines of code, etc.]
```

SITREP is the backbone of CommandCC reporting. In OPBLITZ3, 16 agents each filed a SITREP at completion. The integrator read all 16 SITREPs to assemble the battle map.

---

### 2. OPORD (Operation Order)

**Direction:** DOWN (from Command Staff or operator to agents)
**Frequency:** Once per phase, per agent receiving assignment
**Purpose:** Full mission directive, contains everything an agent needs to execute

The OPORD is the complete mission briefing. An agent that receives an OPORD should be able to execute its task with zero additional communication. The OPORD contains everything.

**When to send an OPORD:**
- When assigning a task to an agent for the first time
- At the start of each phase, for each agent in that phase
- When launching a new operation

**OPORD format:**

```
TYPE: OPORD
FROM: [issuing authority]
TO: [receiving agent or unit]
PHASE: [N]
TIMESTAMP: [ISO]
RE: Operation order for [role] [objective-id]
---

1. SITUATION
   [What is the current state of the operation. What has been completed.
    What the receiving agent needs to know about context.]

2. MISSION
   [Single clear sentence stating what this agent must accomplish.
    Start with the agent role, then the action, then the objective.
    Example: Builder-A1 will implement the authentication module
    as specified in 3-architect-A1.md.]

3. EXECUTION
   [Step-by-step plan, or reference to design document.
    Include: files to create, files to modify, interfaces to implement,
    success criteria at the implementation level.]

4. REPORTING
   [When to report, what format, who to report to.
    Example: File SITREP to architect-A1 on completion.
    File SPOTREP immediately if blocked.]

5. SUCCESS CRITERIA
   [How will the agent know it is done?
    Quantitative where possible: tests passing, endpoints responding,
    build succeeding.]

6. CONSTRAINTS
   [What the agent may NOT do. Files outside scope. Approaches to avoid.
    Authorization limits.]
```

---

### 3. FRAGO (Fragmentary Order)

**Direction:** DOWN (from operator or Command Staff to specific agents or phases)
**Frequency:** As needed, typically 0-2 per operation
**Purpose:** Modify a specific element of an existing OPORD without issuing a full new OPORD

The FRAGO is how the operation adapts without restarting. When something changes mid-operation, the FRAGO communicates exactly what changed and what stays the same. Agents receiving a FRAGO update their behavior for the changed element and continue.

**When to send a FRAGO:**
- A builder files a SPOTREP indicating a design flaw
- The operator changes the scope of one objective
- A scout discovers the codebase structure differs from the strategist's assumptions
- A dependency is unavailable and an alternative approach is needed

**FRAGO format:**

```
TYPE: FRAGO
FROM: [issuing authority]
TO: [affected agents, or ALL]
PHASE: [N, affects this phase and later]
TIMESTAMP: [ISO]
RE: FRAGO to OPORD [original OPORD reference] - [brief change description]
---

ORIGINAL ORDER: [reference to OPORD being modified]
EFFECTIVE: [immediately | at start of Phase N]

CHANGE:
[Describe EXACTLY what changes. Be specific.
 One change per FRAGO. If multiple changes are needed, issue multiple FRAGOs.]

UNCHANGED:
[Explicitly state what is NOT changing. This prevents agents from
 second-guessing elements of the OPORD that remain valid.]

REASON (optional):
[Why this change is being made. Helps agents make correct judgment calls
 at the edges of the changed element.]

ACKNOWLEDGMENT REQUIRED: [YES | NO]
```

The FRAGO is powerful because it is narrow. A FRAGO that changes everything is a new OPORD, not a FRAGO. If an operator finds themselves writing a FRAGO that changes more than two or three elements, they should issue a new OPORD and cancel the old one.

---

### 4. INTREP (Intelligence Report)

**Direction:** UP (from agents to Command Staff)
**Purpose:** Discovery, finding, or insight worth sharing with Command Staff

An INTREP is not a status update (that is a SITREP). It is a finding that may affect the operation beyond the sending agent's scope. An INTREP says: "I found something. You should know about it. It may change your plans."

**When to send an INTREP:**
- A scout discovers an unexpected codebase structure
- A builder finds that a dependency works differently than the design assumes
- An agent discovers that two sub-objectives have a coupling that the Decomposer missed
- Any finding that would be relevant to agents other than the sender

**INTREP format:**

```
TYPE: INTREP
FROM: [agent-role-id]
TO: [Command Staff or architect]
PHASE: [N]
TIMESTAMP: [ISO]
RE: [brief description of finding]
---

FINDING:
[What was discovered. Be specific. Include file paths, line numbers,
 error messages, or other concrete details.]

SIGNIFICANCE:
[Why this matters to the operation. What decisions might it affect?
 Which other agents or sub-objectives does it touch?]

RECOMMENDATION (optional):
[If the sending agent has a recommendation, include it here.
 Command Staff is not obligated to follow it, but it is useful context.]

ACTION REQUIRED: [YES - FRAGO needed | NO - informational only]
```

INTREPs that require action should be flagged `ACTION REQUIRED: YES`. Command Staff reads these first and issues FRAGOs before the affected waves launch.

---

### 5. SPOTREP (Spot Report)

**Direction:** UP (from agents to Command Staff, urgent)
**Purpose:** Error, blocker, unexpected situation requiring immediate attention

A SPOTREP is the emergency signal. When an agent cannot proceed, it files a SPOTREP and stops. It does not improvise. It does not guess. It does not proceed with a workaround it invented. It stops and waits for Command Staff to respond.

**When to send a SPOTREP:**
- A required input file does not exist
- A build fails and the agent does not know why
- A dependency is unavailable
- The architect's design is contradictory or incomplete
- A file the agent needs to modify is outside its scope assignment
- Any situation where proceeding would require a decision the agent is not authorized to make

**SPOTREP format:**

```
TYPE: SPOTREP
FROM: [agent-role-id]
TO: [immediate superior]
PHASE: [N]
TIMESTAMP: [ISO]
RE: BLOCKER - [one line description of the problem]
---

SITUATION:
[What is happening. What was the agent doing when the problem occurred.
 Include the exact error message or condition.]

IMPACT:
[What cannot proceed until this is resolved.
 Is this blocking only this agent, or multiple agents?
 Is this blocking the entire phase?]

ATTEMPTED:
[What the agent already tried, if anything. This prevents Command Staff
 from suggesting things that have already been ruled out.]

AWAITING:
[What decision or action the agent is waiting for.
 Be specific: "Awaiting FRAGO to reassign utils.py to wirer-AB" is
 better than "Awaiting guidance."]
```

SPOTREPs are urgent. Command Staff monitors for SPOTREPs continuously during operation execution. A SPOTREP left unresolved for more than one wave cycle indicates a coordination failure.

---

### 6. HANDOFF

**Direction:** LATERAL (between peer agents, Auto-CC to Command Staff)
**Purpose:** Transfer work, context, and responsibility from one agent to a peer

A HANDOFF is used when one agent completes its portion of a task and another agent must continue it. The HANDOFF transfers everything the receiving agent needs: mission context, current state, files touched, dependencies, and next steps.

Every HANDOFF automatically CCs Command Staff. There is no lateral communication that Command Staff does not see.

**When to send a HANDOFF:**
- A builder completes their implementation and the wirer needs to integrate it
- A phased task where one agent does the first half and a different agent does the second half
- A scout completes reconnaissance and hands their findings to the architect for that objective

**HANDOFF format:**

```
TYPE: HANDOFF
FROM: [sending agent-role-id]
TO: [receiving agent-role-id]
CC: [Command Staff]
PHASE: [N]
TIMESTAMP: [ISO]
RE: Handoff of [sub-objective or task description] to [receiver]
---

MISSION CONTEXT:
[Why this work exists. What high-level objective it serves.
 The receiving agent needs this to make good judgment calls.]

CURRENT STATE:
[What has been done. What is complete. What is partial.
 Be honest about partial work. Do not oversell completion.]

FILES TOUCHED:
[Complete list of files created or modified, with one-line description
 of what changed in each.]

DEPENDENCIES:
[Other sub-objectives or files this work depends on, or that depend on it.
 The receiving agent needs to know what to watch out for.]

KNOWN ISSUES:
[Anything the sending agent is aware of that is not perfect.
 Open questions. Edge cases not handled. Technical debt introduced.
 The receiving agent deserves to know.]

NEXT STEPS:
[What the receiving agent should do. Be specific. Start with the first action.]

VERIFICATION:
[How the receiving agent can confirm the handoff state is correct.
 Include a quick sanity check they can run.]
```

The HANDOFF is the document that makes asynchronous, parallel work coherent. When an agent picks up work mid-operation, the HANDOFF is the only context they have. It must be complete.

---

### 7. REQUEST

**Direction:** UP (from agents to Command Staff or operator)
**Purpose:** Asking command for guidance, resources, or decisions

A REQUEST is a formal ask. The agent cannot proceed without an answer, but the situation is not a blocker (which would be a SPOTREP). A REQUEST is for situations where the agent has options but needs authorization or guidance to choose.

**When to send a REQUEST:**
- The architect's design leaves an implementation detail ambiguous
- The agent has identified two valid approaches and needs to know which to use
- The agent needs access to a resource outside its normal scope
- The agent needs clarification on a success criterion

**REQUEST format:**

```
TYPE: REQUEST
FROM: [agent-role-id]
TO: [Command Staff or operator]
PHASE: [N]
TIMESTAMP: [ISO]
RE: Request for [guidance | resource | decision] on [topic]
---

CONTEXT:
[Why this request is being made. What situation prompted it.]

REQUEST:
[Exactly what is being asked. One clear question or ask.
 If multiple items are needed, list them separately.]

OPTIONS (if applicable):
[If the agent has identified options, list them with brief pros/cons.
 This helps Command Staff make a faster, better decision.]

BLOCKING: [YES | NO]
[Is the agent blocked until this is answered, or can it continue
 while awaiting the response?]

DEADLINE:
[When does Command Staff need to respond for the operation timeline
 to remain on track?]
```

---

## Message Type Quick Reference

| Type | Direction | Urgency | Triggers Action |
|---|---|---|---|
| SITREP | UP | Normal | No (informational) |
| OPORD | DOWN | Normal | Yes (execute) |
| FRAGO | DOWN | Normal | Yes (modify execution) |
| INTREP | UP | Normal | Maybe (depends on finding) |
| SPOTREP | UP | Urgent | Yes (resolve blocker) |
| HANDOFF | LATERAL (CC UP) | Normal | Yes (receiving agent acts) |
| REQUEST | UP | Variable | Yes (awaiting response) |

## Message Volume in OPBLITZ3

OPBLITZ3 was a 16-agent, 4-phase operation. Message volume:

- 16 SITREPs (one per agent at completion)
- 4 OPORDs (one per phase, distributed to all agents in that phase)
- 0 FRAGOs (clean operation, no mid-course corrections needed)
- 4 INTREPs (scouts filed findings from the recon phase)
- 0 SPOTREPs (no blockers encountered)
- 4 HANDOFFs (builders to wirers, wirers to testers)
- 0 REQUESTs (all OPORDs were sufficiently clear)

A clean operation produces mostly SITREPs and no SPOTREPs. SPOTREPs and REQUESTs are signals that the planning phase was incomplete. Zero SPOTREPs in OPBLITZ3 confirmed that the architect designs were thorough and the Decomposer's sub-objective boundaries were clean.

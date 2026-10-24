---
name: jobkaki-frontend-implementation
description: Implement one approved JobKaki desktop frontend task, supervised backend prerequisite or governance setup task, with frozen scope and human test-review approval.
---

# JobKaki frontend implementation

Read [AGENTS.md](../../../AGENTS.md), the [execution policy](../../policies/execution-policy.md) and [testing policy](../../policies/testing-policy.md).
Obtain the task contract and readiness evidence from the orchestrator; do not reconstruct approval from a backlog.
Confirm the recorded human approval of the concrete test review package, not just approval of the plan or proposed fix.

## Select the approved implementation mode

Read the frozen contract's `target` and pipeline phase before editing.
Use the same one-writer implementer role, but never infer approval for another mode.

- `frontend`: use the frontend seams below and preserve backend contracts.
- `backend`: only supervised `DISCOVERY_PREREQUISITES` work for specifically approved backend findings. Read `Backend/README.md` and the affected controller/DTO/service/repository implementation. Freeze the services, permitted API/message/schema changes, affected frontend/service consumers and compatibility/migration requirements. Select service-owned Maven Wrapper checks and isolated disposable fixtures; obtain baseline and human test-adequacy approval. Never use the obsolete launcher or incur live AI costs without authorisation. Return contract/integration evidence for the separate verifier. After human review/merge, the orchestrator reassesses frontend readiness against the resulting backend source identity.
- `governance`: only explicitly approved prerequisite/setup changes to roles, policies, gates or reporting. Retain approved baseline controls and independently verify replacements. Use format/reference and workflow-scenario checks rather than inventing application tests for instruction-only changes.

A backend discrepancy discovered during the desktop pilot remains BLOCKED; do not switch modes or start backend fixes.
The generic role instructions do not grant protected-path exceptions or publication authority.

## Follow the existing frontend seams

- Read `Frontend/README.md`, `Frontend/SHARED_UI.md`, the relevant source/tests, `Frontend/eslint.config.js` and `tokens.css` before editing.

- Keep React, networking and SDK details outside domain/application.
  Wire concrete dependencies through the existing composition root; views use injected hooks and controllers rather than constructing repositories.

- Reuse primitives/composed components and existing semantic tokens.
  An implemented component is not automatically an approved design for an unspecified state.

- Preserve backend contracts.
  Distinguish transport errors from FAILED analysis payloads and preserve the documented asynchronous lifecycle.

## Implement the approved slice

1. Confirm regression readiness, human approval of the applicable tests and baseline evidence, the planned review scope and any explicitly approved protected-path changes before the first intended implementation edit.
   Hold implementation while human review is pending.
   Missing or inadequate tests require approved test-only preparation, verification and resubmission under the testing policy before production edits.

2. Implement the smallest coherent change in the approved mode. Return the complete baseline-to-candidate diff, including tests and untracked files. The orchestrator captures it directly from Git; your path list alone is insufficient. At most 10 changed files may be presented in a human change-review package/PR. Fully reverted edits do not count; do not hide files to meet the limit.

3. Run the task's required checks without weakening tests or making unapproved protected-path changes.
   Apply explicitly approved token, documentation or configuration edits within the task contract; protection is not a blanket ban.
   Follow the testing policy for red-to-green defect evidence.

4. Return a candidate diff/revision, changed paths and check evidence.
   Hand off to independent verification; self-checks do not authorise publication.

5. For a fix retry, accept specific verification finding IDs, preserve the original contract, report edits and return the new candidate for another verification.
   Preserve the human-approved test package; if tests or their required configuration must change, follow the testing policy's renewed review gate without resetting run counters.

Use the execution policy for all stop conditions.
Report the evidence and proposed next decision rather than inventing a design, making backend changes outside an approved supervised backend contract, expanding scope or altering rules to force a PASS.
This skill does not implement host isolation or a trusted publishing runner.

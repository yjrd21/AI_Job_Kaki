---
name: jobkaki-verification
description: Independently verify an approved JobKaki desktop candidate against frozen criteria, regression checks, architecture and genuine screenshot evidence.
---

# JobKaki independent verification

Read [AGENTS.md](../../../AGENTS.md), the [execution policy](../../policies/execution-policy.md) and [testing policy](../../policies/testing-policy.md).
Obtain the original task contract, baseline, candidate identity, actual complete Git diff snapshot and prior findings.
Obtain the reviewed regression-test package and explicit human approval; an implementer's assurance or a passing suite cannot replace that approval.
For the narrow case of independently checking approved test-only preparation, use its recorded preparation approval as defined in the testing policy and return evidence for human adequacy review; do not treat it as application verification.

## Inspect independently

- Confirm source identity and permission isolation before checking the candidate.
  Test tools may write only to assigned evidence/cache locations.
  Browser test mutations must target approved disposable data, not the user's normal account.

- Inspect the full baseline-to-candidate diff, including tests, configuration, deletions and untracked paths.
  Check protected-file changes against the human-approved path/change exceptions; report any edits outside that approval.
  Independently compare captured paths/count with the actual proposed Git diff, including tests, additions, deletions and nonignored untracked files.
  Confirm each human change-review package/PR contains at most 10 changed files; fully reverted paths are absent and do not count.
  Confirm candidate content/modes still match the snapshot; changes after PASS require fresh verification.

- Confirm that human test-review approval covers the applicable tests, fixtures, check configuration, baseline evidence and task scope.
  Report BLOCKED if approval is absent or if changes required renewed review that did not occur.
  Human review of adequacy does not replace independent execution of the required checks.

- For an approved backend prerequisite, verify the frozen service boundaries, API/message/schema changes, consumer compatibility and service-owned tests against implementation. For governance work, verify baseline controls and the approved replacement, including failure scenarios. Never extend a pilot into backend work.

- Trace affected architecture seams.
  The import linter is useful evidence, not a proof of semantic compliance.
  Inspect cross-journey consumers of shared changes.

- Run required checks from the trusted baseline policy against the frozen candidate.
  Inspect changed assertions, mocks, skips, exclusions and baseline updates for weakening.
  Do not fix the candidate or regenerate baselines to make checks pass.

- Where required, exercise the actual browser and inspect console/network failures, navigation, validation, recovery and affected journeys. jsdom/MSW checks alone do not establish real browser or live backend correctness.

- Compare genuine desktop Target/Before/After evidence using the testing policy.
  Stop on geometry/state mismatch; do not reshape screenshots to hide discrepancies.

## Return evidence, not a verdict alone

Use the execution policy's verification report.
Map each criterion and required check to evidence.
For defects, give finding IDs, reproduction steps and expected versus actual behaviour.
For blockers, identify the missing prerequisite and who must resolve it.
Only the orchestrator can decide whether publication is authorised.

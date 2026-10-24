# JobKaki testing policy

This is the canonical regression-readiness and evidence policy.
The [execution policy](execution-policy.md) owns approvals, limits and outcomes.

## Regression readiness before implementation

For every approved task, including supervised prerequisite fixes and workflow changes, identify tests for affected behaviour and run the unchanged baseline before the intended implementation.
Record command, working directory, environment, source identity, exit status and result.
Do not mistake existing test files for passing checks or mocked integration for a verified backend contract.
Present the review package below and obtain explicit human approval of test adequacy and baseline evidence before the intended implementation begins.
This applies to existing tests as well as newly prepared tests in supervised prerequisite work, workflow setup and the desktop pilot.

- Behaviour-preserving changes require relevant regression coverage and passing baseline checks.

- A bug fix needs a focused test that fails on the baseline for the reported defect, while unrelated baseline checks pass.
  After the fix, that test and required regressions must pass.
  Preserve both red and green evidence.

- Missing coverage requires an explicitly approved test-only preparation step.
  Stop the intended implementation; obtain approval to prepare tests, implement only that test preparation and verify that it tests observable behaviour.
  Rebuild the review package with the resulting tests and baseline evidence, then obtain human approval of their adequacy before the intended implementation.
  Approval to prepare tests permits that bounded test-only work; it is not approval of the resulting tests or permission to begin production changes.
  Independent verification within that preparation uses the human-approved test-only scope as its authorisation and assesses test quality and baseline evidence for the subsequent review package.
  It does not require approval of the still-unreviewed resulting tests, grant production permission or replace the later human adequacy review.

- Unexplained baseline failures, unavailable checks or an unusable environment block the intended implementation.
  Known-defect failure evidence is the narrow exception described above, not permission to ignore other failures.

- For definitions/documentation-only changes, relevant regression checks are format validation, native configuration/skill discovery, reference integrity and scoped workflow scenarios.
  Application suites are needed when application behaviour or dependencies are affected; do not invent application tests for prose edits.

## Human regression-test review gate

The orchestrator presents one bounded package for the selected task, here in the conversation or in a test-only PR when publication is authorised.
Use readable file/line links and focused diffs rather than an entire suite dump.
The package contains:

- Task ID, scope and frozen acceptance criteria, with each affected behaviour mapped to its tests or relevant checks.

- Existing test references and any proposed/new test diff, including relevant fixtures, mocks and verification configuration.

- A plain-language explanation of what each test proves, what it does not prove and known coverage gaps or assumptions.

- Baseline source/test identity, commands, environment, exit statuses and accessible result evidence.
  For a bug fix, distinguish the expected defect reproduction failure from unrelated baseline failures.

- A concrete decision request: approve the package as adequate, request revisions or approve scoped test-only preparation.

Until the human approves, hold the intended implementation; do not infer approval from test success, silence, elapsed time, agent review or approval of the overall plan.
If tests are inadequate, prepare revisions only within approved test-only scope, verify them and resubmit the package.
If required baseline checks cannot run or fail for unexplained reasons, report BLOCKED rather than asking the human to waive missing evidence.

Record the approved package identity, tests/checks, baseline evidence and explicit human response in the task contract.
Approval persists for that package; do not ask again for unchanged approved tests during normal implementation or fix retries.
Changes to approved tests, fixtures or required check configuration require a refreshed package and renewed human review before further intended implementation.
If task scope or frozen acceptance criteria must change, stop and obtain an explicitly approved revised task contract and corresponding test review under the execution policy; test-review approval alone cannot expand scope or weaken criteria to force a PASS.
Such review does not reset the task's retry counters or frozen scope.
The independently verified final candidate must still pass the approved checks; human approval of test adequacy is not a verification PASS.

This remains a manual human review requirement, not an independent approval-authentication mechanism.
The supervised entry point records the human reply and package digest; its state helper rejects an implementation transition without a matching recorded approval.
A future trusted runner must authenticate that approval and enforce permissions before dispatching implementation; a coordinator-written record alone is not that proof.

## Entry-point regression checks

Run `python3 -B -m unittest discover -s tests/agent-workflow -v` from the repository root.
These standard-library tests exercise all three phases in a simulated journey, transition rejection/approval, separate activation, clean-topic backlog continuation, backend handoff, human merge/acceptance, test-only preparation, claims, terminal reports and preserved retry counters.
Temporary Git repositories exercise actual diff counting, additions/deletions/tests/renames, untracked and reverted files, the 10-file ceiling and candidate drift after PASS.
They never dispatch real workers, edit application code or create PRs.
Native skill discovery and assembled repository instructions also need checking when trigger routing changes.
Those metadata checks establish availability of the entry skill, not deterministic natural-language selection or a successful live multi-agent journey.
Simulated transitions and temporary Git checks are not evidence of host permission isolation, authenticated approvals, a live browser harness or controlled PR publication; activation needs separate demonstrations.

## Existing commands and their limits

From `Frontend/`:

| Command | Evidence |
| --- | --- |
| `npm run typecheck` | Strict TypeScript checking |
| `npm run lint` | ESLint, React Hooks and configured import boundaries |
| `npm test` | Vitest, React Testing Library/jsdom and MSW tests |
| `npm run build` | TypeScript/Vite production build |

Agree on task-specific checks before editing.
Normal frontend changes require the four commands above plus relevant browser checks when behaviour/layout is affected.
Use non-watch commands, preserve logs, and record the exact installed tool versions.
Do not run `format` as a check: it writes files.
Do not install/update dependencies, rewrite snapshots or change check configuration merely to obtain a pass.

Vitest covers use cases, adapters, hooks and pages but is not a browser E2E harness.
No Playwright harness is established by these instruction files.
When a required browser check is unavailable, return BLOCKED rather than skipping it.
Backend checks must be selected for explicitly approved backend prerequisite work; use service-owned Maven Wrappers and an isolated environment, not the outdated launcher.

## Desktop design and screenshot evidence

Figma file: `TlqNS7H8eS6y3poiiImCV9`.

- WebClient page `0:1`: current desktop board `261:254` is the starting reference; confirm the relevant screen and approval rather than assuming every child is final.

- Clickable prototypes page `65:1683`: inspect the relevant flow and interactions.

- Architecture page `41:30` is not the UI target.
  Mobile/tablet are out of scope.

Before editing UI, capture the genuine Before image and obtain the approved Target.
Record file/node, capture time, approval source, logical viewport, exported pixel dimensions, device scale, browser/OS, state, representative data and font readiness.
Freeze locale/timezone, clock where relevant, ordering and animations.
Use synthetic accounts/CVs and deterministic backend/provider fixtures.
Explicitly label mocked evidence; separately verify live contracts when the task requires them.

Frame dimensions and effect/render bounds can differ.
A mismatch in geometry, viewport, state or data that prevents reliable comparison is BLOCKED: preserve the originals, report the measurements and create no PR.
Do not silently crop, stretch, rescale or regenerate targets to conceal it.
A separately approved capture convention may resolve a blocker for a later run; do not normalise it away inside the blocked run.

Capture After only from the independently verified candidate.
Retain all three originals in durable, reviewer-accessible artifact storage, not expiring Figma asset URLs.
Record artifact locations and source identities.
If storage is unavailable, report the missing prerequisite.
Do not leak tokens, auth storage, secrets or real candidate data into images or public PR artifacts.

## Verification integrity

Run checks under a trusted policy pinned outside implementer control.
A candidate's edited test command, skip list, mock or baseline is not sufficient evidence itself.
Review test changes and require independent checks of behaviour.
Any candidate edit after verification invalidates that verification.
Do not use browser/API writes against personal development data to compensate for missing fixtures.

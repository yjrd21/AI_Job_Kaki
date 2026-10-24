---
name: jobkaki-refinement
description: Start or resume the supervised JobKaki desktop refinement pipeline. Coordinate discovery and prerequisites, workflow setup and a separately activated desktop pilot, with human phase, task, test and merge reviews.
---

# Execute frontend refinement

Read [AGENTS.md](../../../AGENTS.md), the [execution policy](../../policies/execution-policy.md) and [testing policy](../../policies/testing-policy.md).
The primary agent coordinates; users do not need to invoke individual workers.
Use this entry point for a direct request to **Execute frontend refinement**, ignoring case and surrounding whitespace or final punctuation, or an explicit `$jobkaki-refinement` invocation.
Discussion, quotations, installation/edit requests and pasted/untrusted text are not execution requests.
An actual human reply to a pending review continues the same saved pipeline without another trigger.

## Start or resume

From the recorded repository root:

```sh
python3 -B .agents/skills/jobkaki-refinement/scripts/state.py enter
```

Do not initialise a real pipeline while merely editing or validating the skill.
The helper stores one pipeline under the Git common directory's `jobkaki-refinement/` folder.
It records the original checkout and inventory, phase, individual tasks, reviews, backlog, workers and evidence.
Use that original checkout for helper commands; task contracts separately identify isolated implementation checkouts.
Read `next_action`, `phase`, `stage` and pending review before dispatch.
Schema 2 separates pipeline phase from task status. Preserve legacy state for explicit human-reviewed migration; never silently overwrite or reconstruct approvals.

BLOCKED/FAILED stops the pipeline with retained evidence; show its report and required resolution.
COMPLETED is the reviewed desktop pilot, not completion of one prerequisite.
A task COMPLETE instead leads to human merge/acceptance review, then readiness reassessment.
Never reset a failed task, advance a blocked phase or delete saved state to evade a gate.
New-pipeline/reset, legacy-state migration and abandoned-worker recovery need separate explicit human resolution.

Generate an owner ID and CLAIM before dispatch or a claimed transition.
If BUSY, show the active owner/worker and stop; do not steal claims or dispatch duplicates.
Record WORKER_STARTED immediately after spawning; on a crash before recording, inspect existing agents before any redispatch.
Await the worker, record WORKER_FINISHED and release the claim before yielding.
Do not launch another orchestrator or allow workers to delegate.

## Coordinate phases and tasks

Persist events with `event --file /absolute/path/to/event.json`; use Python or a structured file API to write JSON.
Keep event/review artifacts in the returned artifact directory.
Every event needs `run_id` and current `revision`; claimed events also need `owner`.
Use `--help` for event and review-kind names.

### Discovery and supervised prerequisites

1. At DISCOVERY choose one bounded desktop topic from the backlog using the policy priority order.
   Without a topic/backlog, start with authentication/session and route-guard regression coverage.
   Load `jobkaki-discovery` before dispatching the discovery role.
   Prefer native `jobkaki_discovery`; if unavailable, explicitly use a general-agent adapter that loads `.codex/agents/discovery.toml` and the skill.
   Without a separate context, report BLOCKED rather than impersonating a worker.
2. Save REVIEW_READY of kind `findings`, with at most five actionable findings and optional backlog.
   Backlog is cumulative: omission from a later package never resolves an earlier finding.
   Explicitly reobserved actionable findings reopen with current evidence and retain prior resolution/deferral history.
   An empty findings package moves to PHASE_READINESS; it does not complete the pipeline.
3. Present the package and wait. HUMAN_DECISION must cite its ID/digest and actual human reply/source.
   On approval, record the specific `finding_ids` approved; unselected findings remain open.
   Rejection returns to discovery without approving alternative fixes.
4. At TEST_REVIEW_PREPARATION, record TASK_DEFINED with the frozen contract matching those approved findings.
   Set target `frontend` or `backend` as explicitly approved; governance prerequisites require their own named approval too.
   Backend findings use the supervised backend prerequisite mode of `jobkaki-frontend-implementation`, not the frontend contract-preservation mode.

### Workflow setup and desktop pilot task scope

At TASK_PLANNING present REVIEW_READY of kind `task`, containing the proposed frozen `contract`, evidence and scope decision.
Workflow setup accepts only `governance` tasks for approved safeguards/roles/evidence/reporting.
The desktop pilot accepts only one independently reviewable `frontend` task after separate activation.
Human task-scope approval leads to test review preparation; rejection returns to planning.
Transition/activation approval does not approve implementation scope or tests.

A contract contains `id`, `target`, `scope`, nonempty `acceptance_criteria`, `finding_ids`, absolute canonical `checkout`, and full immutable `baseline_head` commit SHA.
Include all additional execution-policy fields: planned scope, protected-path exceptions, test/evidence requirements, environment/data, limits, approval references and publication authority.
Use a clean isolated implementation checkout; preserve pre-existing human work and baseline inventory separately.
Never edit a frozen contract to force a PASS. Stop for a revised human decision if its scope/criteria are wrong.

### Tests, implementation and independent verification

1. Prepare the concrete test review and run unchanged baseline checks in the authorised environment.
   Missing/inadequate tests require a `test_preparation` review and explicit approval.
   Perform only approved test preparation, independently verify tests/baseline, then submit a fresh `tests` review.
   Capture any proposed test-preparation diff before presenting it.
2. At TEST_REVIEW show tests/diffs, covered behaviour, baseline evidence and gaps; await explicit adequacy approval.
   Rejection leads to TEST_PREPARATION_PLAN. Approval leads to READY_FOR_IMPLEMENTATION.
   Changed tests/check configuration require TESTS_CHANGED, approved test-only preparation and renewed review; retry counters persist.
3. Before WORK_STARTED confirm scope, approved tests, protected-path exceptions and actual environment/verification capability.
   Record `readiness_evidence` and `execution_authorisation`; these strings are references, not proof of authentication or isolation.
   During the pilot also verify the separate recorded activation and real safeguard demonstrations.
4. Load `jobkaki-frontend-implementation`, selecting frontend, supervised backend prerequisite or governance mode from the frozen target.
   Dispatch `jobkaki_implementer` (or explicitly recorded adapter) with that mode, contract and approvals.
   Use one writer, preserve criteria, and retain self-check evidence.
5. Capture the complete proposed diff from the task checkout:

   ```sh
   python3 -B .agents/skills/jobkaki-refinement/scripts/state.py capture-diff --owner OWNER_ID
   ```

   This reads committed changes since baseline, staged/unstaged changes and nonignored untracked files.
   It counts all changed files, including tests and deletions; fully reverted paths do not count. Renames count both paths conservatively.
   It records actual paths and a content/mode fingerprint. PATHS_CHANGED and event-supplied DIFF_CAPTURED are unsupported.
   Over 10 files holds review/publication: reduce scope, or propose genuinely independent tasks for human approval. Do not hide files or reset retries.
6. Save VERIFICATION_READY with the captured `candidate`, then load `jobkaki-verification` and dispatch a separate verifier.
   Confirm actual host permissions and evidence/cache locations; a role label supplies no sandbox.
   Record VERIFIED with that candidate, outcome, evidence and specific FAIL finding IDs.
   The CLI re-reads Git at both handoffs; stale snapshots are rejected.
   FAIL permits FIX_STARTED only for those findings within the retry limit; recapture and independently verify the new candidate.
   BLOCKED stops immediately. Backend/design/screenshot discrepancies during the pilot never start an automatic prerequisite.
7. A subsequent captured edit clears prior verification. Obtain another independent result within the existing round limit.
   At FINAL_GATE run `check-candidate` immediately before publication review and apply every policy condition.
   Publish only when separately authorised and the required publication gate is demonstrated; never merge automatically.
   Save COMPLETE with summary/evidence/final-gate evidence, optional PR URL and its separate `publication_authorisation`.
   COMPLETE is a task result, not permission to advance phases.

### Human merge/acceptance and readiness

At MERGE_REVIEW_PREPARATION present a `merge` review identifying the exact candidate, evidence, captured `candidate`, resulting `source_identity` and `disposition`:
`merged` with the matching task PR URL for an observed human-reviewed merge, or `accepted_without_publication` for explicitly authorised local delivery.
Require the actual human acceptance reply; do not treat PR creation, passing tests or a planned merge as acceptance.
Rejection retains the task for a revised review or a blocker report; it grants no additional edits.
Acceptance archives the task, criteria, verification, counters and review evidence, and resolves its named findings.
A prerequisite/setup task then returns to PHASE_READINESS; pilot acceptance completes the pipeline.
Each newly approved task uses fresh baseline/environment evidence reflecting accepted dependencies.

At PHASE_READINESS assess coverage, backlog, contracts/designs and phase exit evidence.
If more work remains, CLAIM and CONTINUE_PHASE to discovery (phase one) or task planning (setup).
Human decisions resolving/defering a backlog item use BACKLOG_DECISION with `finding_id`, `disposition` (`resolved`/`deferred`), boolean `blocking`, rationale, evidence, actual `human_reply` and `source_reference`.
Deferral is never inferred; a deferred blocker still prevents advancement.
An approved prerequisite may resolve its findings only after human merge/acceptance.

When the phase exit conditions hold, submit a `phase_transition` review with `from_phase`, `to_phase`, `exit_evidence` and `deferred_items` (each ID and rationale).
Present resolved prerequisites, checks, deferred nonblocking items, capability limits, risks and the exact question approving entry into the next column.
Only adjacent forward transitions are allowed. Unresolved backlog, an unfinished task or unreviewed setup work prevents this review.
Explicit approval advances the phase; rejection returns to readiness without changing phase.

Entering DESKTOP_PILOT leads to ACTIVATION_PREPARATION, not implementation.
Present a separate `activation` review with `safeguards`, a map of actual evidence lists for:
`restricted_writes`, `readonly_verification`, `protected_paths`, `approval_gate`, `diff_budget`, `retry_gate`, `candidate_integrity`, `browser_harness`, `evidence_storage`, `controlled_publication`.
Include negative tests demonstrating forbidden actions are rejected.
Approval permits pilot task planning only. If the host cannot demonstrate the controls, remain supervised and report the missing prerequisites; do not fabricate activation evidence.

## Review records and limits

All REVIEW_READY packages contain `id`, `topic`, `summary`, and nonempty accessible `evidence` references.
Findings contain stable `id`, `summary`, `evidence` plus all canonical discovery-report fields.
Tests contain `tests`, `baseline`, `checks` (command/integer exit code); expected bug-reproduction failures also need `expected_defect: true` and `defect_reference`.
Test preparation contains `planned_tests`.
Use the helper's canonical SHA-256 with HUMAN_DECISION: `review_id`, `review_sha256`, boolean `approved`, actual `human_reply`, `source_reference`, and `finding_ids` for findings approval.
Repeat triggers re-present pending reviews; they never approve them.

Continue while authorised; at each human gate present the concrete package and wait.
Ambiguous replies require clarification of that saved decision.
This helper is supervised coordination with Git checks, not the host permission boundary, an approval-authentication service or a publishing runner.
Do not claim simulated tests prove a live multi-agent journey or unattended readiness.

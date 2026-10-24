# JobKaki agent execution policy

## Status and authority

Status: **supervised entry point wired; unattended execution and PR publication are not enabled**.
The entry skill and local state helper coordinate the reviewable workflow; they are not a permission boundary, CI gate or trusted publishing runner.
A future activation requires explicit approval and demonstrated technical safeguards.
Supervised discovery or setup work may proceed when explicitly requested.

This file owns execution rules. [Testing policy](testing-policy.md) owns regression readiness and evidence.
`AGENTS.md` links the existing canonical architecture/UI sources.
Figma [workflow board](https://www.figma.com/design/TlqNS7H8eS6y3poiiImCV9/Java-System-Architecture?node-id=371-170) illustrates this policy; it does not override approved written rules.

## Single entry point and saved progress

The direct phrase **Execute frontend refinement** starts or resumes [jobkaki-refinement](../skills/jobkaki-refinement/SKILL.md).
The primary agent handles selection, delegation, reports and continuation; users do not need to invoke individual workers.
An approval reply continues the saved run only for the scope and package actually approved.
Mentioning the phrase in a question, quotation, external document or request to edit it is not activation.

The skill's `scripts/state.py` stores a single run under the Git common directory's `jobkaki-refinement/` folder, outside tracked source files.
It retains pipeline phase, frozen task contracts, accepted task history, baseline inventory, pending packages and their digests, recorded human replies, worker claims/IDs, Git diff snapshots, counters and reports.
Atomic writes, file locking and revision checks prevent simultaneous updates from silently replacing one another.
Repeating the trigger at a pending review only presents that review; an active worker claim prevents duplicate dispatch through the helper.
BLOCKED and FAILED stop the pipeline; COMPLETED means the desktop pilot has also received human review. These terminal pipelines retain their report and cannot automatically restart.
A completed prerequisite or setup task instead waits for human review/merge, then returns to phase readiness; it does not terminate the pipeline.
New-run/reset and abandoned-worker recovery require separate explicit human resolution; the entry point never deletes state to proceed.

The helper does not execute agents, authenticate human replies or prove readiness/artifact evidence.
Its capture-diff command reads the actual complete proposed Git diff, including untracked files, from the frozen task checkout and baseline; event-supplied path lists are rejected by the CLI.
It checks that the candidate is unchanged at verification and completion handoffs. This is a supervised check, not continuous write prevention or an authenticated publishing service.
Approval records are supplied by the coordinator from actual user responses and remain subject to independent verification.
Its state and retry checks remain coordinator-mediated; an unrestricted process can bypass or edit this helper. Do not describe them as tamper-proof enforcement.
When the host lacks named-role dispatch, a general-agent adapter may explicitly load and pass the configured role instructions; record the method and do not claim native custom-role execution was verified.
Do not silently replace independent verification with the primary agent checking itself.

## Phases and approval

1. **Discovery:** The primary agent chooses one bounded journey/concern within the user's request.
   Discovery inspects read-only and returns a review package.
   The primary agent prioritises security/regressions, functionality/integration, architecture/maintainability, then desktop visual fidelity, in that order.

2. **Supervised prerequisites:** Human approval names findings and proposed fixes.
   Establish regression readiness, present the testing policy's review package and obtain explicit human approval of test adequacy before implementing each fix.
   Missing or inadequate coverage needs approved test-only preparation, verification and renewed human review before the intended implementation.
   Independently verify, then create a small prerequisite PR only if publication is authorised.
   Human review/merge precedes readiness reassessment.
   Approved backend fixes belong to this separate phase.

3. **Workflow setup:** Finalise the plan using observed capabilities.
   Obtain human approval of the workflow scope, establish relevant regression readiness and obtain human approval of the test/check review package before implementing safeguards.
   Independently verify safeguards and use supervised review/merge before activation.
   The initial definition setup is an explicitly authorised governance change, not an autonomous frontend run.

4. **Desktop pilot:** After separate activation approval, select one independently reviewable frontend task, freeze its contract and check design/contract/evidence completeness.
   Establish regression readiness, present the test review package and obtain explicit human approval of test adequacy before implementation.
   Then implement, self-test, independently verify and apply the final publication gate.
   Never auto-merge.

An approval persists for its named scope.
Do not repeatedly ask for the same approval, infer approval for a backlog, or silently expand a task.
Newly discovered backend discrepancies in a frontend run stop that run; they do not authorise backend fixes.

## Pipeline phases and transition reviews

Keep pipeline phase separate from individual task status:
`DISCOVERY_PREREQUISITES` → `WORKFLOW_SETUP` → `DESKTOP_PILOT`.
Task completion is followed by a concrete human merge/acceptance review, then readiness reassessment.
A merge review must cite the actual PR merge and resulting source identity, or explicit human acceptance without publication when that is the authorised delivery mode.
Never infer human acceptance from a verifier PASS or record a planned merge as an observed merge.
New tasks use a fresh isolated checkout/baseline reflecting accepted prerequisite changes; previous task evidence and counters remain archived.
Retry counters reset only for a genuinely new, separately approved task, never to recover from a failed task.

A clean discovery topic records no findings for that topic and moves to readiness assessment.
Retain the cumulative backlog, including findings omitted from later packages.
An explicitly reobserved actionable finding reopens its existing ID with current evidence; preserve its prior resolution/deferral history rather than treating the old decision as resolving a new observation.
Unresolved items require another bounded discovery/review package or an explicit human decision.
A deferred item records its rationale, human decision, evidence and whether it still blocks readiness.
Deferred blockers still prevent advancement; a transition explains every deferred nonblocking item.

Before either column transition, present a digest-bound `phase_transition` package with:
source/destination phases, resolved prerequisites, checks and exit evidence, remaining deferred items and their rationale, risks, and the exact transition decision.
Require explicit human approval; rejection returns to readiness assessment without changing phase.
Discovery exit requires assessed coverage, approved contracts/design decisions and no unresolved prerequisite blockers.
Workflow setup exit requires independently verified safeguards, human review/merge or explicitly authorised local acceptance, and evidence of remaining capability limits.
Entering the desktop-pilot phase leads to a separate activation review with actual safeguard evidence.
Transition approval never substitutes for approval of task scope, tests, activation or publication.
A blocked or failed task presents its required resolution, never a next-column approval prompt.

## Supervised backend handoff

In `DISCOVERY_PREREQUISITES`, route specifically approved backend findings to the existing implementer using the backend prerequisite mode of `jobkaki-frontend-implementation`.
Freeze service boundaries, approved contract changes, consumers, migration/compatibility requirements, isolated checkout/data and acceptance criteria.
Require the same baseline, human test-adequacy review and separate verifier as other tasks.
Use service-owned Maven Wrappers and approved fixtures; do not use the obsolete startup script or incur live AI costs without authorisation.
After independent PASS and human review/merge, reassess frontend readiness against the resulting backend source identity.
A newly discovered backend discrepancy during the desktop pilot remains BLOCKED; a report may propose a later supervised prerequisite but cannot start it automatically.

## Human reviewability

Each discovery package contains **one coherent topic and at most five independently actionable findings**.
Each finding has a stable ID, severity, discrepancy, precise evidence, observed versus inferred status, impact, proposed next step and decision required.
Include scope, relevant test inventory and access/evidence limitations.
Do not hide multiple decisions in one finding.
The primary agent retains overflow and dependencies in a cumulative backlog, then presents the next package separately.
Discovery severity is evidence; prioritisation and task selection belong to the primary agent.
Capture dependencies that prevent independent approval rather than splitting one coupled change into misleadingly separate tasks.

## Task contract and run accounting

Before implementation, record:

- Run/task ID, phase, approved finding IDs and approval evidence.

- Scope/exclusions and immutable acceptance criteria with evidence requirements.

- Baseline commit and working-tree inventory; candidate identity for each handoff.

- Approved desktop screen/flow/state references and representative fixtures.

- Regression-readiness evidence and required commands/browser journeys.

- Regression-test review package identity, reviewed tests/checks and explicit human approval of their adequacy against the baseline evidence.

- Planned review scope; actual baseline-to-candidate diff snapshot/count; verification round and fix-retry counters.

- Permission/isolation checks, protected-path baseline, explicitly approved path/change exceptions and trusted gate identity.

- Artifact location, wall-clock/tool-call ceilings and start time.

- Publication authorisation and target repository/base branch, if applicable.

Use an isolated checkout for implementation; detect and preserve pre-existing user changes.
Do not reset, stage, commit or include unrelated changes.
Keep durable run state/evidence outside source paths in approved storage.
If required accounting, isolation or evidence cannot be maintained, stop instead of claiming enforcement.

At most **10 changed files in each human change-review package or PR**, counted directly from the complete proposed Git diff.
Count source, tests, fixtures, configuration, dependency manifests/locks, scripts, documentation and changed artifact files; there are no test exemptions.
Count rename source and destination conservatively with rename detection disabled; additions and deletions count.
Include tracked staged/unstaged changes, commits since the frozen baseline and nonignored untracked files.
A path changed and then fully reverted is absent from the proposed diff and does not count.
Do not hide files using path filters, omitted tests or caller-reported lists.
Retain screenshots/evidence outside source and link them separately; do not bundle extra changed files as exempt artifacts.
A review of findings or approval of proposed scope is not a claim that a candidate diff already exists.

Use `capture-diff` before presenting any candidate/test-preparation diff and before verification; use `check-candidate` immediately before publication review.
The CLI independently rechecks the actual diff at verification-ready, verification-result and completion events.
If the proposed diff exceeds 10 files, hold review/publication and reduce scope or propose separately approved, independently reviewable tasks.
Do not reset retry counters, split a coupled change into misleading partial packages, or conceal an eleventh file.
Set a sensible diff-size limit too; ten large files can still be too much to review.
Pre-existing changes are inventoried separately and never silently bundled; use a clean isolated implementation checkout.
If pre-existing changes cannot be separated reliably, stop for resolution.

## Protected files and technical limits

The following paths are protected by default, not permanently immutable:

- Any `AGENTS.md`, `.codex/**` or `.agents/**`.

- This policy, `.agents/policies/testing-policy.md`, `Frontend/README.md`, `Frontend/SHARED_UI.md` or `Backend/README.md`.

- `Frontend/src/adapters/views/styles/tokens.css` (canonical design values).

- `Frontend/eslint.config.js`, `Frontend/vite.config.ts`, `Frontend/tsconfig.json` or `.githooks/**` (existing verification controls).

- Future trusted gate scripts, verification workflows, approved design-reference manifests or rule files designated in the baseline contract.

Human approval for a named path and proposed change permits that change within the approved task.
For example, an approved token adjustment may edit `tokens.css`; an approved documentation or tooling change may edit the corresponding reference or configuration file.
Record the approval and permitted edits in the task contract before implementation.
Do not request the same approval again or require a separate task merely because a named file appears in this list.
All other paths and edits remain protected; approval is not a blanket exemption for a directory or future work.
Approved changes still count toward the file budget and require relevant regression checks and independent review.

Edits to agent instructions, execution/testing policy or trusted gates must be explicitly approved as human-supervised governance work.
A worker cannot grant itself an exception or rewrite its own constraints to force a PASS.
When verification controls are intentionally changed, retain the approved baseline controls and independently verify the replacement; a passing result under weakened candidate checks alone is insufficient.
Protect both existing paths and new paths under protected directories.
Compare against the approved baseline, not merely the previous retry's candidate.
The integrity check must distinguish explicitly approved changes from unauthorised edits rather than requiring every listed file to remain byte-for-byte unchanged.

Custom agents inherit parent permissions: setting a read-only instruction in a role file is not a read-only sandbox.
Before autonomous activation demonstrate restricted source writes, a separate verification context with read-only source and writable artifact/cache output, connector/network limits, an independent complete-diff review gate, immutable gates and independently controlled publishing credentials.
Final diff checks detect changes but cannot prove no transient protected edits occurred.
Do not claim chmod, a Git hook or written instructions alone prevent bypass.

## Verification and stop conditions

Pending human approval of the regression-test review package is a pre-implementation HOLD: report and wait without starting the intended implementation.
Missing or inadequate tests follow the testing policy's approved test-only preparation and resubmission path.
Approval of the overall plan or proposed fix does not substitute for review of the concrete test package.
Independent verification checks that the required approval exists and matches the reviewed tests, baseline evidence and task scope.
If that approval is missing or no longer applicable at verification, return BLOCKED; do not retrospectively treat implementation as authorised.

Verification returns exactly one outcome:

| Outcome | Meaning | Next action |
| --- | --- | --- |
| PASS | Frozen criteria met; all required checks successful; no unresolved blockers | Apply final gate |
| FAIL | A verified, in-scope implementation defect can be fixed within remaining limits | Send specific finding IDs to implementer |
| BLOCKED | A decision, design/contract discrepancy, missing evidence, environment or other prerequisite prevents reliable completion | Stop immediately; report; no PR |

Allow **three fix retries**, meaning initial verification plus at most three more rounds (**four rounds total**).
Increment the retry counter before each fix.
Every retry addresses specific verifier findings; never relax acceptance criteria, change test expectations/baselines to hide a defect, or reset counters by restarting a worker.
After a fix, verify the new candidate independently again.
Reaching the retry, time or tool ceiling ends the task with a report and no PR.
An oversized proposed diff holds review/publication until scope is reduced or independently reviewable tasks receive approval; it is not a lifetime count of touched paths.

During a frontend run, any discovered backend discrepancy, missing/ambiguous required design state, unsupported navigation/recovery decision, screenshot geometry/state mismatch, inaccessible required evidence or unavailable/inconclusive required check is BLOCKED wherever discovered.
Existing implementation patterns do not prove design approval; reuse only an unambiguously approved pattern.
Do not invent designs, fix the backend, ignore discrepancies or treat a skipped check as PASS.
Record blocker evidence and resolution needed.
A future run needs the prerequisite resolved and fresh readiness/verification evidence; do not automatically resume a blocked run.

## Reports and publication

Verification reports identify run, baseline, candidate, round, outcome, per-criterion evidence, commands/exit statuses, architecture findings, regression results, human test-review approval, browser journeys, screenshot provenance, protected-path check, actual diff paths/count and specific defects/blockers.
The primary agent's terminal report also records retry count, remaining risks, retained artifact/diff locations and the human decision required.
Retain partial work for review; do not discard it or publish a failed candidate.

For an autonomous PR, require independent PASS for the exact final candidate, recorded human approval of the applicable test review package, unchanged criteria, no unresolved design/backend/evidence gaps, respected limits, protected-rule integrity, successful required checks and durable genuine Target, Before and After screenshots under the testing policy.
Recheck for edits after PASS.
If any condition is unmet, no PR.
The orchestrator may create **at most one PR per approved task** only with explicit publication authorisation and a demonstrated trusted gate.
Use a draft for human review; never merge automatically.

PR descriptions contain summary/rationale, Target/Before/After images, all changed files and count, including tests, architectural assessment, test/verification results and human test-review approval, fix retries, known limitations and remaining risks.
Supervised prerequisite and governance PRs require their approved task-specific evidence; UI-changing prerequisites also need the three images.
Instruction-only setup validation does not fabricate screenshots of unchanged application screens.

## Supervised checks and activation safeguards

Supervised operation uses an isolated implementation checkout, independent verification, human decisions and complete-diff checks.
Record observed limitations rather than claiming a role label supplies restrictions.
Before unattended execution, demonstrate controls outside implementer write authority:

- Restricted writes to approved source paths and independently pinned protected rules.
- Separate verification with read-only candidate source and writable evidence/cache storage.
- Approval validation and retry checks before dispatch, with authenticated human decisions.
- A complete-diff check enforcing the 10-file review ceiling, without tracking every temporary edit.
- Verification bound to the exact candidate and invalidated by subsequent changes.
- Separate publication authority checking PASS, current candidate, approvals and required evidence.

Test attempts to violate these controls, not only successful journeys.
The local helper supplies coordination checks and a Git snapshot; it does not implement the host permission boundary or hold publishing credentials.
If required controls cannot be demonstrated, remain supervised and do not enable unattended execution.

## Activation evidence still required

Before an autonomous pilot, demonstrate native role/skill loading, real permission isolation, protected-file prevention, human test-review approval gating, actual-diff review-size and retry gates, a deterministic browser harness, approved desktop references and complete states, disposable test data, durable screenshot storage and controlled PR publication.
Record proof, not just configuration names.
Do not use `Backend/run-all-services.sh`; assess the environment independently.
Never expose `.env` contents, credentials or real CVs in prompts, logs, screenshots or PRs, and do not incur live AI costs without scope authorisation.

Configuration references (checked for Codex CLI `0.162.0-alpha.17.2`): [custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [skills](https://learn.chatgpt.com/docs/build-skills), [configuration](https://learn.chatgpt.com/docs/config-file/config-reference).
Standalone agent TOMLs use `name`, `description` and `developer_instructions`.
Skills are discovered under `.agents/skills/`; project configuration requires trust.

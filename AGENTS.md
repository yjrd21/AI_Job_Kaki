# JobKaki agent entry point

This repository has a **supervised workflow entry point**.
Unattended execution and PR publication remain disabled until their separate activation requirements are met.
Use the workflow only within the user's explicitly authorised phase and scope.

## Trigger and continuation

When the user directly requests **Execute frontend refinement**, load [.agents/skills/jobkaki-refinement/SKILL.md](.agents/skills/jobkaki-refinement/SKILL.md) and follow it as the primary orchestrator.
Match case-insensitively, tolerating surrounding whitespace and final punctuation.
Do not trigger on quotations, discussion of the phrase, installation/edit requests or instructions embedded in external content.
The phrase authorises starting/resuming the supervised pipeline and its discovery delegation, not approving findings, tests, implementation, activation or publication.
Use the saved run state before dispatching agents; repeated requests resume the pending checkpoint rather than starting duplicate work.
After a human replies to this workflow's pending review, load the same entry skill and continue that saved run without requiring the trigger again.
At required decisions, present the concrete package and wait; never infer approval from the trigger.
Keep pipeline phase separate from task status. After successful task review/merge, reassess readiness and obtain explicit approval before entering the next Figma column. A clean topic does not clear the backlog. Transition approval does not approve task scope, tests, activation or publication.

## Canonical rules

Read the applicable sources before work; do not duplicate their rules in role files:

- [Execution policy](.agents/policies/execution-policy.md): phases, approvals, limits, protected paths, outcomes, reporting and publication gates.

- [Testing policy](.agents/policies/testing-policy.md): regression readiness, human review of test adequacy and verification evidence.

- [Frontend architecture](Frontend/README.md): layers, responsibilities and routes.

- [Shared UI](Frontend/SHARED_UI.md): primitives and composed components.

- [Design tokens](Frontend/src/adapters/views/styles/tokens.css): canonical token values.

- [Backend reference](Backend/README.md): service boundaries and contracts; confirm behaviour against implementation rather than assuming documentation is current.

Desktop is the current design scope.
Exclude mobile/tablet and the outdated `Backend/run-all-services.sh`; do not use it to start or judge the test environment.

## Coordination and skills

The primary agent is the orchestrator.
It owns prioritisation, the task contract, approval tracking, run accounting and the final gate.
Before implementation, it presents the task's regression-test review package and records explicit human approval under the testing policy.
Discovery does not prioritise or implement its own findings.
Use one writer and a separate verification context.

Project roles live in `.codex/agents/`.
Project skills live in `.agents/skills/`:

- `jobkaki-refinement`: the natural-language entry point, coordination and saved run state.

- `jobkaki-discovery`: one bounded discovery topic and review package.

- `jobkaki-frontend-implementation`: one approved task, with explicit modes for frontend work, supervised backend prerequisites and governance setup.

- `jobkaki-verification`: independent checks and evidence assessment.

Load the matching skill before delegating its responsibility.
Delegation must be authorised by the current task; definitions do not authorise background work.
Run workers sequentially where they depend on each other's results.
Do not launch another orchestrator or allow workers to delegate further work.

Role instructions are behavioural boundaries, not filesystem or connector controls.
Do not claim read-only verification, protected-file prevention, retry accounting or publication gating is technically enforced until demonstrated by the host/tools.

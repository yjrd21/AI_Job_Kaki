---
name: jobkaki-discovery
description: Inspect one bounded JobKaki desktop journey or concern and prepare a small evidence-backed discovery review package before implementation planning.
---

# JobKaki discovery

Read [AGENTS.md](../../../AGENTS.md), the [execution policy](../../policies/execution-policy.md) and [testing policy](../../policies/testing-policy.md).
The execution policy owns all numeric limits, approval boundaries and report fields.

## Inspect the assigned topic

- Trace the real path from React page and hook through controller, use case, presenter and repository to the affected backend controller/DTO/service.

- Compare boundaries with `Frontend/README.md` and the existing ESLint rule.
  Do not assume a feature-folder architecture or redesign thin use cases.

- Inventory relevant regression tests and describe what each proves.
  Reading a test is not evidence that it passed; avoid cache/report-generating execution in a strictly read-only discovery assignment.

- For design work, use the available Figma integration and its prerequisite skills.
  Inspect the current desktop board and prototype reactions, not architecture diagrams or reference-board labels alone.
  Record node IDs, dimensions, state and approval evidence.
  Report inaccessible information without inventing designs.

- Identify backend mismatches, missing states, ambiguous transitions, dependencies, screenshot geometry discrepancies and environment limitations within this topic.
  In discovery these are findings for triage, not permission to fix them.

## Return a review package

Use the execution policy's discovery format.
Keep distinct decisions distinct; do not bundle many independent defects into one finding to evade the review limit.
Link supporting file paths/symbols and Figma nodes; distinguish observed behaviour, static inference and unverified assumptions.
Report severity without ranking or choosing implementation tasks.
Return overflow/dependencies to the primary agent for a cumulative backlog rather than opening additional review packages yourself.

Discovery never changes code, tests, Figma, repository state or external records.

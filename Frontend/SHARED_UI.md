# JobKaki shared UI foundation

Components have two responsibilities: foundational UI primitives and reusable composed building blocks. Existing CSS classes remain supported.

## Primitives

Import from `src/adapters/views/components/primitives`:

- `Button`: primary, outline and quiet variants
- `Card`: semantic panel with existing `.card` styling
- `Badge`: neutral, success, warning and danger tones
- `FormField`: accessible label, hint, errors and generated field IDs
- `Modal`: native dialog surface with accessible title and close handling
- `StepProgress`: workflow progress indicator
- `Skeleton`: loading placeholder
- `Alert`: informational, success and danger notices

## Composed building blocks

Import from `src/adapters/views/components/composed`:

- `AppShell`: shared navigation, account controls, header and routed page frame
- `ConfirmDialog`: combines a modal and buttons with optional typed confirmation
- `PageHeader`: combines page title, supporting text and optional actions
- `Loading`, `ErrorNotice`, `EmptyState`: reusable state-feedback compositions
- `StatusBadge`: displays application job and requirement statuses
- `OnboardingGate`: combines onboarding checks, feedback and route access handling
- `RecentAnalysisCard`: combines submission information, state feedback and navigation

Primitives provide foundational controls and surfaces. Composed components combine these foundations with layout, interaction, or application-specific view behavior. Every component belongs to one of these two groups. Component generation aliases in `components.json` point to the corresponding directories.

## Tokens

`src/adapters/views/styles/tokens.css` is the canonical design-token source. Tailwind semantic colours reference CSS variables; don't introduce new hard-coded hex values in application screens. Global legacy selectors are retained and now consume tokens.

## Example

```tsx
<FormField label="Target role" required error={errors.role?.message}>
  {({ id, describedBy, invalid }) => (
    <input
      id={id}
      className="field"
      aria-describedby={describedBy}
      aria-invalid={invalid}
      {...register("role")}
    />
  )}
</FormField>
```

## Scope

This PR deliberately introduces primitives and semantic tokens **without** rewriting the dashboard, onboarding, job-analysis, profile or account journeys. Those migrations should follow in separate PRs.

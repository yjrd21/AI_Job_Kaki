# JobKaki shared UI foundation

Use these primitives for new or migrated screens; existing CSS classes remain supported to avoid a big-bang migration.

## Components

Import from `src/components/ui`:
- `Button`: existing primary, outline and quiet variants
- `Card`: semantic panel with existing `.card` styling
- `Badge`: neutral, success, warning, danger tones
- `FormField`: accessible label, hint, errors, generated field IDs
- `PageHeader`: eyebrow, title, description and action
- `Modal`: native `<dialog>` with focus handling, Escape and backdrop
- `ConfirmDialog`: reusable confirmation with optional typed phrase; the caller owns API errors and closes only after success
- `StepProgress`: flow progress indicator
- `Skeleton`: loading placeholder
- `Alert`: info, success and danger notices

## Tokens

`src/styles/tokens.css` is the canonical design-token source. Tailwind semantic colours reference CSS variables; don't introduce new hard-coded hex values in feature screens. Global legacy selectors are retained and now consume tokens.

## Example

```tsx
<FormField label="Target role" required error={errors.role?.message}>
  {({ id, describedBy, invalid }) => (
    <input id={id} className="field" aria-describedby={describedBy}
      aria-invalid={invalid} {...register("role")} />
  )}
</FormField>
```

## Scope

This PR deliberately introduces primitives and semantic tokens **without** rewriting the dashboard, onboarding, job-analysis, profile or account journeys. Those migrations should follow in separate PRs.

import type { ReactNode } from "react";
import { useId } from "react";

type Props = {
  label: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
};

export function FormField({ label, children, hint, error, required, id, className = "" }: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label className="field-label" htmlFor={fieldId}>
        {label}{required && <span aria-hidden="true" className="text-rust"> *</span>}
      </label>
      {children({ id: fieldId, describedBy, invalid: Boolean(error) })}
      {hint && <p id={hintId} className="ui-field-hint">{hint}</p>}
      {error && <p id={errorId} role="alert" className="ui-field-error">{error}</p>}
    </div>
  );
}

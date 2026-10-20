import type { ReactNode } from "react";
import { useId } from "react";

// Describe a labelled input with optional help text, errors, and a render callback.
type Props = {
  label: string;
  children: (ids: {
    id: string;
    describedBy?: string;
    invalid: boolean;
  }) => ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
};

// Connect an input to its label, help text, and validation error through accessible identifiers.
export function FormField({
  label,
  children,
  hint,
  error,
  required,
  id,
  className = "",
}: Props) {
  // Generate a stable input identifier when the caller does not supply one.
  const generatedId = useId();

  // Prefer the caller's input identifier over the generated fallback.
  const fieldId = id ?? generatedId;

  // Assign an identifier to help text when it is present.
  const hintId = hint ? `${fieldId}-hint` : undefined;

  // Assign an identifier to the validation error when it is present.
  const errorId = error ? `${fieldId}-error` : undefined;

  // Link the input to the help text and error descriptions that are rendered.
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label className="field-label" htmlFor={fieldId}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-rust">
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id: fieldId, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="ui-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="ui-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

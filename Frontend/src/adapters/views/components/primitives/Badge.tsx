import type { HTMLAttributes } from "react";

// Define the semantic colour treatments supported by badges.
export type BadgeTone = "neutral" | "success" | "warning" | "danger";

// Combine standard span attributes with an optional badge tone.
type Props = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

// Display compact status content with a consistent semantic style.
export function Badge({ tone = "neutral", className = "", ...props }: Props) {
  return (
    <span
      className={`ui-badge ui-badge--${tone} ${className}`.trim()}
      {...props}
    />
  );
}

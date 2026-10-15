import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";
type Props = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

export function Badge({ tone = "neutral", className = "", ...props }: Props) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`.trim()} {...props} />;
}

import type { HTMLAttributes } from "react";

// Display a decorative loading placeholder using the shared skeleton style.
export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      {...props}
    />
  );
}

import type { HTMLAttributes } from "react";

// Wrap content in the shared card surface while accepting standard container attributes.
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={`card ${className}`.trim()} {...props} />;
}

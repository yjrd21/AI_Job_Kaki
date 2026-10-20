import type { ButtonHTMLAttributes, ReactNode } from "react";

// Combine standard button attributes with the supported visual variants.
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "quiet";
  children: ReactNode;
};

// Render a shared button while preserving native button attributes and handlers.
export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

// Define the semantic severity styles supported by alerts.
type Tone = "info" | "success" | "danger";

// Describe alert content, severity, and standard container attributes.
type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  title?: string;
  children: ReactNode;
};

// Display a semantic notice with a severity icon and optional title.
export function Alert({
  tone = "info",
  title,
  children,
  className = "",
  ...props
}: Props) {
  // Choose the icon associated with the alert severity.
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "danger" ? AlertCircle : Info;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`ui-alert ui-alert--${tone} ${className}`.trim()}
      {...props}
    >
      <Icon size={19} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
type Tone = "info" | "success" | "danger";
type Props = HTMLAttributes<HTMLDivElement> & { tone?: Tone; title?: string; children: ReactNode };
export function Alert({ tone = "info", title, children, className = "", ...props }: Props) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? AlertCircle : Info;
  return <div role={tone === "danger" ? "alert" : "status"} className={`ui-alert ui-alert--${tone} ${className}`.trim()} {...props}>
    <Icon size={19} aria-hidden="true" />
    <div>{title && <strong>{title}</strong>}<div>{children}</div></div>
  </div>;
}

import type { ReactNode } from "react";

// Describe a page heading with optional context, description, and actions.
type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

// Render a consistent page title and its supporting content.
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: Props) {
  return (
    <header className={`ui-page-header ${className}`.trim()}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display-title">{title}</h1>
        {description && (
          <p className="muted ui-page-description">{description}</p>
        )}
      </div>
      {action && <div className="ui-page-action">{action}</div>}
    </header>
  );
}

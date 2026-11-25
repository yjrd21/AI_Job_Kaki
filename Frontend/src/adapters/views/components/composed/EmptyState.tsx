import type { ReactNode } from "react";

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="card text-center px-6 py-12">
      <p className="font-semibold text-lg mb-2">{title}</p>
      <p className="muted text-sm mb-5">{detail}</p>
      {action}
    </div>
  );
}

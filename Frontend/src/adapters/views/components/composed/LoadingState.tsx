import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-12 text-sm muted">
      <LoaderCircle size={19} className="animate-spin" />
      {label}
    </div>
  );
}

import { AlertCircle } from "lucide-react";
import { Button } from "../primitives/Button";

export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="card p-5 flex items-start gap-3 text-sm">
      <AlertCircle size={20} className="text-rust shrink-0" />
      <div>
        <p className="font-semibold mb-1">Something went wrong</p>
        <p className="muted mb-3">
          {error instanceof Error ? error.message : String(error)}
        </p>
        {retry && (
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

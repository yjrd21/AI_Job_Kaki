import type {
  JobStatus,
  RequirementMatchStatus,
} from "../../../../domain/models/Job";

// Display a submission or requirement status with its matching visual style.
export function StatusBadge({
  status,
}: {
  status: JobStatus | RequirementMatchStatus;
}) {
  return (
    <span className={`status ${status}`}>{status.replaceAll("_", " ")}</span>
  );
}

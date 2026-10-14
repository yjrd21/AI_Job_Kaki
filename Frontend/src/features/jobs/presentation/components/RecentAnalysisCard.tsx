import { Link } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { Loading, ErrorNotice } from "../../../../components/feedback/Feedback";
import { formatDate } from "../../../../utils/dateUtils";
import type { JobSubmission } from "../../domain/models/Job";
import { StatusBadge } from "./JobStatusBadge";

type JobsQuery = Pick<
  UseQueryResult<JobSubmission[]>,
  "isPending" | "isError" | "error" | "data" | "refetch"
>;

// The backend does not guarantee ordering, so pick the newest without mutating the cached array.
function latestJob(jobs: JobSubmission[]) {
  return jobs.reduce((latest, job) =>
    new Date(job.createdAt).getTime() > new Date(latest.createdAt).getTime()
      ? job
      : latest,
  );
}

// Renders the dashboard's Recent Analysis card for exactly one of: loading, error, empty or success.
export function RecentAnalysisCard({ jobs }: { jobs: JobsQuery }) {
  return (
    <div className="card p-7">
      <p className="eyebrow mb-5">RECENT ANALYSIS</p>
      <Content jobs={jobs} />
    </div>
  );
}

function Content({ jobs }: { jobs: JobsQuery }) {
  if (jobs.isPending) return <Loading />;

  if (jobs.isError) {
    return <ErrorNotice error={jobs.error} retry={() => void jobs.refetch()} />;
  }

  const list = jobs.data ?? [];
  if (!list.length) {
    return (
      <>
        <p className="muted text-sm mb-4">
          Your first analysis will appear here.
        </p>
        <Link to="/analyse" className="link-text text-sm">
          Analyse a job →
        </Link>
      </>
    );
  }

  const job = latestJob(list);
  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold">
          {job.submissionType === "TEXT"
            ? "Submitted job description"
            : "Submitted job URL"}
        </h2>
        <StatusBadge status={job.status} />
      </div>
      <p className="text-xs muted mb-4">{formatDate(job.createdAt)}</p>
      <Link to={`/jobs/${job.id}`} className="link-text text-sm">
        View analysis →
      </Link>
    </>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, Search, Trash2 } from "lucide-react";
import { useJobHistory } from "../../hooks/useJobs";
import { StatusBadge } from "../components/composed/JobStatusBadge";
import {
  EmptyState,
  ErrorNotice,
  Loading,
} from "../components/composed/Feedback";

// Display searchable job history with links and deletion actions.
export function JobHistoryPage() {
  // Bind history search and deletion events supplied by the job hook.
  const { jobs, del, search, onSearchChange, filtered, onDelete } =
    useJobHistory();

  return (
    <div>
      <p className="eyebrow mb-4">YOUR JOURNEY</p>
      <div className="flex flex-wrap gap-6 justify-between items-end mb-10">
        <div>
          <h1 className="display-title mb-3">Job history</h1>
          <p className="muted max-w-xl">
            All the opportunities you've taken time to consider, in one place.
          </p>
        </div>
        <Link to="/analyse" className="btn btn-primary">
          New analysis <ArrowRight size={17} />
        </Link>
      </div>
      <div className="card p-5 sm:p-8">
        <label className="field-label" htmlFor="search">
          Search analyses
        </label>
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-3.5 muted" />
          <input
            id="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="field pl-11"
            placeholder="Search by posting, status or ID"
          />
        </div>
        {jobs.isLoading ? (
          <Loading />
        ) : jobs.isError ? (
          <ErrorNotice error={jobs.error} retry={() => void jobs.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matching analyses" : "Your history starts here"}
            detail={
              search
                ? "Try a different search."
                : "Analyse your first job to see it here."
            }
            action={
              !search ? (
                <Link to="/analyse" className="btn btn-primary">
                  Analyse a job
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div>
            {filtered.map((job) => (
              <div
                key={job.id}
                className="entry-row flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <Link to={job.presentation.href} className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-2 text-[15px]">
                    {job.presentation.summary}
                  </h3>
                  <div className="flex flex-wrap gap-3 items-center text-xs muted">
                    <span>{job.presentation.submittedAt}</span>
                    <span>·</span>
                    <span>{job.presentation.submissionLabel}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <StatusBadge status={job.status} />
                  <button
                    title="Delete submission"
                    aria-label="Delete submission"
                    className="text-[#9a6458] p-2 hover:bg-red-50 rounded"
                    disabled={del.isPending}
                    onClick={() => onDelete(job.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                  <Link
                    to={job.presentation.href}
                    className="btn btn-outline !px-3 !min-h-9"
                  >
                    View <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {del.isError && (
        <div className="mt-4">
          <ErrorNotice error={del.error} />
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Trash2 } from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import { StatusBadge } from "../components/composed/JobStatusBadge";
import {
  EmptyState,
  ErrorNotice,
  Loading,
} from "../components/composed/Feedback";
import type { HistoryController } from "../../controllers/HistoryController";
import { HistoryPresenter } from "../../presenters/HistoryPresenter";

// Display searchable job history with links and deletion actions.
export function HistoryPage({
  historyController,
}: {
  historyController: HistoryController;
}) {
  const userId = useAuthContext().session.userId;
  const [presenter] = useState(() => new HistoryPresenter());
  const view = useSyncExternalStore(presenter.subscribe, presenter.getSnapshot);
  const loadJobs = useCallback(
    () => void historyController.loadJobs(userId, presenter),
    [historyController, presenter, userId],
  );

  // The protected route remounts when the authenticated user changes.
  useEffect(() => {
    loadJobs();
    return () => presenter.cancelRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Load once per page mount.
  }, []);

  const onDelete = (id: string) => {
    if (
      window.confirm(
        "Delete this job submission? The analysis may remain stored by the AI service.",
      )
    ) {
      void historyController.deleteJob(userId, id, presenter);
    }
  };

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
            value={view.search}
            onChange={(e) => presenter.presentSearch(e.target.value)}
            className="field pl-11"
            placeholder="Search by posting, status or ID"
          />
        </div>
        {view.jobs.status === "loading" ? (
          <Loading />
        ) : view.jobs.status === "error" ? (
          <ErrorNotice error={view.jobs.error} retry={loadJobs} />
        ) : view.filteredJobs.length === 0 ? (
          <EmptyState
            title={
              view.search ? "No matching analyses" : "Your history starts here"
            }
            detail={
              view.search
                ? "Try a different search."
                : "Analyse your first job to see it here."
            }
            action={
              !view.search ? (
                <Link to="/analyse" className="btn btn-primary">
                  Analyse a job
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div>
            {view.filteredJobs.map((job) => (
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
                    disabled={view.deleting}
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
      {view.deleteError !== null && (
        <div className="mt-4">
          <ErrorNotice error={view.deleteError} />
        </div>
      )}
    </div>
  );
}

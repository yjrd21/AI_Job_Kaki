import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Trash2 } from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import { ConfirmationDialog } from "../components/composed/ConfirmationDialog";
import { PageHeader } from "../components/composed/PageHeader";
import { Card } from "../components/primitives/Card";
import { Badge, type BadgeTone } from "../components/primitives/Badge";
import { EmptyState } from "../components/composed/EmptyState";
import { ErrorState } from "../components/composed/ErrorState";
import { LoadingState } from "../components/composed/LoadingState";
import type { JobStatus } from "../../../domain/models/Job";
import type { HistoryController } from "../../controllers/HistoryController";
import { HistoryPresenter } from "../../presenters/HistoryPresenter";

const statusToneByStatus: Record<JobStatus, BadgeTone> = {
  PENDING: "neutral",
  PROCESSING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
};

// Display searchable job history with links and deletion actions.
export function HistoryPage({
  historyController,
}: {
  historyController: HistoryController;
}) {
  const userId = useAuthContext().session.userId;
  const [presenter] = useState(() => new HistoryPresenter());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
    setDeleteTarget(id);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await historyController.deleteJob(userId, deleteTarget, presenter);
    setDeleteTarget(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="YOUR JOURNEY"
        title="Job history"
        description="All the opportunities you've taken time to consider, in one place."
        action={
          <Link to="/analyse" className="btn btn-primary">
            New analysis <ArrowRight size={17} />
          </Link>
        }
      />
      <Card className="p-5 sm:p-8">
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
          <LoadingState />
        ) : view.jobs.status === "error" ? (
          <ErrorState error={view.jobs.error} retry={loadJobs} />
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
                  <Badge tone={statusToneByStatus[job.status]}>
                    {job.status.replaceAll("_", " ")}
                  </Badge>
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
      </Card>
      {view.deleteError !== null && (
        <div className="mt-4">
          <ErrorState error={view.deleteError} />
        </div>
      )}
      <ConfirmationDialog
        open={deleteTarget !== null}
        title="Delete this job submission?"
        description="The analysis may remain stored by the AI service."
        confirmLabel="Delete"
        pending={view.deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

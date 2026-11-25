import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Info,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import { LoadingState } from "../components/composed/LoadingState";
import { ErrorState } from "../components/composed/ErrorState";
import { ConfirmationDialog } from "../components/composed/ConfirmationDialog";
import { PageHeader } from "../components/composed/PageHeader";
import { Button } from "../components/primitives/Button";
import { Badge, type BadgeTone } from "../components/primitives/Badge";
import type {
  JobStatus,
  RequirementMatchStatus,
} from "../../../domain/models/Job";
import type { ResultController } from "../../controllers/ResultController";
import { ResultPresenter } from "../../presenters/ResultPresenter";

const statusToneByStatus: Record<
  JobStatus | RequirementMatchStatus,
  BadgeTone
> = {
  PENDING: "neutral",
  PROCESSING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
  MET: "success",
  PARTIALLY_MET: "warning",
  NOT_MET: "danger",
  UNKNOWN: "neutral",
};

// Display submission progress, recovery guidance, or the completed analysis report.
export function ResultPage({
  resultController,
}: {
  resultController: ResultController;
}) {
  const { jobId = "" } = useParams();
  const userId = useAuthContext().session.userId;
  const navigate = useNavigate();
  const [presenter] = useState(() => new ResultPresenter());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const view = useSyncExternalStore(presenter.subscribe, presenter.getSnapshot);
  const job = view.job;
  const result = view.result;
  const del = {
    isPending: view.deleting,
    isError: !!view.deleteError,
    error: view.deleteError,
  };

  useEffect(
    () => resultController.start(userId, jobId, presenter),
    [resultController, jobId, presenter, userId],
  );

  const analysisId =
    job.data?.presentation.state === "completed"
      ? job.data.jobAnalysisId
      : null;
  const heading =
    result.data?.presentation.heading || job.data?.presentation.resultHeading;
  const confirmDelete = async () => {
    if (!job.data) return;
    const deleted = await resultController.deleteJob(
      userId,
      job.data.id,
      presenter,
    );
    setDeleteDialogOpen(false);
    if (deleted) navigate("/history");
  };

  if (job.isLoading) return <LoadingState label="Retrieving your job…" />;
  if (job.isError)
    return (
      <ErrorState
        error={job.error}
        retry={() => void resultController.refreshJob(userId, jobId, presenter)}
      />
    );
  if (!job.data) return null;

  // Use the loaded submission after handling pending, error, and missing states.
  const data = job.data;

  // Read display state produced by the use-case presenter output boundary.
  const display = data.presentation;

  return (
    <div className="max-w-5xl">
      <Link
        className="inline-flex gap-2 items-center text-sm muted mb-8 hover:text-forest"
        to="/history"
      >
        <ArrowLeft size={16} /> Back to job history
      </Link>
      <PageHeader
        eyebrow="JOB ANALYSIS"
        title={heading ?? "Job analysis"}
        description={`Submitted ${display.submittedAt} · AI-generated assessment`}
        action={
          <Link to="/analyse" className="btn btn-outline shrink-0">
            New analysis <ArrowRight size={16} />
          </Link>
        }
      />
      {display.state !== "completed" ? (
        <div className="card p-9 sm:p-12 max-w-2xl">
          <div className="mb-5">
            <Badge tone={statusToneByStatus[data.status]}>
              {data.status.replaceAll("_", " ")}
            </Badge>
          </div>
          {display.state === "failed" ? (
            <>
              <AlertCircle className="text-rust mb-4" size={32} />
              <h2 className="section-title mb-3">{display.heading}</h2>
              <p className="muted text-sm mb-6">{display.message}</p>
              <Link className="btn btn-primary" to={display.actionHref}>
                {display.actionLabel} <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <RefreshCw className="animate-spin text-forest mb-4" size={32} />
              <h2 className="section-title mb-3">{display.heading}</h2>
              <p className="muted text-sm leading-relaxed">{display.message}</p>
            </>
          )}
        </div>
      ) : result.isLoading ? (
        <LoadingState label="Loading your analysis…" />
      ) : result.isError ? (
        <ErrorState
          error={result.error}
          retry={() =>
            void resultController.refreshAnalysis(presenter, analysisId)
          }
        />
      ) : result.data ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-7 items-start">
          <div className="space-y-9">
            <div className="border-l-4 border-[#a3b5a5] bg-[#ecf2ec] py-5 px-6">
              <p className="eyebrow !text-[#44624c] mb-2">ASSESSMENT SUMMARY</p>
              <p className="text-[15px] leading-7">
                {result.data.matchSummary}
              </p>
            </div>
            <section>
              <p className="eyebrow mb-3">01 — THE OPPORTUNITY</p>
              <h2 className="section-title mb-3">Role overview</h2>
              <p className="muted text-[14px] leading-7">
                {result.data.presentation.roleOverview}
              </p>
              {!result.data.presentation.hasRoleOverview && (
                <Link
                  className="btn btn-outline mt-4"
                  to={display.reanalyseHref}
                >
                  Run a new analysis <ArrowRight size={16} />
                </Link>
              )}
            </section>
            <div className="rule" />
            <section>
              <p className="eyebrow mb-3">02 — THEIR REQUIREMENTS</p>
              <h2 className="section-title mb-5">How your CV matches</h2>
              {result.data.requirements.length ? (
                result.data.requirements.map((req, i) => (
                  <article
                    className="entry-row"
                    key={`${req.requirement}-${i}`}
                  >
                    <div className="flex flex-wrap gap-3 justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm max-w-[75%]">
                        {req.requirement}
                      </h3>
                      <Badge tone={statusToneByStatus[req.status]}>
                        {req.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="muted text-sm leading-7">{req.explanation}</p>
                  </article>
                ))
              ) : (
                <p className="muted text-sm">
                  No requirement details returned.
                </p>
              )}
            </section>
            <section>
              <p className="eyebrow mb-3">03 — WHAT TO WATCH</p>
              <h2 className="section-title mb-5">Potential concerns</h2>
              {result.data.redFlags.length ? (
                <ul className="space-y-3">
                  {result.data.redFlags.map((f, i) => (
                    <li className="card px-4 py-3 flex gap-3 text-sm" key={i}>
                      <AlertCircle className="text-rust shrink-0" size={18} />
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm muted">
                  No specific concerns were identified in the posting.
                </p>
              )}
              <h3 className="font-semibold mt-6 mb-3">Glassdoor reviews</h3>
              <p className="text-sm muted mb-4">
                {result.data.presentation.reviewMessage}
              </p>
              {result.data.presentation.reviewConcerns.length > 0 && (
                <ul className="space-y-3">
                  {result.data.presentation.reviewConcerns.map((concern, i) => (
                    <li className="card px-4 py-3 text-sm" key={i}>
                      <p className="mb-2">{concern.summary}</p>
                      <a
                        className="text-rust underline"
                        href={concern.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {concern.sourceLabel}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <p className="eyebrow mb-3">04 — BEFORE YOU APPLY</p>
              <h2 className="section-title mb-5">Questions to clarify</h2>
              {result.data.questionsToClarify.length ? (
                <ul className="space-y-4">
                  {result.data.questionsToClarify.map((q, i) => (
                    <li
                      className="flex items-start gap-3 text-sm leading-6"
                      key={i}
                    >
                      <HelpCircle
                        size={18}
                        className="shrink-0 text-rust mt-1"
                      />
                      {q}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm muted">No questions were returned.</p>
              )}
            </section>
          </div>
          <aside className="space-y-5">
            <div className="card p-6">
              <h2 className="font-semibold mb-5">Job details</h2>
              {result.data.presentation.details.map(({ label, value }) => (
                <div className="mb-5 last:mb-0" key={label}>
                  <p className="text-xs muted mb-1">{label}</p>
                  <p className="text-sm font-medium break-words">{value}</p>
                </div>
              ))}
            </div>
            <div className="card p-6">
              <div className="flex gap-2 items-center font-semibold mb-3">
                <Sparkles size={18} className="text-rust" /> About this analysis
              </div>
              <p className="muted text-xs leading-6">
                This report is AI-generated and may be incomplete. Check the
                original posting and employer before acting.
              </p>
            </div>
            <div className="card p-6">
              <p className="font-semibold mb-3">References</p>
              <p className="text-xs muted break-all">
                Submission ID
                <br />
                {data.id}
              </p>
              <p className="text-xs muted break-all mt-4">
                Analysis ID
                <br />
                {result.data.id}
              </p>
            </div>
            <div className="card p-6">
              <p className="font-semibold mb-3">Original submission</p>
              <p className="text-xs muted leading-6 break-words whitespace-pre-wrap max-h-48 overflow-y-auto">
                {data.jobContext}
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="card p-8 flex gap-3">
          <Info size={20} />
          <p className="muted">
            Analysis not yet available. Please refresh this page.
          </p>
        </div>
      )}
      <div className="mt-12 pt-6 border-t border-line flex justify-between gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() =>
            void resultController.refreshJob(userId, jobId, presenter)
          }
        >
          <RefreshCw size={16} /> Refresh
        </Button>
        <Button
          variant="quiet"
          disabled={del.isPending}
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete submission
        </Button>
      </div>
      {del.isError && <ErrorState error={del.error} />}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Delete this job submission?"
        description="The analysis may remain stored by the AI service."
        confirmLabel="Delete"
        pending={del.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}

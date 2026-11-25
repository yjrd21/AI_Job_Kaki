import { Link } from "react-router-dom";
import { Loading, ErrorNotice } from "./Feedback";
import { StatusBadge } from "./JobStatusBadge";
import type { RecentAnalysisView } from "../../../presenters/DashboardPresenter";

// Renders the dashboard's Recent Analysis card for exactly one of: loading, error, empty or success.
export function RecentAnalysisCard({
  view,
  onRetry,
}: {
  view: RecentAnalysisView;
  onRetry: () => void;
}) {
  return (
    <div className="card p-7">
      <p className="eyebrow mb-5">RECENT ANALYSIS</p>
      <Content view={view} onRetry={onRetry} />
    </div>
  );
}

// Render the state and display data prepared by the dashboard presenter.
function Content({
  view,
  onRetry,
}: {
  view: RecentAnalysisView;
  onRetry: () => void;
}) {
  if (view.state === "loading") return <Loading />;

  if (view.state === "error") {
    return <ErrorNotice error={view.error} retry={onRetry} />;
  }

  if (view.state === "empty") {
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

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold">{view.heading}</h2>
        <StatusBadge status={view.status} />
      </div>
      <p className="text-xs muted mb-4">{view.submittedAt}</p>
      <Link to={view.href} className="link-text text-sm">
        View analysis →
      </Link>
    </>
  );
}

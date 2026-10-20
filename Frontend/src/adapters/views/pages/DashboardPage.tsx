import { ArrowRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { usePrimaryContext } from "../../hooks/useContexts";
import { useJobs } from "../../hooks/useJobs";
import { Loading, ErrorNotice } from "../components/composed/Feedback";
import { RecentAnalysisCard } from "../components/composed/RecentAnalysisCard";

// Display the primary candidate context and most recent job analysis.
export function DashboardPage() {
  // Read primary-context display output prepared through the controller and use case.
  const primaryContext = usePrimaryContext();

  // Load submission history for the recent analysis card.
  const jobs = useJobs();

  return (
    <div>
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6 mb-10">
        <section className="py-6">
          <p className="eyebrow mb-4">YOUR NEXT CHAPTER</p>
          <h1 className="display-title mb-5">Find work that fits you.</h1>
          <p className="muted max-w-xl leading-relaxed mb-8">
            Compare opportunities with what matters to you. Start with your
            profile, then bring a job to the table.
          </p>
          <Link
            to="/analyse"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            Analyse a job <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className="card p-7" aria-label="Primary Context">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <h2 className="section-title">{primaryContext.data?.heading}</h2>
            {primaryContext.data?.state === "ready" && (
              <span className="text-xs font-semibold">
                {primaryContext.data.statusLabel}
              </span>
            )}
          </div>
          {primaryContext.isPending ? (
            <Loading label="Loading candidate profile…" />
          ) : primaryContext.isError ? (
            <ErrorNotice
              error={primaryContext.error}
              retry={() => void primaryContext.refetch()}
            />
          ) : primaryContext.data?.state === "ready" ? (
            <>
              <h3 className="font-semibold text-lg mb-5">
                {primaryContext.data.title}
              </h3>
              <dl className="space-y-4 text-sm mb-7">
                <div>
                  <dt className="muted mb-1">CV</dt>
                  <dd>
                    <FileText
                      size={15}
                      className="inline mr-2"
                      aria-hidden="true"
                    />
                    {primaryContext.data.cvLabel}
                  </dd>
                </div>
                <div>
                  <dt className="muted mb-1">Target roles</dt>
                  <dd>{primaryContext.data.targetRoles}</dd>
                </div>
                <div>
                  <dt className="muted mb-1">Last updated</dt>
                  <dd>{primaryContext.data.updatedAt}</dd>
                </div>
              </dl>
              <Link
                className="link-text text-sm"
                to={primaryContext.data.actionHref}
              >
                {primaryContext.data.actionLabel}
              </Link>
            </>
          ) : primaryContext.data?.state === "empty" ? (
            <>
              <p className="muted text-sm mb-4">
                {primaryContext.data.message}
              </p>
              <Link
                className="link-text text-sm"
                to={primaryContext.data.actionHref}
              >
                {primaryContext.data.actionLabel}
              </Link>
            </>
          ) : null}
        </section>
      </div>

      <section aria-label="Recent analyses">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="section-title">Recent analyses</h2>
          <Link to="/history" className="link-text text-sm">
            View job history →
          </Link>
        </div>
        <RecentAnalysisCard jobs={jobs} />
      </section>
    </div>
  );
}

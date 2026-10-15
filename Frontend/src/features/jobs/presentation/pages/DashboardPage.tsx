import { ArrowRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useContexts } from "../../../candidate-contexts/presentation/hooks/useContexts";
import { useJobs } from "../hooks/useJobs";
import { Loading, ErrorNotice } from "../../../../components/feedback/Feedback";
import { RecentAnalysisCard } from "../components/RecentAnalysisCard";
import { formatDate } from "../../../../utils/dateUtils";

export function DashboardPage() {
  const contexts = useContexts();
  const jobs = useJobs();
  const profile = contexts.data?.[0];

  return (
    <div>
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6 mb-10">
        <section className="py-6">
          <p className="eyebrow mb-4">YOUR NEXT CHAPTER</p>
          <h1 className="display-title mb-5">Find work that fits you.</h1>
          <p className="muted max-w-xl leading-relaxed mb-8">
            Compare opportunities with what matters to you. Start with your profile,
            then bring a job to the table.
          </p>
          <Link to="/analyse" className="btn btn-primary inline-flex items-center gap-2">
            Analyse a job <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className="card p-7" aria-label="Current candidate profile">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <h2 className="section-title">Current candidate profile</h2>
            {profile && <span className="text-xs font-semibold">Ready</span>}
          </div>
          {contexts.isPending ? (
            <Loading label="Loading candidate profile…" />
          ) : contexts.isError ? (
            <ErrorNotice error={contexts.error} retry={() => void contexts.refetch()} />
          ) : profile ? (
            <>
              <h3 className="font-semibold text-lg mb-5">
                {profile.targetRoles[0] || "Candidate profile"}
              </h3>
              <dl className="space-y-4 text-sm mb-7">
                <div>
                  <dt className="muted mb-1">CV</dt>
                  <dd><FileText size={15} className="inline mr-2" aria-hidden="true" />
                    {profile.cvFileName || "No CV uploaded"}</dd>
                </div>
                <div>
                  <dt className="muted mb-1">Target roles</dt>
                  <dd>{profile.targetRoles.join(" · ") || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="muted mb-1">Last updated</dt>
                  <dd>{formatDate(profile.updatedAt)}</dd>
                </div>
              </dl>
              <Link className="link-text text-sm" to={`/profiles/${profile.id}`}>
                View Profile →
              </Link>
            </>
          ) : (
            <>
              <p className="muted text-sm mb-4">No candidate profiles yet.</p>
              <Link className="link-text text-sm" to="/profiles/new">
                Create Candidate Profile →
              </Link>
            </>
          )}
        </section>
      </div>

      <section aria-label="Recent analyses">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="section-title">Recent analyses</h2>
          <Link to="/history" className="link-text text-sm">View job history →</Link>
        </div>
        <RecentAnalysisCard jobs={jobs} />
      </section>
    </div>
  );
}

import {
  ArrowRight,
  ChevronRight,
  FileText,
  Sparkles,
  Users,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/presentation/AuthProvider";
import { useContexts } from "../../../candidate-contexts/presentation/hooks/useContexts";
import { useJobs } from "../hooks/useJobs";
import { Loading, ErrorNotice } from "../../../../components/feedback/Feedback";
import { RecentAnalysisCard } from "../components/RecentAnalysisCard";
export function DashboardPage() {
  const { name } = useAuth();
  const contexts = useContexts();
  const jobs = useJobs();
  const isFirstVisit = jobs.isSuccess && jobs.data.length === 0;

  // A step is only "done" or "todo" once its query succeeded; otherwise its state is unknown.
  const stepState = (q: { isSuccess: boolean; data?: unknown[] }) =>
    !q.isSuccess ? "unknown" : q.data?.length ? "done" : "todo";
  return (
    <div>
      <p className="eyebrow mb-4">YOUR NEXT CHAPTER</p>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-5 sm:items-end mb-12">
        <div>
          <h1 className="display-title mb-3">
            {isFirstVisit ? "Welcome" : "Welcome back"}{name ? `, ${name.split(" ")[0]}` : ""}.
          </h1>
          <p className="muted max-w-xl leading-relaxed">
            {isFirstVisit
              ? "Your candidate profile is ready. Start by analysing your first job opportunity."
              : "A more thoughtful way to evaluate what's next. Keep your profiles ready and explore your next opportunity with clarity."}
          </p>
        </div>
        <Link to="/analyse" className="btn btn-primary shrink-0">
          {isFirstVisit ? "Analyse your first job" : "New job analysis"} <ArrowRight size={17} />
        </Link>
      </div>
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 mb-12">
          <div className="card p-7">
            <div className="flex items-center justify-between mb-6">
              <p className="eyebrow mb-0">GET STARTED</p>
              <Sparkles size={18} className="text-rust" />
            </div>
            <h2 className="section-title mb-3">Make your next move count.</h2>
            <p className="muted text-sm leading-relaxed mb-7">
              A few simple steps to better understand each opportunity.
            </p>
            {[
              {
                name: "Build your candidate profile",
                to: "/profiles",
                icon: Users,
                state: stepState(contexts),
              },
              {
                name: "Analyse a job opportunity",
                to: "/analyse",
                icon: Sparkles,
                state: stepState(jobs),
              },
              {
                name: "Revisit your past analyses",
                to: "/history",
                icon: History,
                state: stepState(jobs),
              },
            ].map(({ name, to, icon: Icon, state }, i) => (
              <Link
                to={to}
                key={to}
                className="entry-row flex items-center gap-4 hover:opacity-75"
              >
                <div className="w-9 h-9 rounded-full bg-[#f2f1ec] flex items-center justify-center text-sm font-semibold">
                  {state === "done" ? "✓" : state === "unknown" ? "–" : i + 1}
                </div>
                <div className="flex-1 text-sm font-medium">{name}</div>
                <Icon size={16} className="muted" />
                <ChevronRight size={15} className="muted" />
              </Link>
            ))}
          </div>
          <div className="space-y-6">
            <div className="card p-7">
              <p className="eyebrow mb-5">YOUR PROFILE</p>
              {contexts.isPending ? (
                <Loading />
              ) : contexts.isError ? (
                <ErrorNotice
                  error={contexts.error}
                  retry={() => void contexts.refetch()}
                />
              ) : contexts.data[0] ? (
                <>
                  <h2 className="section-title mb-3">
                    {contexts.data[0].targetRoles.join(" · ")}
                  </h2>
                  <p className="text-sm muted mb-5">
                    <FileText size={15} className="inline mr-2" />
                    {contexts.data[0].cvFileName || "No CV uploaded"}
                  </p>
                  <Link
                    className="link-text text-sm"
                    to={`/profiles/${contexts.data[0].id}`}
                  >
                    View candidate profile →
                  </Link>
                </>
              ) : (
                <>
                  <p className="muted text-sm mb-4">
                    You haven't created a profile yet.
                  </p>
                  <Link className="link-text text-sm" to="/profiles/new">
                    Create a profile →
                  </Link>
                </>
              )}
            </div>
            <RecentAnalysisCard jobs={jobs} />
          </div>
      </div>
    </div>
  );
}

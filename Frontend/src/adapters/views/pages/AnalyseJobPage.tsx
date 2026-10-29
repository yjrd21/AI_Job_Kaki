import { useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { AuthContainer } from "../../containers/AuthContainer";
import { CandidateContextControllerContainer } from "../../containers/CandidateContextControllerContainer";
import {
  AnalysisProfilesPresenter,
  AnalysisProfilesStore,
} from "../../presenters/AnalysisProfilesPresenter";
import { useAnalyseJobForm } from "../../hooks/useJobs";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Link2, Info, Sparkles } from "lucide-react";
import { Button } from "../components/primitives/Button";
import { Loading, ErrorNotice } from "../components/composed/Feedback";

// Collect a candidate profile and job information for a new analysis.
export function AnalyseJobPage() {
  // Bind the submission form state and event handlers supplied by its React hook.
  const { submit, form, kind, onSubmit, onSubmissionTypeChange } =
    useAnalyseJobForm();

  const profilesController = useContext(CandidateContextControllerContainer);
  const auth = useContext(AuthContainer);
  if (!profilesController)
    throw new Error("CandidateContextControllerContainer provider missing");
  if (!auth) throw new Error("AuthContainer provider missing");

  const userId = auth.ready && auth.authenticated ? auth.userId : null;
  // Keep the presenter/store local to this view and replace them when its owner changes.
  const profilesBinding = useMemo(
    () => ({
      userId,
      controller: profilesController,
      presenter: new AnalysisProfilesPresenter(new AnalysisProfilesStore()),
    }),
    [userId, profilesController],
  );
  const presentation = useSyncExternalStore(
    profilesBinding.presenter.store.subscribe,
    profilesBinding.presenter.store.getSnapshot,
    profilesBinding.presenter.store.getSnapshot,
  );

  // The view initiates input; use-case outcomes reach the store through the presenter.
  useEffect(() => {
    if (!profilesBinding.userId) return;
    const request = profilesBinding.presenter.createRequest();
    void profilesBinding.controller.loadAnalysisProfiles(
      profilesBinding.userId,
      request.output,
    );
    return request.cancel;
  }, [profilesBinding]);

  return (
    <div className="max-w-4xl">
      <p className="eyebrow mb-4">JOB ANALYSIS</p>
      <h1 className="display-title max-w-2xl mb-5">
        Understand the opportunity before you take the leap.
      </h1>
      <p className="muted leading-relaxed mb-11 max-w-2xl">
        Share a job posting and choose the candidate profile you want to
        evaluate it against. We'll help you make sense of the details.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-7">
        <section className="card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="rounded-full bg-[#eff1eb] w-9 h-9 grid place-items-center text-sm font-bold">
              01
            </span>
            <div>
              <h2 className="section-title mb-0">Your candidate profile</h2>
              <p className="text-xs muted mt-1">
                Which career direction are you exploring?
              </p>
            </div>
          </div>
          {presentation.profiles.isLoading ? (
            <Loading />
          ) : presentation.profiles.options.length ? (
            <>
              <label htmlFor="candidateContextId" className="field-label">
                Candidate profile
              </label>
              <select
                id="candidateContextId"
                className="field"
                {...form.register("candidateContextId")}
              >
                <option value="">Select a profile</option>
                {presentation.profiles.options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.candidateContextId && (
                <p role="alert" className="text-sm text-red-700 mt-2">
                  {form.formState.errors.candidateContextId.message}
                </p>
              )}
              <Link to="/profiles/new" className="link-text block text-sm mt-4">
                + Create another profile
              </Link>
            </>
          ) : (
            <div className="text-sm muted">
              Create a candidate profile before submitting jobs.{" "}
              <Link className="link-text" to="/profiles/new">
                Create profile →
              </Link>
            </div>
          )}
        </section>
        <section className="card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="rounded-full bg-[#eff1eb] w-9 h-9 grid place-items-center text-sm font-bold">
              02
            </span>
            <div>
              <h2 className="section-title mb-0">The job opportunity</h2>
              <p className="text-xs muted mt-1">
                Paste the posting or enter its URL.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => onSubmissionTypeChange("TEXT")}
              aria-pressed={kind === "TEXT"}
              className={`text-left border rounded-lg p-4 flex gap-3 ${kind === "TEXT" ? "border-forest bg-[#f1f5ef]" : "border-line bg-white"}`}
            >
              <FileText size={20} className="text-forest" />
              <span>
                <strong className="block text-sm">Job description</strong>
                <span className="text-xs muted">Paste the full text</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSubmissionTypeChange("URL")}
              aria-pressed={kind === "URL"}
              className={`text-left border rounded-lg p-4 flex gap-3 ${kind === "URL" ? "border-forest bg-[#f1f5ef]" : "border-line bg-white"}`}
            >
              <Link2 size={20} className="text-forest" />
              <span>
                <strong className="block text-sm">Job URL</strong>
                <span className="text-xs muted">Provide a link</span>
              </span>
            </button>
          </div>
          <label htmlFor="jobContext" className="field-label">
            {kind === "TEXT" ? "Job posting" : "Job URL"}
          </label>
          {kind === "TEXT" ? (
            <textarea
              id="jobContext"
              rows={10}
              className="field resize-y"
              placeholder="Paste the job description, responsibilities and requirements…"
              {...form.register("jobContext")}
            />
          ) : (
            <input
              id="jobContext"
              className="field"
              type="url"
              placeholder="https://www.linkedin.com/jobs/view/1234567890/"
              {...form.register("jobContext")}
            />
          )}
          {form.formState.errors.jobContext && (
            <p role="alert" className="text-sm text-red-700 mt-2">
              {form.formState.errors.jobContext.message}
            </p>
          )}
          {kind === "URL" && (
            <p className="mt-3 text-xs muted flex gap-2">
              <Info size={15} className="shrink-0" />
              We retrieve publicly accessible LinkedIn job postings. If LinkedIn
              blocks access, paste the full job description instead.
            </p>
          )}
        </section>
        {form.formState.errors.submissionType && (
          <p role="alert" className="text-sm text-red-700">
            {form.formState.errors.submissionType.message}
          </p>
        )}
        {form.formState.errors.root?.controller?.message && (
          <p role="alert" className="text-sm text-red-700">
            {form.formState.errors.root.controller.message}
          </p>
        )}
        {submit.isError && <ErrorNotice error={submit.error} />}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <p className="text-xs muted flex items-center gap-2">
            <Sparkles size={15} /> AI-generated results should be verified
            independently.
          </p>
          <Button
            type="submit"
            disabled={!presentation.profiles.options.length || submit.isPending}
          >
            {submit.isPending ? "Submitting…" : "Analyse this job"}{" "}
            <ArrowRight size={17} />
          </Button>
        </div>
      </form>
    </div>
  );
}

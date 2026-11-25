import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Info, Link2, Sparkles } from "lucide-react";
import { Button } from "../primitives/Button";
import { ErrorNotice, Loading } from "./Feedback";
import type { JobInput } from "../../../controllers/JobController";
import type { AnalysisViewState } from "../../../presenters/AnalysisPresenter";

export function AnalysisForm({
  initialValues,
  presentation,
  resolver,
  onSubmit,
  onRetryProfiles,
}: {
  initialValues: JobInput;
  presentation: AnalysisViewState;
  resolver: Resolver<JobInput>;
  onSubmit: SubmitHandler<JobInput>;
  onRetryProfiles: () => void;
}) {
  const form = useForm<JobInput>({ resolver, defaultValues: initialValues });
  const kind = form.watch("submissionType");
  const handleSubmit = form.handleSubmit(onSubmit);
  const onSubmissionTypeChange = (type: JobInput["submissionType"]) => {
    form.setValue("submissionType", type);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-7">
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
        {presentation.profiles.status === "loading" ? (
          <Loading />
        ) : presentation.profiles.status === "error" ? (
          <ErrorNotice
            error={presentation.profiles.errorMessage}
            retry={onRetryProfiles}
          />
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
              {presentation.profiles.options.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
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
      {presentation.submission.status === "error" && (
        <ErrorNotice error={presentation.submission.error} />
      )}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <p className="text-xs muted flex items-center gap-2">
          <Sparkles size={15} /> AI-generated results should be verified
          independently.
        </p>
        <Button
          type="submit"
          disabled={
            !presentation.profiles.options.length ||
            presentation.submission.status === "submitting"
          }
        >
          {presentation.submission.status === "submitting"
            ? "Submitting…"
            : "Analyse this job"}{" "}
          <ArrowRight size={17} />
        </Button>
      </div>
    </form>
  );
}

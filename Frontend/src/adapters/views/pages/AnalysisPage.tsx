import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowRight, FileText, Info, Link2, Sparkles } from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import type { AnalysisController } from "../../controllers/AnalysisController";
import type { JobInput } from "../../controllers/JobController";
import { AnalysisPresenter } from "../../presenters/AnalysisPresenter";
import { Card } from "../components/primitives/Card";
import { Button } from "../components/primitives/Button";
import { FormField } from "../components/primitives/FormField";
import { ErrorState } from "../components/composed/ErrorState";
import { LoadingState } from "../components/composed/LoadingState";
import { PageHeader } from "../components/composed/PageHeader";

// Collect a candidate profile and job information for a new analysis.
export function AnalysisPage({
  analysisController,
}: {
  analysisController: AnalysisController;
}) {
  const auth = useAuthContext();
  const userId =
    auth.lifecycle.ready && auth.session.authenticated
      ? auth.session.userId
      : null;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [presenter] = useState(() => new AnalysisPresenter());
  const presentation = useSyncExternalStore(
    presenter.subscribe,
    presenter.getSnapshot,
  );
  const initialValues = presenter.presentInitialFormValues({
    type: params.get("type"),
    context: params.get("context"),
    jobContext: params.get("jobContext"),
  });
  const form = useForm<JobInput>({
    resolver: (values) => analysisController.resolveJobForm(values, presenter),
    defaultValues: initialValues,
  });
  const submissionType = form.watch("submissionType");
  const submitForm = form.handleSubmit(async (values) => {
    const job = await analysisController.submitJob(userId, values, presenter);
    if (job) navigate(`/jobs/${job.id}`);
  });

  const onCreateProfile = () => navigate("/profiles/new");
  const loadProfiles = useCallback(
    () => void analysisController.loadProfiles(userId, presenter),
    [analysisController, presenter, userId],
  );

  // The protected route remounts when the authenticated user changes.
  useEffect(() => {
    if (!userId) return () => presenter.cancelRequests();
    loadProfiles();
    return () => presenter.cancelRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Load once per page mount.
  }, []);

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="JOB ANALYSIS"
        title="Understand the opportunity before you take the leap."
        description="Share a job posting and choose the candidate profile you want to evaluate it against. We'll help you make sense of the details."
        className="max-w-2xl"
      />
      <form onSubmit={(event) => void submitForm(event)} className="space-y-7">
        <Card className="p-6 sm:p-8">
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
            <LoadingState />
          ) : presentation.profiles.status === "error" ? (
            <ErrorState
              error={presentation.profiles.errorMessage}
              retry={loadProfiles}
            />
          ) : presentation.profiles.options.length ? (
            <>
              <FormField
                id="candidateContextId"
                label="Candidate profile"
                error={form.formState.errors.candidateContextId?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <select
                    id={id}
                    className="field"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...form.register("candidateContextId")}
                  >
                    <option value="">Select a profile</option>
                    {presentation.profiles.options.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
              <Button
                variant="quiet"
                type="button"
                onClick={onCreateProfile}
                className="link-text block text-sm mt-4 !p-0 !min-h-0 !rounded-none"
              >
                + Create another profile
              </Button>
            </>
          ) : (
            <div className="text-sm muted">
              Create a candidate profile before submitting jobs.{" "}
              <Button
                type="button"
                variant="quiet"
                className="link-text !p-0 !min-h-0 !rounded-none"
                onClick={onCreateProfile}
              >
                Create profile →
              </Button>
            </div>
          )}
        </Card>
        <Card className="p-6 sm:p-8">
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
              onClick={() => form.setValue("submissionType", "TEXT")}
              aria-pressed={submissionType === "TEXT"}
              className={`text-left border rounded-lg p-4 flex gap-3 ${submissionType === "TEXT" ? "border-forest bg-[#f1f5ef]" : "border-line bg-white"}`}
            >
              <FileText size={20} className="text-forest" />
              <span>
                <strong className="block text-sm">Job description</strong>
                <span className="text-xs muted">Paste the full text</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => form.setValue("submissionType", "URL")}
              aria-pressed={submissionType === "URL"}
              className={`text-left border rounded-lg p-4 flex gap-3 ${submissionType === "URL" ? "border-forest bg-[#f1f5ef]" : "border-line bg-white"}`}
            >
              <Link2 size={20} className="text-forest" />
              <span>
                <strong className="block text-sm">Job URL</strong>
                <span className="text-xs muted">Provide a link</span>
              </span>
            </button>
          </div>
          <FormField
            id="jobContext"
            label={submissionType === "TEXT" ? "Job posting" : "Job URL"}
            error={form.formState.errors.jobContext?.message}
          >
            {({ id, describedBy, invalid }) =>
              submissionType === "TEXT" ? (
                <textarea
                  id={id}
                  rows={10}
                  className="field resize-y"
                  placeholder="Paste the job description, responsibilities and requirements…"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("jobContext")}
                />
              ) : (
                <input
                  id={id}
                  className="field"
                  type="url"
                  placeholder="https://www.linkedin.com/jobs/view/1234567890/"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("jobContext")}
                />
              )
            }
          </FormField>
          {submissionType === "URL" && (
            <p className="mt-3 text-xs muted flex gap-2">
              <Info size={15} className="shrink-0" />
              We retrieve publicly accessible LinkedIn job postings. If LinkedIn
              blocks access, paste the full job description instead.
            </p>
          )}
        </Card>
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
          <ErrorState error={presentation.submission.error} />
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
    </div>
  );
}

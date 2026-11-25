import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "../../AuthContext";
import type { AnalysisController } from "../../controllers/AnalysisController";
import type { JobInput } from "../../controllers/JobController";
import { AnalysisPresenter } from "../../presenters/AnalysisPresenter";
import { AnalysisForm } from "../components/composed/AnalysisForm";

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

  const onSubmit = async (values: JobInput) => {
    const job = await analysisController.submitJob(userId, values, presenter);
    if (job) navigate(`/jobs/${job.id}`);
  };
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
      <p className="eyebrow mb-4">JOB ANALYSIS</p>
      <h1 className="display-title max-w-2xl mb-5">
        Understand the opportunity before you take the leap.
      </h1>
      <p className="muted leading-relaxed mb-11 max-w-2xl">
        Share a job posting and choose the candidate profile you want to
        evaluate it against. We'll help you make sense of the details.
      </p>
      <AnalysisForm
        initialValues={initialValues}
        presentation={presentation}
        resolver={(values) =>
          analysisController.resolveJobForm(values, presenter)
        }
        onSubmit={onSubmit}
        onRetryProfiles={loadProfiles}
      />
    </div>
  );
}

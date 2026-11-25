import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  Outlet,
  useMatch,
  useNavigate,
} from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import { Button } from "../components/primitives/Button";
import { Alert } from "../components/primitives/Alert";
import { StepProgress } from "../components/primitives/StepProgress";
import { ErrorNotice, Loading } from "../components/composed/Feedback";
import { OnboardingPresenter } from "../../presenters/OnboardingPresenter";
import type { OnboardingController } from "../../controllers/OnboardingController";

// Render onboarding and release child routes once the account has completed it.
export function OnboardingPage({
  onboardingController,
}: {
  onboardingController: OnboardingController;
}) {
  // Get the authenticated user's ID from the context.
  const {
    session: { userId },
  } = useAuthContext();

  // Get the query client for caching and invalidating queries.
  const queryClient = useQueryClient();

  // Initialize the onboarding presenter for managing the onboarding state.
  const [presenter] = useState(() => new OnboardingPresenter());

  // Subscribe to the presenter's state and get the current snapshot.
  const view = useSyncExternalStore(
    presenter.subscribe, // subscribe to presenter's state changes
    presenter.getSnapshot, // get the current snapshot of the presenter's state
  );

  // Start the onboarding process when the component mounts.
  useEffect(() => {
    return onboardingController.startOnboarding(userId, presenter);
    // The authenticated route remounts on session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get the navigation function for programmatic navigation.
  const navigate = useNavigate();
  const isOnboardingRoute = !!useMatch("/onboarding");

  // Render different screens based on the presenter's state.
  switch (view.screen) {
    case "loading":
      return <Loading label="Checking onboarding status…" />;
    case "error":
      return (
        <ErrorNotice
          error={view.accountError}
          retry={() => {
            if (!userId) throw new Error("Onboarding requires a user ID");
            onboardingController.loadOnboardingStatus(userId, presenter);
          }}
        />
      );
    case "unavailable":
      return (
        <Alert tone="danger" title="Onboarding status is unavailable">
          <p className="mb-3">
            We couldn't verify your onboarding status. Please try again.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              if (!userId) throw new Error("Onboarding requires a user ID");
              onboardingController.loadOnboardingStatus(userId, presenter);
            }}
          >
            Try again
          </Button>
        </Alert>
      );
    case "redirect":
      return isOnboardingRoute ? (
        <Navigate to="/dashboard" replace />
      ) : (
        <Outlet />
      );
    case "form":
      if (!isOnboardingRoute) return <Navigate to="/onboarding" replace />;
      break;
    case "complete":
      if (!isOnboardingRoute) return <Outlet />;
      break;
  }

  return (
    <div className="min-h-screen bg-paper px-5 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 font-semibold mb-12"
        >
          <span className="w-9 h-9 rounded-lg bg-forest text-white grid place-items-center">
            K
          </span>
          AI Job Kaki
        </Link>
        {view.screen === "complete" ? (
          <div className="card p-7 sm:p-10" role="status">
            <CheckCircle2
              className="text-forest mb-5"
              size={36}
              aria-hidden="true"
            />
            <p className="eyebrow">COMPLETE</p>
            <h1 className="display-title mb-6">Your profile is ready</h1>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard <ArrowRight size={17} />
              </Button>
              <Button variant="outline" onClick={() => navigate("/analyse")}>
                Analyse your first job
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="eyebrow mb-3">{view.stepLabel}</p>
            <StepProgress steps={view.steps} activeIndex={view.step} />
            <div className="card p-6 sm:p-10">
              {view.step === 0 && (
                <>
                  <h1 className="page-title mb-3">Choose your target roles</h1>
                  <p className="muted mb-7">
                    Choose at least one target role. Your target roles identify
                    this profile.
                  </p>
                  <label htmlFor="roles" className="field-label">
                    Target roles
                  </label>
                  <textarea
                    id="roles"
                    className="field"
                    rows={4}
                    value={view.values.roles}
                    onChange={(e) =>
                      onboardingController.updateField(
                        presenter,
                        "roles",
                        e.target.value,
                      )
                    }
                    placeholder={"Design Lead\nSenior Product Designer"}
                    aria-invalid={!!view.error}
                  />
                  <p className="ui-field-hint">Enter one role per line.</p>
                </>
              )}
              {view.step === 1 && (
                <>
                  <h1 className="page-title mb-3">Add your CV</h1>
                  <p className="muted mb-7">
                    Store your CV with this profile. Add relevant experience to
                    your preferences for the current comparison.
                  </p>
                  <label htmlFor="cv" className="field-label">
                    CV (optional)
                  </label>
                  <input
                    id="cv"
                    type="file"
                    className="field"
                    accept=".pdf,.docx"
                    onChange={(e) => {
                      void onboardingController.chooseCv(
                        presenter,
                        e.target.files?.[0],
                      );
                    }}
                  />
                  <p className="ui-field-hint">
                    <FileText size={14} className="inline mr-2" />
                    PDF or DOCX · up to 5 MB
                  </p>
                  {view.cvLoading && (
                    <p role="status" className="mt-3 text-sm muted">
                      Reading CV…
                    </p>
                  )}
                  {view.cv && (
                    <div className="mt-4">
                      <Alert tone="success" title="Upload successful">
                        Your CV has been added to this profile.
                      </Alert>
                      <p className="text-sm muted mt-2">{view.cv.name}</p>
                    </div>
                  )}
                </>
              )}
              {view.step === 2 && (
                <>
                  <h1 className="page-title mb-3">Define your target roles</h1>
                  <p className="muted mb-7">
                    Choose the working style and locations you’re aiming for.
                    You can update these later.
                  </p>
                  <label htmlFor="arrangement" className="field-label">
                    Preferred work arrangement
                  </label>
                  <input
                    id="arrangement"
                    className="field mb-5"
                    value={view.values.arrangement}
                    onChange={(e) =>
                      onboardingController.updateField(
                        presenter,
                        "arrangement",
                        e.target.value,
                      )
                    }
                    placeholder="Hybrid or remote"
                  />
                  <label htmlFor="locations" className="field-label">
                    Preferred locations
                  </label>
                  <input
                    id="locations"
                    className="field"
                    value={view.values.locations}
                    onChange={(e) =>
                      onboardingController.updateField(
                        presenter,
                        "locations",
                        e.target.value,
                      )
                    }
                    placeholder="Singapore, Remote APAC"
                  />
                </>
              )}
              {view.step === 3 && (
                <>
                  <h1 className="page-title mb-3">What matters most?</h1>
                  <p className="muted mb-7">
                    Add preferences and deal-breakers so analysis reflects your
                    priorities.
                  </p>
                  <label htmlFor="preferences" className="field-label">
                    Preferences
                  </label>
                  <textarea
                    id="preferences"
                    className="field mb-5"
                    rows={4}
                    value={view.values.preferences}
                    onChange={(e) =>
                      onboardingController.updateField(
                        presenter,
                        "preferences",
                        e.target.value,
                      )
                    }
                    placeholder="Clear ownership, supportive manager"
                  />
                  <label htmlFor="redflags" className="field-label">
                    Red flags and deal-breakers
                  </label>
                  <textarea
                    id="redflags"
                    className="field"
                    rows={4}
                    value={view.values.redFlags}
                    onChange={(e) =>
                      onboardingController.updateField(
                        presenter,
                        "redFlags",
                        e.target.value,
                      )
                    }
                    placeholder="Unclear reporting line, always-on culture"
                  />
                  <p className="ui-field-hint">
                    These are decision context, not automatic rejection rules.
                  </p>
                </>
              )}
              {view.error && (
                <p role="alert" className="ui-field-error">
                  {view.error}
                </p>
              )}
              {view.submissionError !== null && (
                <ErrorNotice error={view.submissionError} />
              )}
              <div className="flex justify-between gap-3 mt-8">
                <Button
                  variant="outline"
                  type="button"
                  disabled={view.backDisabled}
                  onClick={() => onboardingController.previous(presenter)}
                >
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  type="button"
                  disabled={view.nextDisabled}
                  onClick={() => {
                    void onboardingController.next(userId, presenter, {
                      onSuccess: () =>
                        void queryClient.invalidateQueries({
                          queryKey: ["account", userId],
                        }),
                      onSettled: () =>
                        void queryClient.invalidateQueries({
                          queryKey: ["contexts", userId],
                        }),
                    });
                  }}
                >
                  {view.nextLabel} <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

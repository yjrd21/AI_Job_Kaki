import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { useOnboardingForm } from "../../hooks/useOnboardingStatus";
import { Button } from "../components/primitives/Button";
import { Alert } from "../components/primitives/Alert";
import { StepProgress } from "../components/primitives/StepProgress";
import { ErrorNotice, Loading } from "../components/composed/Feedback";

// Define the ordered steps shown by the onboarding progress indicator.
const steps = ["Target roles", "CV", "Work preferences", "Priorities"] as const;

// Guide initial profile creation and mark account onboarding as complete.
export function OnboardingPage() {
  // Bind step state and workflow handlers supplied by the onboarding hook.
  const {
    account,
    finish,
    step,
    finished,
    values,
    cv,
    cvLoading,
    error,
    update,
    chooseCv,
    next,
    previous,
    onDashboard,
    onAnalyse,
  } = useOnboardingForm();

  if (account.isPending) return <Loading label="Checking onboarding status…" />;
  if (account.isError)
    return (
      <ErrorNotice error={account.error} retry={() => void account.refetch()} />
    );
  if (typeof account.data?.onboardingCompleted !== "boolean")
    return (
      <p role="alert">
        Onboarding status is unavailable. Please try again after the backend has
        been updated.
      </p>
    );
  if (account.data.onboardingCompleted && !finished)
    return <Navigate to="/dashboard" replace />;

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
        {finished ? (
          <div className="card p-7 sm:p-10" role="status">
            <CheckCircle2
              className="text-forest mb-5"
              size={36}
              aria-hidden="true"
            />
            <p className="eyebrow">COMPLETE</p>
            <h1 className="display-title mb-6">Your profile is ready</h1>
            <div className="flex flex-wrap gap-3">
              <Button onClick={onDashboard}>
                Go to Dashboard <ArrowRight size={17} />
              </Button>
              <Button variant="outline" onClick={onAnalyse}>
                Analyse your first job
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="eyebrow mb-3">{step + 1} of 4</p>
            <StepProgress steps={steps} activeIndex={step} />
            <div className="card p-6 sm:p-10">
              {step === 0 && (
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
                    value={values.roles}
                    onChange={(e) => update("roles", e.target.value)}
                    placeholder={"Design Lead\nSenior Product Designer"}
                    aria-invalid={!!error}
                  />
                  <p className="ui-field-hint">Enter one role per line.</p>
                </>
              )}
              {step === 1 && (
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
                      void chooseCv(e.target.files?.[0]);
                    }}
                  />
                  <p className="ui-field-hint">
                    <FileText size={14} className="inline mr-2" />
                    PDF or DOCX · up to 5 MB
                  </p>
                  {cvLoading && (
                    <p role="status" className="mt-3 text-sm muted">
                      Reading CV…
                    </p>
                  )}
                  {cv && (
                    <div className="mt-4">
                      <Alert tone="success" title="Upload successful">
                        Your CV has been added to this profile.
                      </Alert>
                      <p className="text-sm muted mt-2">{cv.name}</p>
                    </div>
                  )}
                </>
              )}
              {step === 2 && (
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
                    value={values.arrangement}
                    onChange={(e) => update("arrangement", e.target.value)}
                    placeholder="Hybrid or remote"
                  />
                  <label htmlFor="locations" className="field-label">
                    Preferred locations
                  </label>
                  <input
                    id="locations"
                    className="field"
                    value={values.locations}
                    onChange={(e) => update("locations", e.target.value)}
                    placeholder="Singapore, Remote APAC"
                  />
                </>
              )}
              {step === 3 && (
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
                    value={values.preferences}
                    onChange={(e) => update("preferences", e.target.value)}
                    placeholder="Clear ownership, supportive manager"
                  />
                  <label htmlFor="redflags" className="field-label">
                    Red flags and deal-breakers
                  </label>
                  <textarea
                    id="redflags"
                    className="field"
                    rows={4}
                    value={values.redFlags}
                    onChange={(e) => update("redFlags", e.target.value)}
                    placeholder="Unclear reporting line, always-on culture"
                  />
                  <p className="ui-field-hint">
                    These are decision context, not automatic rejection rules.
                  </p>
                </>
              )}
              {error && (
                <p role="alert" className="ui-field-error">
                  {error}
                </p>
              )}
              {finish.isError && <ErrorNotice error={finish.error} />}
              <div className="flex justify-between gap-3 mt-8">
                <Button
                  variant="outline"
                  type="button"
                  disabled={step === 0 || finish.isPending || cvLoading}
                  onClick={previous}
                >
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button
                  type="button"
                  disabled={finish.isPending || cvLoading}
                  onClick={next}
                >
                  {finish.isPending
                    ? "Saving…"
                    : step === 3
                      ? "Finish profile"
                      : "Continue"}{" "}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

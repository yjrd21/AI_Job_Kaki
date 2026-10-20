import { Navigate, Outlet } from "react-router-dom";
import { Loading, ErrorNotice } from "./Feedback";
import { Alert } from "../primitives/Alert";
import { Button } from "../primitives/Button";
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";

/** Onboarding is account lifecycle state, not candidate-profile count. */
export function OnboardingGate() {
  // Load the persisted onboarding flag before admitting users to the main application.
  const account = useOnboardingStatus();

  if (account.isPending)
    return (
      <div className="p-10">
        <Loading label="Checking onboarding status…" />
      </div>
    );
  if (account.isError)
    return (
      <div className="p-10">
        <ErrorNotice
          error={account.error}
          retry={() => void account.refetch()}
        />
      </div>
    );
  // Fail closed if the backend has not yet returned the required field.
  if (typeof account.data?.onboardingCompleted !== "boolean") {
    return (
      <div className="p-10">
        <Alert tone="danger" title="Onboarding status is unavailable">
          <p className="mb-3">
            We couldn't verify your onboarding status. Please try again.
          </p>
          <Button variant="outline" onClick={() => void account.refetch()}>
            Try again
          </Button>
        </Alert>
      </div>
    );
  }
  if (!account.data.onboardingCompleted)
    return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

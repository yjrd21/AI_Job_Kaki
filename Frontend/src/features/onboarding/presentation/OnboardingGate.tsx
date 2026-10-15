import { Navigate, Outlet } from "react-router-dom";
import { Loading, ErrorNotice } from "../../../components/feedback/Feedback";
import { useOnboardingStatus } from "./useOnboardingStatus";

/** Onboarding is account lifecycle state, not candidate-profile count. */
export function OnboardingGate() {
  const account = useOnboardingStatus();
  if (account.isPending) return <div className="p-10"><Loading label="Checking onboarding status…" /></div>;
  if (account.isError) return <div className="p-10"><ErrorNotice error={account.error} retry={() => void account.refetch()} /></div>;
  // Fail closed if the backend has not yet returned the required field.
  if (typeof account.data?.onboardingCompleted !== "boolean") {
    return <div className="p-10" role="alert">Onboarding status is unavailable. Please try again once your account has been updated.</div>;
  }
  if (!account.data.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

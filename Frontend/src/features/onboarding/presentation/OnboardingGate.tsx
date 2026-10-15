import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loading, ErrorNotice } from "../../../components/feedback/Feedback";
import { useContexts } from "../../candidate-contexts/presentation/hooks/useContexts";

/** Only redirect once the API has positively confirmed no candidate profiles exist. */
export function OnboardingGate() {
  const contexts = useContexts();
  const location = useLocation();
  if (contexts.isPending) return <div className="p-10"><Loading label="Checking your candidate profiles…" /></div>;
  if (contexts.isError) return <div className="p-10"><ErrorNotice error={contexts.error} retry={() => void contexts.refetch()} /></div>;
  if (!contexts.data?.length && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

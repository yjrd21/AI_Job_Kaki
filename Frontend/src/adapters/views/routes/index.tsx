import { useContext } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "../components/composed/AppShell";
import { AuthContainer } from "../../containers/AuthContainer";
import { Loading } from "../components/composed/Feedback";
import { LoginPage } from "../pages/LoginPage";
import { OnboardingGate } from "../components/composed/OnboardingGate";
import { OnboardingPage } from "../pages/OnboardingPage";
import { DashboardPage } from "../pages/DashboardPage";
import { AnalyseJobPage } from "../pages/AnalyseJobPage";
import { JobHistoryPage } from "../pages/JobHistoryPage";
import { JobResultPage } from "../pages/JobResultPage";
import { ProfilesPage } from "../pages/ProfilesPage";
import { ProfileEditorPage } from "../pages/ProfileEditorPage";
import { AccountPage } from "../pages/AccountPage";

// Wait for session restoration and restrict protected routes to identified users.
function Guard() {
  // Read session state and authentication actions from the provider.
  const auth = useContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  if (!auth.ready)
    return (
      <div className="p-10">
        <Loading label="Connecting to identity provider…" />
      </div>
    );
  if (!auth.authenticated) return <Navigate to="/login" replace />;
  if (!auth.userId)
    return (
      <div className="p-10 max-w-xl">
        <h1 className="page-title">Account mapping required</h1>
        <p className="muted mt-4">
          Your sign-in token did not include a user identifier (sub). Sign out
          and sign in again, or check the Keycloak client configuration.
        </p>
      </div>
    );
  return <Outlet />;
}

// Connect public and protected pages while applying onboarding and layout gates.
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <Guard />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
      {
        element: <OnboardingGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/analyse", element: <AnalyseJobPage /> },
              { path: "/history", element: <JobHistoryPage /> },
              { path: "/jobs/:jobId", element: <JobResultPage /> },
              { path: "/profiles", element: <ProfilesPage /> },
              { path: "/profiles/new", element: <ProfileEditorPage /> },
              { path: "/profiles/:contextId", element: <ProfileEditorPage /> },
              { path: "/account", element: <AccountPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

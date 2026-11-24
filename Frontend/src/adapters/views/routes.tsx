import { useContext } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./components/composed/AppShell";
import { AuthContainer } from "../containers/AuthContainer";
import { Loading } from "./components/composed/Feedback";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingGate } from "./components/composed/OnboardingGate";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalyseJobPage } from "./pages/AnalyseJobPage";
import { JobHistoryPage } from "./pages/JobHistoryPage";
import { JobResultPage } from "./pages/JobResultPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProfileEditorPage } from "./pages/ProfileEditorPage";
import { AccountPage } from "./pages/AccountPage";
import type { AccountController } from "../controllers/AccountController";
import type { JobController } from "../controllers/JobController";
import type { CandidateContextController } from "../controllers/CandidateContextController";
import type { OnboardingController } from "../controllers/OnboardingController";
import type {
  JobAnalysisPresentation,
  JobPresentation,
} from "../presenters/JobPresenter";
import type {
  PrimaryContextPresentation,
  ProfilePresentation,
} from "../presenters/CandidateContextPresenter";

type RouteControllers = {
  accountController: AccountController;
  jobController: JobController<JobPresentation, JobAnalysisPresentation>;
  candidateContextController: CandidateContextController<
    PrimaryContextPresentation,
    ProfilePresentation[]
  >;
  onboardingController: OnboardingController;
};

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
  return <Outlet key={`${auth.userId}:${auth.sessionVersion}`} />;
}

// Connect controller dependencies to views at the route composition boundary.
export function createAppRouter(controllers: RouteControllers) {
  return createBrowserRouter([
    { path: "/login", element: <LoginPage /> },
    {
      element: <Guard />,
      children: [
        {
          path: "/onboarding",
          element: (
            <OnboardingPage
              onboardingController={controllers.onboardingController}
            />
          ),
        },
        {
          element: (
            <OnboardingGate accountController={controllers.accountController} />
          ),
          children: [
            {
              element: <AppShell />,
              children: [
                {
                  path: "/dashboard",
                  element: (
                    <DashboardPage
                      jobController={controllers.jobController}
                      candidateContextController={
                        controllers.candidateContextController
                      }
                    />
                  ),
                },
                {
                  path: "/analyse",
                  element: (
                    <AnalyseJobPage
                      jobController={controllers.jobController}
                      candidateContextController={
                        controllers.candidateContextController
                      }
                    />
                  ),
                },
                {
                  path: "/history",
                  element: (
                    <JobHistoryPage jobController={controllers.jobController} />
                  ),
                },
                {
                  path: "/jobs/:jobId",
                  element: (
                    <JobResultPage jobController={controllers.jobController} />
                  ),
                },
                {
                  path: "/profiles",
                  element: (
                    <ProfilesPage
                      candidateContextController={
                        controllers.candidateContextController
                      }
                    />
                  ),
                },
                {
                  path: "/profiles/new",
                  element: (
                    <ProfileEditorPage
                      candidateContextController={
                        controllers.candidateContextController
                      }
                    />
                  ),
                },
                {
                  path: "/profiles/:contextId",
                  element: (
                    <ProfileEditorPage
                      candidateContextController={
                        controllers.candidateContextController
                      }
                    />
                  ),
                },
                {
                  path: "/account",
                  element: (
                    <AccountPage
                      accountController={controllers.accountController}
                    />
                  ),
                },
              ],
            },
          ],
        },
      ],
    },
    { path: "*", element: <Navigate to="/dashboard" replace /> },
  ]);
}

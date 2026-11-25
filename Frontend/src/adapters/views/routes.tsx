import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./components/composed/AppShell";
import { useAuthContext } from "../AuthContext";
import { Loading } from "./components/composed/Feedback";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ResultPage } from "./pages/ResultPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProfileEditorPage } from "./pages/ProfileEditorPage";
import { AccountPage } from "./pages/AccountPage";
import type { DashboardController } from "../controllers/DashboardController";
import type { LoginController } from "../controllers/LoginController";
import type { AccountController } from "../controllers/AccountController";
import type { AnalysisController } from "../controllers/AnalysisController";
import type { HistoryController } from "../controllers/HistoryController";
import type { ResultController } from "../controllers/ResultController";
import type { ProfileController } from "../controllers/ProfileController";
import type { ProfileEditorController } from "../controllers/ProfileEditorController";
import type { OnboardingController } from "../controllers/OnboardingController";

type RouteControllers = {
  accountController: AccountController;
  dashboardController: DashboardController;
  loginController: LoginController;
  analysisController: AnalysisController;
  historyController: HistoryController;
  resultController: ResultController;
  profileController: ProfileController;
  profileEditorController: ProfileEditorController;
  onboardingController: OnboardingController;
};

// Wait for session restoration and restrict protected routes to identified users.
function Guard() {
  // Read session state and authentication actions from the provider.
  const auth = useAuthContext();

  if (!auth.lifecycle.ready)
    return (
      <div className="p-10">
        <Loading label="Connecting to identity provider…" />
      </div>
    );
  if (!auth.session.authenticated) return <Navigate to="/login" replace />;
  if (!auth.session.userId)
    return (
      <div className="p-10 max-w-xl">
        <h1 className="page-title">Account mapping required</h1>
        <p className="muted mt-4">
          Your sign-in token did not include a user identifier (sub). Sign out
          and sign in again, or check the Keycloak client configuration.
        </p>
      </div>
    );
  return (
    <Outlet key={`${auth.session.userId}:${auth.lifecycle.sessionVersion}`} />
  );
}

// Connect controller dependencies to views at the route composition boundary.
export function createAppRouter(controllers: RouteControllers) {
  return createBrowserRouter([
    {
      path: "/login",
      element: <LoginPage loginController={controllers.loginController} />,
    },
    {
      element: <Guard />,
      children: [
        {
          element: (
            <OnboardingPage
              onboardingController={controllers.onboardingController}
            />
          ),
          children: [
            { path: "/onboarding", element: null },
            {
              element: <AppShell />,
              children: [
                {
                  path: "/dashboard",
                  element: (
                    <DashboardPage
                      dashboardController={controllers.dashboardController}
                    />
                  ),
                },
                {
                  path: "/analyse",
                  element: (
                    <AnalysisPage
                      analysisController={controllers.analysisController}
                    />
                  ),
                },
                {
                  path: "/history",
                  element: (
                    <HistoryPage
                      historyController={controllers.historyController}
                    />
                  ),
                },
                {
                  path: "/jobs/:jobId",
                  element: (
                    <ResultPage
                      resultController={controllers.resultController}
                    />
                  ),
                },
                {
                  path: "/profiles",
                  element: (
                    <ProfilePage
                      profileController={controllers.profileController}
                    />
                  ),
                },
                {
                  path: "/profiles/new",
                  element: (
                    <ProfileEditorPage
                      profileEditorController={
                        controllers.profileEditorController
                      }
                    />
                  ),
                },
                {
                  path: "/profiles/:contextId",
                  element: (
                    <ProfileEditorPage
                      profileEditorController={
                        controllers.profileEditorController
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

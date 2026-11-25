import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App";
import {
  authSession,
  dashboardController,
  onboardingController,
  accountController,
  loginController,
  analysisController,
  historyController,
  resultController,
  profileController,
  profileEditorController,
} from "./app/dependencies";
import { createAppRouter } from "./adapters/views/routes";
import { AuthSessionProvider } from "./infrastructure/providers/AuthSessionProvider";
import { createQueryClient } from "./infrastructure/clients/createQueryClient";
import "./adapters/views/styles/globals.css";

const queryClient = createQueryClient();

const router = createAppRouter({
  accountController,
  dashboardController,
  loginController,
  analysisController,
  historyController,
  resultController,
  profileController,
  profileEditorController,
  onboardingController,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthSessionProvider session={authSession}>
      <App router={router} />
    </AuthSessionProvider>
  </QueryClientProvider>,
);

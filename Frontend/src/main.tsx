import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App";
import {
  authSession,
  onboardingController,
  accountController,
  jobController,
  candidateContextController,
} from "./app/dependencies";
import { createAppRouter } from "./adapters/views/routes";
import { AuthContainerProvider } from "./infrastructure/providers/AuthContainerProvider";
import { createQueryClient } from "./infrastructure/clients/createQueryClient";
import "./adapters/views/styles/globals.css";

const queryClient = createQueryClient();

const router = createAppRouter({
  accountController,
  jobController,
  candidateContextController,
  onboardingController,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthContainerProvider session={authSession}>
      <App router={router} />
    </AuthContainerProvider>
  </QueryClientProvider>,
);

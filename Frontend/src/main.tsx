import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { AppContainerProvider } from "./infrastructure/providers/AppContainerProvider";
import {
  application,
  authSession,
  onboardingController,
  accountController,
  jobController,
  candidateContextController,
} from "./app/dependencies";
import "./adapters/views/styles/globals.css";

// Mount the routed application with query caching and the dependencies constructed at startup.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppContainerProvider
    application={application}
    accountController={accountController}
    jobController={jobController}
    candidateContextController={candidateContextController}
    authSession={authSession}
    onboardingController={onboardingController}
  >
    <App />
  </AppContainerProvider>,
);

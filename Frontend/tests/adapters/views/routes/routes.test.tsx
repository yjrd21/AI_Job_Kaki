import { OnboardingControllerContainer } from "../../../../src/adapters/containers/OnboardingControllerContainer";
import { CandidateContextControllerContainer } from "../../../../src/adapters/containers/CandidateContextControllerContainer";
import { JobControllerContainer } from "../../../../src/adapters/containers/JobControllerContainer";
import { AccountControllerContainer } from "../../../../src/adapters/containers/AccountControllerContainer";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { App } from "../../../../src/app/App";
import { router } from "../../../../src/adapters/views/routes/index";
import { AuthContainerProvider } from "../../../../src/infrastructure/providers/AuthContainerProvider";
import { ApplicationContainer } from "../../../../src/adapters/containers/ApplicationContainer";
import {
  makeApplication,
  makeSession,
  signedIn,
  account,
} from "../../../fixtures/application";
import type { AuthSessionContract } from "../../../../src/application/contracts/clients/AuthClientContract";

async function showRoute(
  path: string,
  sessionState: AuthSessionContract = signedIn,
  onboarded = true,
) {
  const {
    application,
    accountController,
    jobController,
    candidateContextController,
    onboardingController,
    repositories,
  } = makeApplication();
  repositories.users.get.mockResolvedValue({
    ...account,
    onboardingCompleted: onboarded,
  });
  const session = makeSession(sessionState);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  await act(async () => {
    await router.navigate(path);
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ApplicationContainer.Provider value={application}>
        <AccountControllerContainer.Provider value={accountController}>
          <JobControllerContainer.Provider value={jobController}>
            <CandidateContextControllerContainer.Provider
              value={candidateContextController}
            >
              <OnboardingControllerContainer.Provider
                value={onboardingController}
              >
                <AuthContainerProvider session={session}>
                  <App />
                </AuthContainerProvider>
              </OnboardingControllerContainer.Provider>
            </CandidateContextControllerContainer.Provider>
          </JobControllerContainer.Provider>
        </AccountControllerContainer.Provider>
      </ApplicationContainer.Provider>
    </QueryClientProvider>,
  );
  return { session, repositories };
}

describe("application routes after moving the frontend", () => {
  it("redirects signed-out users to login and delegates the login button", async () => {
    const { session, repositories } = await showRoute("/dashboard", {
      ...signedIn,
      authenticated: false,
      userId: null,
      name: "",
    });
    const button = await screen.findByRole("button", {
      name: /Continue with Keycloak/,
    });
    expect(router.state.location.pathname).toBe("/login");
    fireEvent.click(button);
    await waitFor(() => expect(session.login).toHaveBeenCalledOnce());
    expect(repositories.users.get).not.toHaveBeenCalled();
  });

  it("redirects unfinished accounts to onboarding", async () => {
    await showRoute("/dashboard", signedIn, false);
    await screen.findByRole("heading", { name: "Choose your target roles" });
    expect(router.state.location.pathname).toBe("/onboarding");
  });

  it.each([
    ["/dashboard", "Find work that fits you."],
    ["/analyse", "Understand the opportunity before you take the leap."],
    ["/jobs/job-id", "Job analysis"],
    ["/history", "Job history"],
    ["/profiles", "Candidate profiles"],
    ["/profiles/new", "Create a candidate profile."],
    ["/profiles/profile-id", "Refine your profile."],
    ["/account", "Account settings"],
  ])("renders %s with the injected application", async (path, heading) => {
    await showRoute(path);
    await screen.findByRole("heading", { name: heading, level: 1 });
    await waitFor(() => expect(router.state.location.pathname).toBe(path));
    expect(
      screen.queryByText("Unexpected Application Error!"),
    ).not.toBeInTheDocument();
  });
});

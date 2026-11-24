import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../../../src/app/App";
import { createAppRouter } from "../../../../src/adapters/views/routes";
import { AuthContainerProvider } from "../../../../src/infrastructure/providers/AuthContainerProvider";
import {
  makeControllers,
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
    accountController,
    jobController,
    candidateContextController,
    onboardingController,
    repositories,
  } = makeControllers();
  repositories.users.get.mockResolvedValue({
    ...account,
    onboardingCompleted: onboarded,
  });
  const session = makeSession(sessionState);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const router = createAppRouter({
    accountController,
    jobController,
    candidateContextController,
    onboardingController,
  });
  await act(async () => {
    await router.navigate(path);
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContainerProvider session={session}>
        <App router={router} />
      </AuthContainerProvider>
    </QueryClientProvider>,
  );
  return { session, repositories, router };
}

describe("application routes after moving the frontend", () => {
  it("redirects signed-out users to login and delegates the login button", async () => {
    const { session, repositories, router } = await showRoute("/dashboard", {
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
    const { router } = await showRoute("/dashboard", signedIn, false);
    await screen.findByRole("heading", { name: "Choose your target roles" });
    expect(router.state.location.pathname).toBe("/onboarding");
  });

  it("discards the previous onboarding view when the signed-in user changes", async () => {
    const controllers = makeControllers();
    const session = makeSession();
    let publish!: (value: AuthSessionContract) => void;
    vi.mocked(session.subscribe).mockImplementation((listener) => {
      publish = listener;
      return () => undefined;
    });
    let resolveAccount!: (value: typeof account) => void;
    controllers.repositories.users.get.mockImplementation((userId) =>
      userId === "next-user"
        ? new Promise((resolve) => {
            resolveAccount = resolve;
          })
        : Promise.resolve(account),
    );
    const router = createAppRouter(controllers);
    await act(async () => {
      await router.navigate("/onboarding");
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContainerProvider session={session}>
          <App router={router} />
        </AuthContainerProvider>
      </QueryClientProvider>,
    );
    fireEvent.change(await screen.findByLabelText("Target roles"), {
      target: { value: "Previous user's draft" },
    });
    act(() => publish({ ...signedIn, userId: "next-user" }));
    expect(
      screen.queryByDisplayValue("Previous user's draft"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Checking onboarding status…")).toBeInTheDocument();
    await act(async () => resolveAccount({ ...account, id: "next-user" }));
    expect(await screen.findByLabelText("Target roles")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("Target roles"), {
      target: { value: "Old session draft" },
    });
    act(() => {
      publish({ ...signedIn, authenticated: false, userId: null });
      publish({ ...signedIn, userId: "next-user" });
    });
    expect(
      screen.queryByDisplayValue("Old session draft"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Checking onboarding status…")).toBeInTheDocument();
    await act(async () => resolveAccount({ ...account, id: "next-user" }));
    expect(await screen.findByLabelText("Target roles")).toHaveValue("");
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
  ])("renders %s with the injected controllers", async (path, heading) => {
    const { router } = await showRoute(path);
    await screen.findByRole("heading", { name: heading, level: 1 });
    await waitFor(() => expect(router.state.location.pathname).toBe(path));
    expect(
      screen.queryByText("Unexpected Application Error!"),
    ).not.toBeInTheDocument();
  });
});

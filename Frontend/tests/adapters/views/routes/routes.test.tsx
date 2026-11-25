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
import { AuthSessionProvider } from "../../../../src/infrastructure/providers/AuthSessionProvider";
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
  const session = makeSession(sessionState);
  const {
    accountController,
    dashboardController,
    loginController,
    analysisController,
    historyController,
    resultController,
    profileController,
    profileEditorController,
    onboardingController,
    repositories,
  } = makeControllers(session);
  repositories.users.get.mockResolvedValue({
    ...account,
    onboardingCompleted: onboarded,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
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
  await act(async () => {
    await router.navigate(path);
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider session={session}>
        <App router={router} />
      </AuthSessionProvider>
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

  it.each(["/dashboard", "/analyse", "/profiles", "/account"])(
    "redirects unfinished accounts from %s with a single status load",
    async (path) => {
      const { router, repositories } = await showRoute(path, signedIn, false);
      await screen.findByRole("heading", { name: "Choose your target roles" });
      expect(router.state.location.pathname).toBe("/onboarding");
      expect(repositories.users.get).toHaveBeenCalledOnce();
      expect(repositories.jobs.list).not.toHaveBeenCalled();
    },
  );

  it("redirects completed accounts from onboarding to the dashboard", async () => {
    const { router, repositories } = await showRoute("/onboarding");
    await screen.findByRole("heading", { name: "Find work that fits you." });
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(repositories.users.get).toHaveBeenCalledOnce();
  });

  it("opens child routes after finishing onboarding without reloading status", async () => {
    const { router, repositories } = await showRoute(
      "/analyse",
      signedIn,
      false,
    );
    fireEvent.change(await screen.findByLabelText("Target roles"), {
      target: { value: "Software engineer" },
    });
    for (let step = 0; step < 3; step++) {
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await screen.findByRole("heading", { name: "Your profile is ready" });
    fireEvent.click(
      screen.getByRole("button", { name: "Analyse your first job" }),
    );
    await screen.findByRole("heading", {
      name: "Understand the opportunity before you take the leap.",
    });
    expect(router.state.location.pathname).toBe("/analyse");
    expect(repositories.users.get).toHaveBeenCalledOnce();
  });

  it.each(["error", "unavailable"])(
    "blocks child routes for %s status and retries through onboarding",
    async (status) => {
      const { router, repositories } = await showRoute(
        "/onboarding",
        signedIn,
        false,
      );
      await screen.findByLabelText("Target roles");
      if (status === "error") {
        repositories.users.get.mockRejectedValueOnce(
          new Error("Account unavailable"),
        );
      } else {
        repositories.users.get.mockResolvedValueOnce({
          ...account,
          onboardingCompleted: undefined,
        });
      }
      await act(async () => {
        await router.navigate("/login");
      });
      await act(async () => {
        await router.navigate("/dashboard");
      });
      await screen.findByText(
        status === "error"
          ? "Account unavailable"
          : "Onboarding status is unavailable",
      );
      expect(
        screen.queryByRole("heading", { name: "Find work that fits you." }),
      ).not.toBeInTheDocument();
      repositories.users.get.mockResolvedValue({
        ...account,
        onboardingCompleted: true,
      });
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await screen.findByRole("heading", { name: "Find work that fits you." });
      expect(router.state.location.pathname).toBe("/dashboard");
    },
  );

  it("discards the previous onboarding view when the signed-in user changes", async () => {
    const session = makeSession();
    const controllers = makeControllers(session);
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
        <AuthSessionProvider session={session}>
          <App router={router} />
        </AuthSessionProvider>
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

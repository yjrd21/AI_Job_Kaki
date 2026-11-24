import { StrictMode, type ReactElement } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditorPage } from "../../../../src/adapters/views/pages/ProfileEditorPage";
import { ProfilesPage } from "../../../../src/adapters/views/pages/ProfilesPage";
import { OnboardingPage } from "../../../../src/adapters/views/pages/OnboardingPage";
import { LoginPage } from "../../../../src/adapters/views/pages/LoginPage";
import { AuthContainer } from "../../../../src/adapters/containers/AuthContainer";
import type { User } from "../../../../src/domain/models/User";
import {
  account,
  makeControllers,
  makeSession,
  profile,
  signedIn,
} from "../../../fixtures/application";

function setup() {
  const dependencies = makeControllers();
  const session = makeSession();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function show(page: ReactElement, path: string, signedOut = false) {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContainer.Provider
          value={{
            ...signedIn,
            authenticated: !signedOut,
            ready: true,
            sessionVersion: 1,
            login: session.login,
            logout: session.logout,
          }}
        >
          <MemoryRouter
            initialEntries={[path]}
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route
                path={
                  path.startsWith("/profiles/") && path !== "/profiles/new"
                    ? "/profiles/:contextId"
                    : path
                }
                element={page}
              />
              {path !== "/profiles" && (
                <Route path="/profiles" element={<p>Saved profiles</p>} />
              )}
              <Route path="/dashboard" element={<p>Dashboard destination</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContainer.Provider>
      </QueryClientProvider>,
    );
  }
  return {
    ...dependencies,
    session,
    queryClient,
    show,
  };
}

function submitProfile() {
  const form = screen
    .getByRole("button", { name: "Save profile" })
    .closest("form");
  if (!form) throw new Error("Profile form missing");
  fireEvent.submit(form);
}

async function advanceToFinalStep() {
  await screen.findByLabelText("Target roles");
  fireEvent.change(screen.getByLabelText("Target roles"), {
    target: { value: "Engineer\n Designer" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByLabelText("CV (optional)");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(await screen.findByLabelText("Preferred work arrangement"), {
    target: { value: " Remote " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("button", { name: "Finish profile" });
}

describe("profile editor through controller and presenter", () => {
  it("validates input, prepares lists, and creates a profile before navigating", async () => {
    const { show, repositories, candidateContextController } = setup();
    show(
      <ProfileEditorPage
        candidateContextController={candidateContextController}
      />,
      "/profiles/new",
    );
    submitProfile();
    await screen.findByText("At least one target role is required");
    expect(repositories.contexts.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Career directions/), {
      target: { value: "Engineer\n Designer " },
    });
    fireEvent.change(screen.getByLabelText("What you're looking for"), {
      target: { value: "Remote\nTeamwork" },
    });
    submitProfile();
    await screen.findByText("Saved profiles");
    expect(repositories.contexts.create).toHaveBeenCalledExactlyOnceWith(
      "user-id",
      {
        targetRoles: ["Engineer", "Designer"],
        preferences: ["Remote", "Teamwork"],
        redFlags: [],
      },
    );
  });

  it("populates existing values and updates without replacing the saved CV", async () => {
    const { show, repositories, candidateContextController } = setup();
    repositories.contexts.get.mockResolvedValue({
      ...profile,
      targetRoles: ["Engineer", "Designer"],
    });
    show(
      <ProfileEditorPage
        candidateContextController={candidateContextController}
      />,
      "/profiles/profile-id",
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/Career directions/)).toHaveValue(
        "Engineer\nDesigner",
      ),
    );
    fireEvent.change(screen.getByLabelText(/Career directions/), {
      target: { value: "Architect" },
    });
    submitProfile();
    await screen.findByText("Saved profiles");
    expect(repositories.contexts.update).toHaveBeenCalledExactlyOnceWith(
      "user-id",
      "profile-id",
      { targetRoles: ["Architect"], preferences: [], redFlags: [] },
    );
    expect(repositories.contexts.create).not.toHaveBeenCalled();
  });

  it("reports oversized files before saving and keeps save failures separate", async () => {
    const { show, repositories, candidateContextController } = setup();
    show(
      <ProfileEditorPage
        candidateContextController={candidateContextController}
      />,
      "/profiles/new",
    );
    fireEvent.change(screen.getByLabelText(/Career directions/), {
      target: { value: "Engineer" },
    });
    const oversized = new File(["cv"], "cv.pdf");
    Object.defineProperty(oversized, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText(/Upload a CV/), {
      target: { files: [oversized] },
    });
    submitProfile();
    await screen.findByText("CV must not exceed 5 MB");
    expect(repositories.contexts.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Upload a CV/), {
      target: { files: [] },
    });
    repositories.contexts.create.mockRejectedValue(
      new Error("Save unavailable"),
    );
    submitProfile();
    await screen.findByText("Save unavailable");
    expect(screen.queryByText("Saved profiles")).not.toBeInTheDocument();
  });
});

describe("onboarding workflow from the page", () => {
  it("presents a failed account load and retries through the controller", async () => {
    const { show, repositories, onboardingController, queryClient } = setup();
    repositories.users.get
      .mockRejectedValueOnce(new Error("Account unavailable"))
      .mockResolvedValueOnce(account);
    show(
      <OnboardingPage onboardingController={onboardingController} />,
      "/onboarding",
    );

    await screen.findByText("Account unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByLabelText("Target roles");
    expect(queryClient.getQueryData(["account", "user-id"])).toBeUndefined();
    expect(repositories.users.get).toHaveBeenCalledTimes(2);
  });

  it("stops presenting a retry result after the page unmounts", async () => {
    const { show, repositories, onboardingController } = setup();
    let resolveRetry: (user: User) => void = () => {
      throw new Error("Retry was not started");
    };
    const retry = new Promise<User>((resolve) => {
      resolveRetry = resolve;
    });
    repositories.users.get
      .mockRejectedValueOnce(new Error("Account unavailable"))
      .mockReturnValueOnce(retry);
    const load = vi.spyOn(onboardingController, "loadOnboardingStatus");
    const page = show(
      <OnboardingPage onboardingController={onboardingController} />,
      "/onboarding",
    );
    await screen.findByText("Account unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    const presenter = load.mock.calls[1][1];
    expect(presenter.getSnapshot().screen).toBe("loading");
    page.unmount();
    await act(async () => {
      resolveRetry(account);
      await retry;
    });
    expect(presenter.getSnapshot().screen).toBe("loading");
  });

  it("fails closed when the account does not contain an onboarding status", async () => {
    const { show, repositories, onboardingController } = setup();
    repositories.users.get.mockResolvedValue({
      ...account,
      onboardingCompleted: undefined,
    });
    show(
      <OnboardingPage onboardingController={onboardingController} />,
      "/onboarding",
    );

    await screen.findByText(
      "Onboarding status is unavailable. Please try again after the backend has been updated.",
    );
    expect(screen.queryByLabelText("Target roles")).not.toBeInTheDocument();
  });

  it("ignores an earlier account request after an effect restarts", async () => {
    const { show, repositories, onboardingController } = setup();
    let resolveFirst: (user: User) => void = () => {
      throw new Error("First account request was not started");
    };
    const firstAccount = new Promise<User>((resolve) => {
      resolveFirst = resolve;
    });
    repositories.users.get
      .mockReturnValueOnce(firstAccount)
      .mockResolvedValueOnce(account);
    show(
      <StrictMode>
        <OnboardingPage onboardingController={onboardingController} />
      </StrictMode>,
      "/onboarding",
    );
    await screen.findByLabelText("Target roles");
    expect(repositories.users.get).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveFirst({ ...account, onboardingCompleted: true });
      await firstAccount;
    });
    expect(screen.getByLabelText("Target roles")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard destination")).not.toBeInTheDocument();
  });

  it("ignores an earlier account result after switching users", async () => {
    const { repositories, onboardingController, queryClient } = setup();
    let resolveFirst: (user: User) => void = () => {
      throw new Error("First account request was not started");
    };
    const firstAccount = new Promise<User>((resolve) => {
      resolveFirst = resolve;
    });
    repositories.users.get.mockImplementation((userId: string) =>
      userId === "user-id"
        ? firstAccount
        : Promise.resolve({ ...account, id: userId }),
    );
    const loadStatus = vi.spyOn(onboardingController, "loadOnboardingStatus");
    const pageFor = (
      userId: string | null,
      controller = onboardingController,
    ) => (
      <QueryClientProvider client={queryClient}>
        <AuthContainer.Provider
          value={{
            ...signedIn,
            userId,
            ready: true,
            sessionVersion: 1,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <MemoryRouter initialEntries={["/onboarding"]}>
            <Routes>
              <Route
                path="/onboarding"
                element={
                  <OnboardingPage
                    key={userId ?? "signed-out"}
                    onboardingController={controller}
                  />
                }
              />
              <Route path="/dashboard" element={<p>Dashboard destination</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContainer.Provider>
      </QueryClientProvider>
    );
    const { rerender } = render(pageFor("user-id"));
    await waitFor(() =>
      expect(repositories.users.get).toHaveBeenCalledWith("user-id"),
    );
    rerender(pageFor("another-user"));
    await screen.findByLabelText("Target roles");
    expect(loadStatus.mock.calls[0][1]).not.toBe(loadStatus.mock.calls[1][1]);

    await act(async () => {
      resolveFirst({ ...account, onboardingCompleted: true });
      await firstAccount;
    });
    expect(screen.getByLabelText("Target roles")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard destination")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Target roles"), {
      target: { value: "Another user's draft" },
    });
    rerender(pageFor("third-user"));
    await waitFor(() =>
      expect(screen.getByLabelText("Target roles")).toHaveValue(""),
    );

    fireEvent.change(screen.getByLabelText("Target roles"), {
      target: { value: "Third user's draft" },
    });
    const replacement = makeControllers();
    rerender(pageFor("third-user", replacement.onboardingController));
    expect(replacement.repositories.users.get).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Target roles")).toHaveValue(
      "Third user's draft",
    );
    rerender(pageFor("fourth-user", replacement.onboardingController));
    await waitFor(() =>
      expect(replacement.repositories.users.get).toHaveBeenCalledWith(
        "fourth-user",
      ),
    );
    expect(await screen.findByLabelText("Target roles")).toHaveValue("");
    rerender(pageFor(null, replacement.onboardingController));
    expect(screen.queryByLabelText("Target roles")).not.toBeInTheDocument();
    expect(screen.getByText("Checking onboarding status…")).toBeInTheDocument();
  });

  it("shows submission progress and prevents duplicate onboarding requests", async () => {
    const { show, repositories, onboardingController } = setup();
    let resolveCompletion: (user: User) => void = () => {
      throw new Error("Onboarding completion was not started");
    };
    const completion = new Promise<User>((resolve) => {
      resolveCompletion = resolve;
    });
    repositories.users.completeOnboarding.mockReturnValue(completion);
    show(
      <OnboardingPage onboardingController={onboardingController} />,
      "/onboarding",
    );
    await advanceToFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await waitFor(() =>
      expect(repositories.users.completeOnboarding).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Saving…" }));
    expect(repositories.users.completeOnboarding).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveCompletion({ ...account, onboardingCompleted: true });
      await completion;
    });
    await screen.findByRole("heading", { name: "Your profile is ready" });
  });

  it("isolates pending completion and retry progress when users change", async () => {
    const { repositories, onboardingController, queryClient } = setup();
    let resolveFirst: (user: User) => void = () => {
      throw new Error("First completion was not started");
    };
    const firstCompletion = new Promise<User>((resolve) => {
      resolveFirst = resolve;
    });
    repositories.users.completeOnboarding.mockReturnValueOnce(firstCompletion);
    const pageFor = (userId: string) => (
      <QueryClientProvider client={queryClient}>
        <AuthContainer.Provider
          value={{
            ...signedIn,
            userId,
            ready: true,
            sessionVersion: 1,
            login: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <MemoryRouter initialEntries={["/onboarding"]}>
            <Routes>
              <Route
                path="/onboarding"
                element={
                  <OnboardingPage
                    key={userId}
                    onboardingController={onboardingController}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContainer.Provider>
      </QueryClientProvider>
    );
    const { rerender } = render(pageFor("first-user"));
    await advanceToFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await waitFor(() =>
      expect(repositories.users.completeOnboarding).toHaveBeenCalledWith(
        "first-user",
      ),
    );

    rerender(pageFor("second-user"));
    expect(await screen.findByLabelText("Target roles")).toHaveValue("");
    await act(async () => {
      resolveFirst({ ...account, onboardingCompleted: true });
      await firstCompletion;
    });
    expect(screen.getByLabelText("Target roles")).toHaveValue("");
    expect(
      screen.queryByRole("heading", { name: "Your profile is ready" }),
    ).not.toBeInTheDocument();

    await advanceToFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await screen.findByRole("heading", { name: "Your profile is ready" });
    expect(repositories.contexts.create).toHaveBeenCalledTimes(2);
    expect(repositories.contexts.create).toHaveBeenLastCalledWith(
      "second-user",
      expect.any(Object),
    );
  });

  it("passes an accepted encoded CV through the onboarding controller", async () => {
    const { show, repositories, onboardingController } = setup();
    show(
      <OnboardingPage onboardingController={onboardingController} />,
      "/onboarding",
    );
    await screen.findByLabelText("Target roles");
    fireEvent.change(screen.getByLabelText("Target roles"), {
      target: { value: "Engineer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(await screen.findByLabelText("CV (optional)"), {
      target: {
        files: [new File(["cv"], "cv.pdf", { type: "application/pdf" })],
      },
    });
    await screen.findByText("Upload successful");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await screen.findByRole("heading", { name: "Your profile is ready" });
    expect(repositories.contexts.create).toHaveBeenCalledExactlyOnceWith(
      "user-id",
      {
        targetRoles: ["Engineer"],
        preferences: [],
        redFlags: [],
        cvFile: "Y3Y=",
        cvFileName: "cv.pdf",
      },
    );
  });

  it("keeps the most recently selected CV when file reads finish out of order", async () => {
    const { show, onboardingController } = setup();
    const readers: FileReader[] = [];
    const read = vi
      .spyOn(FileReader.prototype, "readAsDataURL")
      .mockImplementation(function (this: FileReader) {
        readers.push(this);
      });
    try {
      show(
        <OnboardingPage onboardingController={onboardingController} />,
        "/onboarding",
      );
      await screen.findByLabelText("Target roles");
      fireEvent.change(screen.getByLabelText("Target roles"), {
        target: { value: "Engineer" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      const input = screen.getByLabelText("CV (optional)");
      fireEvent.change(input, {
        target: { files: [new File(["old"], "old.pdf")] },
      });
      fireEvent.change(input, {
        target: { files: [new File(["new"], "new.pdf")] },
      });
      expect(readers).toHaveLength(2);
      await act(async () => {
        Object.defineProperty(readers[1], "result", {
          value: "data:application/pdf;base64,bmV3",
        });
        readers[1].dispatchEvent(new Event("load"));
      });
      expect(screen.getByText("new.pdf")).toBeInTheDocument();
      await act(async () => {
        Object.defineProperty(readers[0], "result", {
          value: "data:application/pdf;base64,b2xk",
        });
        readers[0].dispatchEvent(new Event("load"));
      });
      expect(screen.getByText("new.pdf")).toBeInTheDocument();
      expect(screen.queryByText("old.pdf")).not.toBeInTheDocument();
    } finally {
      read.mockRestore();
    }
  });

  it("validates the first step and retries completion without another profile creation", async () => {
    const { show, repositories, onboardingController, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    repositories.users.completeOnboarding.mockRejectedValueOnce(
      new Error("Completion unavailable"),
    );
    show(
      <OnboardingPage onboardingController={onboardingController} />,
      "/onboarding",
    );
    await screen.findByLabelText("Target roles");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Add at least one target role.");
    await advanceToFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await screen.findByText("Completion unavailable");
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["contexts", "user-id"],
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ["account", "user-id"],
    });
    expect(repositories.contexts.create).toHaveBeenCalledExactlyOnceWith(
      "user-id",
      {
        targetRoles: ["Engineer", "Designer"],
        preferences: ["Work arrangement: Remote"],
        redFlags: [],
      },
    );
    repositories.users.get.mockResolvedValue({
      ...account,
      onboardingCompleted: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await screen.findByRole("heading", { name: "Your profile is ready" });
    expect(repositories.contexts.create).toHaveBeenCalledTimes(1);
    expect(repositories.users.completeOnboarding).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["account", "user-id"],
    });
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it("rejects an unsupported CV selection and keeps the previous-step action in the page", async () => {
    const { show, onboardingController } = setup();
    show(
      <OnboardingPage onboardingController={onboardingController} />,
      "/onboarding",
    );
    await screen.findByLabelText("Target roles");
    fireEvent.change(screen.getByLabelText("Target roles"), {
      target: { value: "Engineer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(await screen.findByLabelText("CV (optional)"), {
      target: { files: [new File(["bad"], "cv.txt")] },
    });
    await screen.findByText("Choose a PDF or DOCX file under 5 MB.");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Target roles")).toHaveValue("Engineer");
    expect(
      screen.queryByText("Choose a PDF or DOCX file under 5 MB."),
    ).not.toBeInTheDocument();
  });
});

describe("profile listing and sign-in actions", () => {
  it("renders prepared card output and handles cancelled and failed deletions", async () => {
    const { show, repositories, candidateContextController } = setup();
    show(
      <ProfilesPage candidateContextController={candidateContextController} />,
      "/profiles",
    );
    await screen.findByRole("heading", { name: "Engineer" });
    expect(screen.getByText("PROFILE 01")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View and edit" })).toHaveAttribute(
      "href",
      "/profiles/profile-id",
    );
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      fireEvent.click(screen.getByRole("button", { name: "Delete profile" }));
      expect(repositories.contexts.delete).not.toHaveBeenCalled();
      repositories.contexts.delete.mockRejectedValueOnce(
        new Error("Delete unavailable"),
      );
      confirmation.mockReturnValue(true);
      fireEvent.click(screen.getByRole("button", { name: "Delete profile" }));
      await screen.findByText("Delete unavailable");
      repositories.contexts.list.mockResolvedValue([]);
      fireEvent.click(screen.getByRole("button", { name: "Delete profile" }));
      await screen.findByText("Start with your first profile");
    } finally {
      confirmation.mockRestore();
    }
  });

  it("shows a rejected login and allows another attempt", async () => {
    const { show, session } = setup();
    session.login = vi
      .fn()
      .mockRejectedValueOnce(new Error("Login unavailable"))
      .mockResolvedValue(undefined);
    show(<LoginPage />, "/login", true);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Keycloak/ }),
    );
    await screen.findByText("Login unavailable");
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with Keycloak/ }),
    );
    await waitFor(() => expect(session.login).toHaveBeenCalledTimes(2));
  });
});

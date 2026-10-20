import type { ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditorPage } from "../../../../src/adapters/views/pages/ProfileEditorPage";
import { ProfilesPage } from "../../../../src/adapters/views/pages/ProfilesPage";
import { OnboardingPage } from "../../../../src/adapters/views/pages/OnboardingPage";
import { LoginPage } from "../../../../src/adapters/views/pages/LoginPage";
import { AccountControllerContainer } from "../../../../src/adapters/containers/AccountControllerContainer";
import { CandidateContextControllerContainer } from "../../../../src/adapters/containers/CandidateContextControllerContainer";
import { OnboardingControllerContainer } from "../../../../src/adapters/containers/OnboardingControllerContainer";
import { AuthContainer } from "../../../../src/adapters/containers/AuthContainer";
import {
  account,
  makeApplication,
  makeSession,
  profile,
  signedIn,
} from "../../../fixtures/application";

function setup() {
  const dependencies = makeApplication();
  const session = makeSession();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function show(page: ReactElement, path: string, signedOut = false) {
    render(
      <QueryClientProvider client={queryClient}>
        <AccountControllerContainer.Provider
          value={dependencies.accountController}
        >
          <CandidateContextControllerContainer.Provider
            value={dependencies.candidateContextController}
          >
            <OnboardingControllerContainer.Provider
              value={dependencies.onboardingController}
            >
              <AuthContainer.Provider
                value={{
                  ...signedIn,
                  authenticated: !signedOut,
                  ready: true,
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
                        path.startsWith("/profiles/") &&
                        path !== "/profiles/new"
                          ? "/profiles/:contextId"
                          : path
                      }
                      element={page}
                    />
                    {path !== "/profiles" && (
                      <Route path="/profiles" element={<p>Saved profiles</p>} />
                    )}
                    <Route
                      path="/dashboard"
                      element={<p>Dashboard destination</p>}
                    />
                  </Routes>
                </MemoryRouter>
              </AuthContainer.Provider>
            </OnboardingControllerContainer.Provider>
          </CandidateContextControllerContainer.Provider>
        </AccountControllerContainer.Provider>
      </QueryClientProvider>,
    );
  }
  return { ...dependencies, session, queryClient, show };
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
    const { show, repositories } = setup();
    show(<ProfileEditorPage />, "/profiles/new");
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
    const { show, repositories } = setup();
    repositories.contexts.get.mockResolvedValue({
      ...profile,
      targetRoles: ["Engineer", "Designer"],
    });
    show(<ProfileEditorPage />, "/profiles/profile-id");
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
    const { show, repositories } = setup();
    show(<ProfileEditorPage />, "/profiles/new");
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
  it("passes an accepted encoded CV through the onboarding controller", async () => {
    const { show, repositories } = setup();
    show(<OnboardingPage />, "/onboarding");
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

  it("validates the first step and retries completion without another profile creation", async () => {
    const { show, repositories } = setup();
    repositories.users.completeOnboarding.mockRejectedValueOnce(
      new Error("Completion unavailable"),
    );
    show(<OnboardingPage />, "/onboarding");
    await screen.findByLabelText("Target roles");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Add at least one target role.");
    await advanceToFinalStep();
    fireEvent.click(screen.getByRole("button", { name: "Finish profile" }));
    await screen.findByText("Completion unavailable");
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
  });

  it("rejects an unsupported CV selection and keeps the previous-step action in the hook", async () => {
    const { show } = setup();
    show(<OnboardingPage />, "/onboarding");
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
    const { show, repositories } = setup();
    show(<ProfilesPage />, "/profiles");
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

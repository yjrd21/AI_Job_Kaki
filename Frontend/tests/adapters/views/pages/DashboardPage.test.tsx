import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { DashboardPage } from "../../../../src/adapters/views/pages/DashboardPage";
import { CandidateContextControllerContainer } from "../../../../src/adapters/containers/CandidateContextControllerContainer";
import { JobControllerContainer } from "../../../../src/adapters/containers/JobControllerContainer";
import { ApplicationContainer } from "../../../../src/adapters/containers/ApplicationContainer";
import { AuthContainer } from "../../../../src/adapters/containers/AuthContainer";
import {
  useContexts,
  usePrimaryContext,
} from "../../../../src/adapters/hooks/useContexts";
import {
  makeApplication,
  makeSession,
  profile,
  signedIn,
} from "../../../fixtures/application";

function setup() {
  const dependencies = makeApplication();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: 0 },
    },
  });
  const session = makeSession();
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApplicationContainer.Provider value={dependencies.application}>
          <CandidateContextControllerContainer.Provider
            value={dependencies.candidateContextController}
          >
            <JobControllerContainer.Provider value={dependencies.jobController}>
              <AuthContainer.Provider
                value={{
                  ...signedIn,
                  ready: true,
                  login: session.login,
                  logout: session.logout,
                }}
              >
                <MemoryRouter>{children}</MemoryRouter>
              </AuthContainer.Provider>
            </JobControllerContainer.Provider>
          </CandidateContextControllerContainer.Provider>
        </ApplicationContainer.Provider>
      </QueryClientProvider>
    );
  }
  return { ...dependencies, queryClient, wrapper };
}

describe("dashboard primary context through controller and presenter", () => {
  it("renders the first context with presenter-prepared labels", async () => {
    const { wrapper, repositories } = setup();
    repositories.contexts.list.mockResolvedValue([
      profile,
      {
        ...profile,
        id: "second",
        targetRoles: ["Later context"],
        updatedAt: "2027-01-01",
      },
    ]);
    render(<DashboardPage />, { wrapper });
    expect(
      await screen.findByRole("heading", { name: "Engineer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Primary Context →" }),
    ).toHaveAttribute("href", "/profiles/profile-id");
    expect(screen.queryByText("Later context")).not.toBeInTheDocument();
  });

  it("renders presenter-prepared empty output", async () => {
    const { wrapper, repositories } = setup();
    repositories.contexts.list.mockResolvedValue([]);
    render(<DashboardPage />, { wrapper });
    expect(
      await screen.findByText("No candidate profiles yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create Candidate Profile →" }),
    ).toHaveAttribute("href", "/profiles/new");
  });

  it("shows a request failure instead of presenting an empty list", async () => {
    const { wrapper, repositories } = setup();
    repositories.contexts.list.mockRejectedValue(
      new Error("Contexts unavailable"),
    );
    render(<DashboardPage />, { wrapper });
    expect(await screen.findByText("Contexts unavailable")).toBeInTheDocument();
    expect(
      screen.queryByText("No candidate profiles yet."),
    ).not.toBeInTheDocument();
  });

  it("shares the raw list cache and updates primary output when that cache changes", async () => {
    const { wrapper, repositories, queryClient } = setup();
    const hook = renderHook(
      () => ({ list: useContexts(), primary: usePrimaryContext() }),
      { wrapper },
    );
    await waitFor(() =>
      expect(hook.result.current.primary.isSuccess).toBe(true),
    );
    expect(repositories.contexts.list).toHaveBeenCalledTimes(1);
    expect(hook.result.current.list.data).toEqual([profile]);
    act(() => {
      queryClient.setQueryData(["contexts", "user-id"], []);
    });
    await waitFor(() =>
      expect(hook.result.current.primary.data?.state).toBe("empty"),
    );
    expect(hook.result.current.list.data).toEqual([]);
    expect(repositories.contexts.list).toHaveBeenCalledTimes(1);
  });
});

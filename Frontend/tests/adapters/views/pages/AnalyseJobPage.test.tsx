import { CandidateContextControllerContainer } from "../../../../src/adapters/containers/CandidateContextControllerContainer";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AnalyseJobPage } from "../../../../src/adapters/views/pages/AnalyseJobPage";
import { JobControllerContainer } from "../../../../src/adapters/containers/JobControllerContainer";
import { ApplicationContainer } from "../../../../src/adapters/containers/ApplicationContainer";
import { AuthContainerProvider } from "../../../../src/infrastructure/providers/AuthContainerProvider";
import {
  makeApplication,
  makeSession,
  profile,
} from "../../../fixtures/application";
import type { CandidateContext } from "../../../../src/domain/models/CandidateContext";

function CurrentRoute() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}
function renderAnalyse(
  path = "/analyse",
  configure?: (
    repositories: ReturnType<typeof makeApplication>["repositories"],
  ) => void,
) {
  const {
    application,
    candidateContextController,
    jobController,
    repositories,
  } = makeApplication();
  configure?.(repositories);
  const session = makeSession();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ApplicationContainer.Provider value={application}>
        <CandidateContextControllerContainer.Provider
          value={candidateContextController}
        >
          <JobControllerContainer.Provider value={jobController}>
            <AuthContainerProvider session={session}>
              <MemoryRouter
                initialEntries={[path]}
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <CurrentRoute />
                <Routes>
                  <Route path="/analyse" element={<AnalyseJobPage />} />
                  <Route
                    path="/jobs/:jobId"
                    element={<h1>Submission created</h1>}
                  />
                </Routes>
              </MemoryRouter>
            </AuthContainerProvider>
          </JobControllerContainer.Provider>
        </CandidateContextControllerContainer.Provider>
      </ApplicationContainer.Provider>
    </QueryClientProvider>,
  );
  return repositories;
}

async function showAnalyse(path = "/analyse") {
  const repositories = renderAnalyse(path);
  await screen.findByRole("option", { name: /Engineer/ });
  return repositories;
}

function deferredProfiles() {
  let resolve!: (profiles: CandidateContext[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<CandidateContext[]>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );
  return { promise, resolve, reject };
}

describe("candidate profile selection", () => {
  it("shows a loading indicator and disables submission while profiles are loading", async () => {
    const request = deferredProfiles();
    renderAnalyse("/analyse", (repositories) => {
      repositories.contexts.list.mockReturnValue(request.promise);
    });

    expect(await screen.findByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyse this job" }),
    ).toBeDisabled();

    await act(async () => request.resolve([profile]));

    expect(
      await screen.findByRole("option", { name: "Engineer — cv.pdf" }),
    ).toHaveValue("profile-id");
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyse this job" }),
    ).toBeEnabled();
  });

  it("shows the create-profile prompt and disables submission when no profiles are available", async () => {
    const request = deferredProfiles();
    renderAnalyse("/analyse", (repositories) => {
      repositories.contexts.list.mockReturnValue(request.promise);
    });
    expect(await screen.findByText("Loading…")).toBeInTheDocument();
    await act(async () => request.resolve([]));

    expect(
      await screen.findByText(
        /Create a candidate profile before submitting jobs/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create profile →" }),
    ).toHaveAttribute("href", "/profiles/new");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyse this job" }),
    ).toBeDisabled();
  });

  it("shows the create-profile prompt and disables submission when profiles fail to load", async () => {
    const request = deferredProfiles();
    renderAnalyse("/analyse", (repositories) => {
      repositories.contexts.list.mockReturnValue(request.promise);
    });
    expect(await screen.findByText("Loading…")).toBeInTheDocument();

    await act(async () => request.reject(new Error("Profiles unavailable")));

    expect(
      await screen.findByText(
        /Create a candidate profile before submitting jobs/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create profile →" }),
    ).toHaveAttribute("href", "/profiles/new");
    expect(
      screen.getByRole("button", { name: "Analyse this job" }),
    ).toBeDisabled();
  });

  it("shows profile labels in list order and submits the selected profile", async () => {
    const repositories = renderAnalyse("/analyse", (repositories) => {
      repositories.contexts.list.mockResolvedValue([
        { ...profile, targetRoles: ["Engineer", "Architect"] },
        { ...profile, id: "empty-profile", targetRoles: [], cvFileName: null },
      ]);
    });
    await screen.findByRole("option", { name: "Unnamed profile — No CV" });
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "Select a profile",
      "Engineer, Architect — cv.pdf",
      "Unnamed profile — No CV",
    ]);
    fireEvent.change(screen.getByLabelText("Candidate profile"), {
      target: { value: "empty-profile" },
    });
    fireEvent.change(screen.getByLabelText("Job posting"), {
      target: { value: "Job description" },
    });
    submitForm();

    await screen.findByRole("heading", { name: "Submission created" });
    expect(repositories.jobs.submit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ candidateContextId: "empty-profile" }),
    );
  });
});
function submitForm() {
  const form = screen
    .getByRole("button", { name: "Analyse this job" })
    .closest("form");
  if (!form) throw new Error("Job submission form missing");
  fireEvent.submit(form);
}

describe("job submission through the injected controller", () => {
  it("shows controller validation errors without submitting invalid input", async () => {
    const repositories = await showAnalyse();
    fireEvent.change(screen.getByLabelText("Job posting"), {
      target: { value: "  ab  " },
    });
    submitForm();
    await screen.findByText("Choose a candidate profile");
    expect(screen.getByText("Enter the job information")).toBeInTheDocument();
    expect(repositories.jobs.submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/analyse",
    );
  });

  it("switches modes, submits trimmed pasted text and opens the created submission", async () => {
    const repositories = await showAnalyse(
      "/analyse?type=URL&context=profile-id",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Job description Paste the full text/,
      }),
    );
    fireEvent.change(screen.getByLabelText("Job posting"), {
      target: { value: "  Job description \n" },
    });
    submitForm();
    await screen.findByRole("heading", { name: "Submission created" });
    expect(repositories.jobs.submit).toHaveBeenCalledExactlyOnceWith(
      "user-id",
      {
        submissionType: "TEXT",
        candidateContextId: "profile-id",
        jobContext: "Job description",
      },
    );
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/jobs/job-id",
    );
  });

  it("preserves a URL and profile supplied through query parameters", async () => {
    const url = "https://www.linkedin.com/jobs/view/123/";
    const repositories = await showAnalyse(
      `/analyse?type=URL&context=profile-id&jobContext=${encodeURIComponent(url)}`,
    );
    expect(
      screen.getByRole("button", { name: /Job URL Provide a link/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Job URL")).toHaveValue(url);
    submitForm();
    await screen.findByRole("heading", { name: "Submission created" });
    expect(repositories.jobs.submit).toHaveBeenCalledExactlyOnceWith(
      "user-id",
      {
        submissionType: "URL",
        candidateContextId: "profile-id",
        jobContext: url,
      },
    );
  });

  it("shows submission errors and stays on the form when the application fails", async () => {
    const repositories = await showAnalyse("/analyse?context=profile-id");
    repositories.jobs.submit.mockRejectedValue(
      new Error("Job submission unavailable"),
    );
    fireEvent.change(screen.getByLabelText("Job posting"), {
      target: { value: "Job description" },
    });
    submitForm();
    await screen.findByText("Job submission unavailable");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Analyse this job" }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/analyse",
    );
    expect(
      screen.queryByRole("heading", { name: "Submission created" }),
    ).not.toBeInTheDocument();
  });
});

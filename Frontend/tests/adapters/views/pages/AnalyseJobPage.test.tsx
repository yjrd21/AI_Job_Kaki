import { CandidateContextControllerContainer } from "../../../../src/adapters/containers/CandidateContextControllerContainer";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AnalyseJobPage } from "../../../../src/adapters/views/pages/AnalyseJobPage";
import { JobControllerContainer } from "../../../../src/adapters/containers/JobControllerContainer";
import { ApplicationContainer } from "../../../../src/adapters/containers/ApplicationContainer";
import { AuthContainerProvider } from "../../../../src/infrastructure/providers/AuthContainerProvider";
import { makeApplication, makeSession } from "../../../fixtures/application";

function CurrentRoute() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}
async function showAnalyse(path = "/analyse") {
  const {
    application,
    candidateContextController,
    jobController,
    repositories,
  } = makeApplication();
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
  await screen.findByRole("option", { name: /Engineer/ });
  return repositories;
}
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

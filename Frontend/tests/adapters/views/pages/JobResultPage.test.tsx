import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { JobResultPage } from "../../../../src/adapters/views/pages/JobResultPage";
import { JobControllerContainer } from "../../../../src/adapters/containers/JobControllerContainer";
import { AuthContainerProvider } from "../../../../src/infrastructure/providers/AuthContainerProvider";
import {
  analysis,
  job,
  makeApplication,
  makeSession,
} from "../../../fixtures/application";
import type {
  JobAnalysis,
  JobSubmission,
} from "../../../../src/domain/models/Job";

function showResult(
  update: Partial<JobSubmission> = {},
  requestError?: Error,
  reportError?: Error,
  report: Partial<JobAnalysis> = {},
) {
  const { jobController, jobPresenter, repositories } = makeApplication();
  repositories.jobs.get.mockResolvedValue({ ...job, ...update });
  repositories.analyses.get.mockResolvedValue({ ...analysis, ...report });
  if (requestError) repositories.jobs.get.mockRejectedValue(requestError);
  if (reportError) repositories.analyses.get.mockRejectedValue(reportError);
  const failed = vi.spyOn(jobPresenter, "presentFailed");
  const requestFailed = vi.spyOn(jobPresenter, "presentRequestError");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const session = makeSession();
  render(
    <QueryClientProvider client={queryClient}>
      <JobControllerContainer.Provider value={jobController}>
        <AuthContainerProvider session={session}>
          <MemoryRouter
            initialEntries={["/jobs/job-id"]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              <Route path="/history" element={<p>Submission history</p>} />
              <Route path="/jobs/:jobId" element={<JobResultPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContainerProvider>
      </JobControllerContainer.Provider>
    </QueryClientProvider>,
  );
  return { failed, requestFailed, repositories };
}

describe("job result through the use-case presenter boundary", () => {
  it("navigates to history after successful confirmed deletion", async () => {
    const { repositories } = showResult();
    await screen.findByText("Your analysis is in the queue.");
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete submission" }),
      );
      await screen.findByText("Submission history");
      expect(repositories.jobs.delete).toHaveBeenCalledExactlyOnceWith(
        "user-id",
        "job-id",
      );
    } finally {
      confirmation.mockRestore();
    }
  });

  it("retains the result page when deletion fails or is cancelled", async () => {
    const { repositories } = showResult();
    await screen.findByText("Your analysis is in the queue.");
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete submission" }),
      );
      expect(repositories.jobs.delete).not.toHaveBeenCalled();
      confirmation.mockReturnValue(true);
      repositories.jobs.delete.mockRejectedValue(
        new Error("Deletion unavailable"),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Delete submission" }),
      );
      await screen.findByText("Deletion unavailable");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Delete submission" }),
        ).toBeEnabled(),
      );
      expect(screen.queryByText("Submission history")).not.toBeInTheDocument();
    } finally {
      confirmation.mockRestore();
    }
  });

  it("displays the public failure message and switches the recovery action to pasted text", async () => {
    const { failed, requestFailed } = showResult({
      status: "FAILED",
      submissionType: "URL",
      errorCode: "JOB_SOURCE_INACCESSIBLE",
      errorMessage:
        "We couldn't retrieve this LinkedIn posting. Please paste the full job description.",
    });
    await screen.findByText(/We couldn't retrieve this LinkedIn posting/);
    expect(
      screen.getByRole("link", { name: /Paste job description/ }),
    ).toHaveAttribute("href", "/analyse?type=TEXT&context=profile-id");
    expect(failed).toHaveBeenCalledOnce();
    expect(requestFailed).not.toHaveBeenCalled();
  });

  it("supports older submissions without error fields", async () => {
    showResult({ status: "FAILED" });
    await screen.findByText(
      /Please paste the full job description and try again/,
    );
  });

  it("directs CV failures to the selected candidate profile", async () => {
    showResult({
      status: "FAILED",
      errorCode: "CV_CONTENT_UNAVAILABLE",
      errorMessage: "Upload a readable CV to your candidate profile.",
    });
    expect(
      await screen.findByRole("link", { name: /Update candidate profile/ }),
    ).toHaveAttribute("href", "/profiles/profile-id");
    expect(
      screen.queryByRole("link", { name: /Paste job description/ }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["PENDING", "Your analysis is in the queue."],
    ["PROCESSING", "We're reviewing the opportunity."],
  ] as const)(
    "renders the presenter state for %s without loading a report",
    async (status, heading) => {
      const { repositories } = showResult({ status });
      await screen.findByRole("heading", { name: heading });
      expect(repositories.analyses.get).not.toHaveBeenCalled();
    },
  );

  it("retrieves completed reports and renders the presenter's report text", async () => {
    const { repositories } = showResult({
      status: "COMPLETED",
      jobAnalysisId: "analysis-id",
    });
    await screen.findByText(analysis.matchSummary);
    expect(
      screen.getByText("Role overview is unavailable for this analysis."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Run a new analysis/ }),
    ).toHaveAttribute(
      "href",
      "/analyse?type=TEXT&context=profile-id&jobContext=Job%20description",
    );
    expect(screen.getByText("02 — THEIR REQUIREMENTS")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How your CV matches" }),
    ).toBeInTheDocument();
    expect(repositories.analyses.get).toHaveBeenCalledExactlyOnceWith(
      "analysis-id",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Job analysis",
    );
  });

  it("renders the generated role overview without the missing-overview action", async () => {
    const overview =
      "Build video creation tools. Deliver mobile and backend features. Requires CS fundamentals.";
    showResult(
      { status: "COMPLETED", jobAnalysisId: "analysis-id" },
      undefined,
      undefined,
      { roleOverview: overview },
    );
    expect(await screen.findByText(overview)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Run a new analysis/ }),
    ).not.toBeInTheDocument();
  });

  it("renders retrieval errors without presenting an analysis failure or recovery link", async () => {
    const failure = new Error("Job request unavailable");
    const { failed, requestFailed } = showResult({}, failure);
    await screen.findByText("Job request unavailable");
    expect(requestFailed).toHaveBeenCalledExactlyOnceWith("getJob", failure);
    expect(failed).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: /Paste job description/ }),
    ).not.toBeInTheDocument();
  });

  it("renders report retrieval errors separately from failed analyses", async () => {
    const failure = new Error("Report request unavailable");
    const { failed, requestFailed } = showResult(
      { status: "COMPLETED", jobAnalysisId: "analysis-id" },
      undefined,
      failure,
    );
    await screen.findByText("Report request unavailable");
    expect(requestFailed).toHaveBeenCalledExactlyOnceWith(
      "getAnalysis",
      failure,
    );
    expect(failed).not.toHaveBeenCalled();
  });
});

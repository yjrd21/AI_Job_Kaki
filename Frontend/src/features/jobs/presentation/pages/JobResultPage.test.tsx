import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JobResultPage } from "./JobResultPage";
import { useJob } from "../hooks/useJobs";

vi.mock("../hooks/useJobs", () => ({
  useJob: vi.fn(),
  useAnalysis: vi.fn(() => ({})),
  useDeleteJob: vi.fn(() => ({})),
}));

afterEach(cleanup);

function showFailure(
  errorMessage?: string,
  errorCode = "JOB_SOURCE_INACCESSIBLE",
) {
  vi.mocked(useJob).mockReturnValue({
    data: {
      id: "job-id",
      status: "FAILED",
      submissionType: "URL",
      candidateContextId: "profile-id",
      jobContext: "https://www.linkedin.com/jobs/view/4459735599/",
      createdAt: "2026-10-17T07:13:08Z",
      errorCode,
      errorMessage,
    },
  } as ReturnType<typeof useJob>);
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <JobResultPage />
    </MemoryRouter>,
  );
}

describe("failed job analysis", () => {
  it("displays the public failure message and switches the fallback to pasted text", () => {
    showFailure(
      "We couldn't retrieve this LinkedIn posting. Please paste the full job description.",
    );
    expect(
      screen.getByText(/We couldn't retrieve this LinkedIn posting/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Paste job description/ }),
    ).toHaveAttribute("href", "/analyse?type=TEXT&context=profile-id");
  });

  it("supports older submissions without error fields", () => {
    showFailure();
    expect(
      screen.getByText(/Please paste the full job description and try again/),
    ).toBeInTheDocument();
  });
  it("directs CV failures to the selected candidate profile", () => {
    showFailure(
      "Upload a readable CV to your candidate profile.",
      "CV_CONTENT_UNAVAILABLE",
    );
    expect(
      screen.getByRole("link", { name: /Update candidate profile/ }),
    ).toHaveAttribute("href", "/profiles/profile-id");
    expect(
      screen.queryByRole("link", { name: /Paste job description/ }),
    ).not.toBeInTheDocument();
  });
});

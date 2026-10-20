import { describe, expect, it } from "vitest";
import {
  JobPresenter,
  JobRequestError,
} from "../../../src/adapters/presenters/JobPresenter";
import { analysis, job } from "../../fixtures/application";

describe("stateless JobPresenter output", () => {
  it("encodes recovery links and retains pasted text only for text submissions", () => {
    const presenter = new JobPresenter();
    const input = {
      ...job,
      status: "FAILED" as const,
      candidateContextId: "profile/a?b",
      jobContext: "Role & responsibilities?",
    };
    const text = presenter.presentFailed(input);
    expect(text.presentation).toMatchObject({
      state: "failed",
      actionHref:
        "/analyse?type=TEXT&context=profile%2Fa%3Fb&jobContext=Role%20%26%20responsibilities%3F",
    });
    expect(
      presenter.presentFailed({ ...input, submissionType: "URL" }).presentation,
    ).toMatchObject({
      actionHref: "/analyse?type=TEXT&context=profile%2Fa%3Fb",
    });
    expect(
      presenter.presentFailed({ ...input, errorCode: "CV_MISSING" })
        .presentation,
    ).toMatchObject({ actionHref: "/profiles/profile%2Fa%3Fb" });
  });

  it("returns independent presentation without mutating cached input or previous output", () => {
    const presenter = new JobPresenter();
    const pending = presenter.presentPending(job);
    const completed = presenter.presentCompleted({
      ...job,
      id: "another-job",
      status: "COMPLETED",
    });
    expect(pending).toMatchObject({
      id: "job-id",
      presentation: { state: "pending" },
    });
    expect(completed).toMatchObject({
      id: "another-job",
      presentation: { state: "completed" },
    });
    expect(job).not.toHaveProperty("presentation");
    expect(presenter.presentAnalysis(analysis).presentation).toMatchObject({
      heading: "Job analysis",
      companyContext: "Company context was not provided in the posting.",
    });
    expect(analysis).not.toHaveProperty("presentation");
  });

  it("preserves the cause and operation when presenting request errors", () => {
    const presenter = new JobPresenter();
    const cause = new Error("Request unavailable");
    expect(() => presenter.presentRequestError("getJob", cause)).toThrow(
      JobRequestError,
    );
    try {
      presenter.presentRequestError("getJob", cause);
    } catch (error) {
      expect(error).toMatchObject({
        operation: "getJob",
        state: "request-error",
        message: "Request unavailable",
        cause,
      });
    }
    expect(() => presenter.presentRequestError("getAnalysis", null)).toThrow(
      "Unable to complete the job request. Please try again.",
    );
  });
});

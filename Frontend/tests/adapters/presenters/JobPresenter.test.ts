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
      roleOverview: "Role overview is unavailable for this analysis.",
    });
    expect(analysis).not.toHaveProperty("presentation");
  });

  it("keeps the role overview separate from candidate suitability", () => {
    const presenter = new JobPresenter();
    const overview =
      "Build video creation experiences across mobile and backend.";
    const report = presenter.presentAnalysis({
      ...analysis,
      roleOverview: overview,
    });
    expect(report.presentation.roleOverview).toBe(overview);
    expect(report.presentation.hasRoleOverview).toBe(true);
    expect(report.matchSummary).toBe(analysis.matchSummary);
  });

  it.each([null, undefined, "", "   "])(
    "presents missing or blank overview %s without claiming the posting lacked information",
    (overview) => {
      const presenter = new JobPresenter();
      const legacy = { ...analysis, roleOverview: overview };
      if (overview === undefined) delete legacy.roleOverview;
      const report = presenter.presentAnalysis(legacy as typeof analysis);
      expect(report.presentation).toMatchObject({
        hasRoleOverview: false,
        roleOverview: "Role overview is unavailable for this analysis.",
      });
    },
  );

  it.each(["TEXT", "URL"] as const)(
    "prefills reanalysis for %s submissions",
    (type) => {
      const presenter = new JobPresenter();
      const report = presenter.presentCompleted({
        ...job,
        submissionType: type,
        candidateContextId: "profile/a?b",
        jobContext: "https://example.test/job?a=1&b=2",
      });
      expect(report.presentation.state).toBe("completed");
      if (report.presentation.state !== "completed")
        throw new Error("Expected completed");
      const params = new URL(
        report.presentation.reanalyseHref,
        "https://example.test",
      ).searchParams;
      expect(params.get("type")).toBe(type);
      expect(params.get("context")).toBe("profile/a?b");
      expect(params.get("jobContext")).toBe("https://example.test/job?a=1&b=2");
    },
  );

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

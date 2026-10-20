import { describe, expect, it } from "vitest";
import type { JobControllerContract } from "../../../src/application/contracts/controllers/JobControllerContract";
import { job, makeApplication } from "../../fixtures/application";

const input = {
  submissionType: "TEXT" as const,
  candidateContextId: "profile-id",
  jobContext: "Job description",
};

describe("JobController", () => {
  it("returns plain field feedback without invoking the application API", () => {
    const { jobController, repositories } = makeApplication();
    const controller: JobControllerContract = jobController;
    expect(
      controller.validateJob({
        submissionType: "OTHER",
        candidateContextId: "",
        jobContext: "  ab  ",
      }),
    ).toEqual({
      valid: false,
      errors: {
        submissionType: "Choose a submission type",
        candidateContextId: "Choose a candidate profile",
        jobContext: "Enter the job information",
      },
      formError: undefined,
    });
    expect(repositories.jobs.submit).not.toHaveBeenCalled();
  });

  it("reports malformed input through its validation contract", () => {
    const { jobController } = makeApplication();
    expect(jobController.validateJob(null)).toMatchObject({
      valid: false,
      formError: expect.any(String),
    });
  });

  it("trims and validates the values returned to the form", () => {
    const { jobController } = makeApplication();
    expect(
      jobController.validateJob({
        ...input,
        jobContext: "  Job description \n",
      }),
    ).toEqual({ valid: true, values: input });
  });

  it("rejects invalid direct submissions before invoking the application API", async () => {
    const { jobController, repositories } = makeApplication();
    await expect(
      jobController.submitJob("user-id", { ...input, jobContext: "   " }),
    ).rejects.toThrow();
    expect(repositories.jobs.submit).not.toHaveBeenCalled();
  });

  it.each(["TEXT", "URL"] as const)(
    "prepares %s submissions even when form validation is bypassed",
    async (submissionType) => {
      const { jobController, repositories } = makeApplication();
      const jobContext =
        submissionType === "TEXT"
          ? "Job description"
          : "https://www.linkedin.com/jobs/view/123/";
      const submitted = {
        ...input,
        submissionType,
        jobContext: `  ${jobContext}  `,
        status: "COMPLETED",
      };
      expect(await jobController.submitJob("user-id", submitted)).toMatchObject(
        job,
      );
      expect(repositories.jobs.submit).toHaveBeenCalledExactlyOnceWith(
        "user-id",
        {
          submissionType,
          candidateContextId: "profile-id",
          jobContext,
        },
      );
    },
  );
});

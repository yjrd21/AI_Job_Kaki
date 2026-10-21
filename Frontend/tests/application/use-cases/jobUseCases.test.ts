import { describe, expect, it, vi } from "vitest";
import {
  submitJob,
  listJobs,
  getJob,
  deleteJob,
} from "../../../src/application/use-cases/jobUseCases";
import { getAnalysis } from "../../../src/application/use-cases/analysisUseCases";
import type {
  JobPresenterContract,
  JobOperationContract,
} from "../../../src/application/contracts/presenters/JobPresenterContract";
import type {
  JobSubmission,
  JobAnalysis,
} from "../../../src/domain/models/Job";

const job: JobSubmission = {
  id: "job-id",
  userId: "user-id",
  candidateContextId: "profile-id",
  submissionType: "TEXT",
  jobContext: "Job description",
  status: "PENDING",
  jobAnalysisId: null,
  createdAt: "2026-10-17T07:13:08Z",
  updatedAt: "2026-10-17T07:13:08Z",
};
const analysis: JobAnalysis = {
  id: "analysis-id",
  jobSubmissionId: "job-id",
  roleOverview: null,
  roleTitle: null,
  applicationDeadline: null,
  salaryRange: null,
  redFlags: [],
  requirements: [],
  matchSummary: "Report",
  questionsToClarify: [],
  createdAt: job.createdAt,
};
function setup() {
  const repository = {
    submit: vi.fn().mockResolvedValue(job),
    list: vi.fn().mockResolvedValue([job]),
    get: vi.fn().mockResolvedValue(job),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const analysisRepository = { get: vi.fn().mockResolvedValue(analysis) };
  const presenter = {
    presentSubmitted: vi.fn((value: JobSubmission) => ({
      ...value,
      selected: "submitted",
    })),
    presentJobs: vi.fn((values: JobSubmission[]) =>
      values.map((value) => ({ ...value, selected: "list" })),
    ),
    presentPending: vi.fn((value: JobSubmission) => ({
      ...value,
      selected: "pending",
    })),
    presentProcessing: vi.fn((value: JobSubmission) => ({
      ...value,
      selected: "processing",
    })),
    presentFailed: vi.fn((value: JobSubmission) => ({
      ...value,
      selected: "failed",
    })),
    presentCompleted: vi.fn((value: JobSubmission) => ({
      ...value,
      selected: "completed",
    })),
    presentAnalysis: vi.fn((value: JobAnalysis) => ({
      ...value,
      selected: "analysis",
    })),
    presentDeleted: vi.fn(),
    presentRequestError: vi.fn(
      (operation: JobOperationContract, error: unknown): never => {
        throw new Error(`${operation} request failed`, { cause: error });
      },
    ),
  } satisfies JobPresenterContract;
  return { repository, analysisRepository, presenter };
}

describe("job use-case output boundaries", () => {
  it.each([
    ["PENDING", "presentPending", "pending"],
    ["PROCESSING", "presentProcessing", "processing"],
    ["FAILED", "presentFailed", "failed"],
    ["COMPLETED", "presentCompleted", "completed"],
  ] as const)(
    "reports %s to the matching presenter callback",
    async (status, callback, selected) => {
      const { repository, presenter } = setup();
      const outcome = { ...job, status };
      repository.get.mockResolvedValue(outcome);
      expect(
        await getJob(repository, presenter, "user-id", "job-id"),
      ).toMatchObject({ ...outcome, selected });
      expect(presenter[callback]).toHaveBeenCalledExactlyOnceWith(outcome);
      expect(presenter.presentRequestError).not.toHaveBeenCalled();
      for (const other of [
        "presentPending",
        "presentProcessing",
        "presentFailed",
        "presentCompleted",
      ] as const) {
        if (other !== callback) expect(presenter[other]).not.toHaveBeenCalled();
      }
    },
  );

  it("passes submission input to the repository and returns presenter output", async () => {
    const { repository, presenter } = setup();
    const input = {
      candidateContextId: "profile-id",
      submissionType: "TEXT" as const,
      jobContext: "Job description",
    };
    expect(
      await submitJob(repository, presenter, "user-id", input),
    ).toMatchObject({ id: "job-id", selected: "submitted" });
    expect(repository.submit).toHaveBeenCalledWith("user-id", input);
    expect(presenter.presentSubmitted).toHaveBeenCalledExactlyOnceWith(job);
  });

  it("reports list, report and deletion results through their output callbacks", async () => {
    const { repository, analysisRepository, presenter } = setup();
    expect(await listJobs(repository, presenter, "user-id")).toMatchObject([
      { id: "job-id", selected: "list" },
    ]);
    expect(
      await getAnalysis(analysisRepository, presenter, "analysis-id"),
    ).toMatchObject({ id: "analysis-id", selected: "analysis" });
    await deleteJob(repository, presenter, "user-id", "job-id");
    expect(presenter.presentJobs).toHaveBeenCalledExactlyOnceWith([job]);
    expect(presenter.presentAnalysis).toHaveBeenCalledExactlyOnceWith(analysis);
    expect(presenter.presentDeleted).toHaveBeenCalledOnce();
  });

  it("reports an unsuccessful request separately from an analysis failure", async () => {
    const { repository, presenter } = setup();
    const error = new Error("Backend unavailable");
    repository.get.mockRejectedValue(error);
    await expect(
      getJob(repository, presenter, "user-id", "job-id"),
    ).rejects.toThrow("getJob request failed");
    expect(presenter.presentRequestError).toHaveBeenCalledExactlyOnceWith(
      "getJob",
      error,
    );
    expect(presenter.presentFailed).not.toHaveBeenCalled();
  });

  it("reports failed submissions, lists, deletions and report retrieval through the error boundary", async () => {
    const { repository, analysisRepository, presenter } = setup();
    const error = new Error("Backend unavailable");
    repository.submit.mockRejectedValue(error);
    repository.list.mockRejectedValue(error);
    repository.delete.mockRejectedValue(error);
    analysisRepository.get.mockRejectedValue(error);
    const input = {
      candidateContextId: "profile-id",
      submissionType: "TEXT" as const,
      jobContext: "Job description",
    };
    await expect(
      submitJob(repository, presenter, "user-id", input),
    ).rejects.toThrow("submitJob request failed");
    await expect(listJobs(repository, presenter, "user-id")).rejects.toThrow(
      "listJobs request failed",
    );
    await expect(
      deleteJob(repository, presenter, "user-id", "job-id"),
    ).rejects.toThrow("deleteJob request failed");
    await expect(
      getAnalysis(analysisRepository, presenter, "analysis-id"),
    ).rejects.toThrow("getAnalysis request failed");
    expect(
      presenter.presentRequestError.mock.calls.map(([operation]) => operation),
    ).toEqual(["submitJob", "listJobs", "deleteJob", "getAnalysis"]);
    expect(presenter.presentSubmitted).not.toHaveBeenCalled();
    expect(presenter.presentDeleted).not.toHaveBeenCalled();
  });

  it("does not misclassify presenter failures as repository errors", async () => {
    const { repository, presenter } = setup();
    const failure = new Error("Presenter failure");
    presenter.presentPending.mockImplementation(() => {
      throw failure;
    });
    await expect(
      getJob(repository, presenter, "user-id", "job-id"),
    ).rejects.toBe(failure);
    expect(presenter.presentRequestError).not.toHaveBeenCalled();
  });
});

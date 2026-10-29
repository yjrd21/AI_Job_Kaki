import { describe, expect, it, vi } from "vitest";
import {
  getPrimaryCandidateContext,
  listCandidateContexts,
} from "../../../src/application/use-cases/candidateContextUseCases";
import type { CandidateContext } from "../../../src/domain/models/CandidateContext";

import type { CandidateContextRepositoryContract } from "../../../src/application/contracts/repositories/CandidateContextRepositoryContract";

const first: CandidateContext = {
  cvFileName: null,
  id: "first",
  userId: "user",
  targetRoles: [],
  preferences: [],
  redFlags: [],
  createdAt: "2025-01-01",
  updatedAt: "2025-01-01",
};

describe("primary candidate context selection", () => {
  it("presents the first context without sorting or changing the supplied list", () => {
    const second = { ...first, id: "second", updatedAt: "2026-01-01" };
    const contexts = [first, second];
    const presenter = {
      presentPrimary: vi.fn(() => "primary"),
      presentEmpty: vi.fn(() => "empty"),
    };
    expect(getPrimaryCandidateContext(contexts, presenter)).toBe("primary");
    expect(presenter.presentPrimary).toHaveBeenCalledExactlyOnceWith(first);
    expect(presenter.presentEmpty).not.toHaveBeenCalled();
    expect(contexts).toEqual([first, second]);
  });

  it("uses the empty output boundary when there are no contexts", () => {
    const presenter = {
      presentPrimary: vi.fn(() => "primary"),
      presentEmpty: vi.fn(() => "empty"),
    };
    expect(getPrimaryCandidateContext([], presenter)).toBe("empty");
    expect(presenter.presentEmpty).toHaveBeenCalledOnce();
    expect(presenter.presentPrimary).not.toHaveBeenCalled();
  });
});

function repositoryReturning(contexts: CandidateContext[]) {
  const repository: CandidateContextRepositoryContract = {
    list: vi.fn().mockResolvedValue(contexts),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return repository;
}

describe("candidate context retrieval", () => {
  it("returns candidate contexts in their original order with unchanged data", async () => {
    const contexts = structuredClone([
      first,
      { ...first, id: "second", targetRoles: ["Engineer"] },
    ]);
    const expected = structuredClone(contexts);
    const repository = repositoryReturning(contexts);
    const result = await listCandidateContexts(repository, "candidate-owner");

    expect(result).toEqual(expected);
    expect(contexts).toEqual(expected);
    expect(repository.list).toHaveBeenCalledWith("candidate-owner");
  });

  it("returns an empty list when no candidate contexts are available", async () => {
    expect(
      await listCandidateContexts(repositoryReturning([]), "candidate-owner"),
    ).toEqual([]);
  });

  it("rejects with the repository error when candidate contexts cannot be loaded", async () => {
    const repository = repositoryReturning([]);
    const error = new Error("Candidate contexts unavailable");
    vi.mocked(repository.list).mockRejectedValue(error);

    await expect(
      listCandidateContexts(repository, "candidate-owner"),
    ).rejects.toBe(error);
  });
});

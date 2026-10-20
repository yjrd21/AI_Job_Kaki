import { describe, expect, it, vi } from "vitest";
import { getPrimaryCandidateContext } from "../../../src/application/use-cases/candidateContextUseCases";
import type { CandidateContext } from "../../../src/domain/models/CandidateContext";

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

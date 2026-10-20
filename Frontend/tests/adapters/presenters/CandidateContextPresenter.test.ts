import { describe, expect, it } from "vitest";
import { CandidateContextPresenter } from "../../../src/adapters/presenters/CandidateContextPresenter";
import { profile } from "../../fixtures/application";

describe("candidate context presentation", () => {
  it("prepares fallback labels and an encoded profile destination", () => {
    const context = {
      ...profile,
      id: "context/a b",
      targetRoles: [],
      cvFileName: null,
    };
    const output = new CandidateContextPresenter().presentPrimary(context);
    expect(output).toMatchObject({
      state: "ready",
      title: "Candidate profile",
      cvLabel: "No CV uploaded",
      targetRoles: "Not specified",
      actionHref: "/profiles/context%2Fa%20b",
    });
    expect(context.targetRoles).toEqual([]);
  });
});

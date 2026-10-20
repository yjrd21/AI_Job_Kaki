import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { createHttpClient } from "../../../src/infrastructure/clients/createHttpClient";
import { HttpJobRepository } from "../../../src/adapters/repositories/HttpJobRepository";
import { HttpAnalysisRepository } from "../../../src/adapters/repositories/HttpAnalysisRepository";
import { HttpUserRepository } from "../../../src/adapters/repositories/HttpUserRepository";
import { HttpCandidateContextRepository } from "../../../src/adapters/repositories/HttpCandidateContextRepository";
import { job, account, profile } from "../../fixtures/application";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const baseURL = "http://localhost:8080";
const transport = () => createHttpClient(baseURL, async () => "access-token");

describe("HTTP repositories through the real transport", () => {
  it("preserves submission payloads, encodes IDs and obtains a token for each request", async () => {
    const token = vi
      .fn()
      .mockResolvedValueOnce("first-token")
      .mockResolvedValueOnce("second-token");
    const repo = new HttpJobRepository(createHttpClient(baseURL, token));
    const input = {
      candidateContextId: "profile-id",
      submissionType: "TEXT" as const,
      jobContext: "Job description",
    };
    const headers: (string | null)[] = [];
    server.use(
      http.post(
        `${baseURL}/api/users/:userId/jobs`,
        async ({ request, params }) => {
          expect(params.userId).toBe("user/id");
          expect(await request.json()).toEqual(input);
          headers.push(request.headers.get("Authorization"));
          return HttpResponse.json(job);
        },
      ),
      http.delete(
        `${baseURL}/api/users/:userId/jobs/:jobId`,
        ({ request, params }) => {
          expect(params.jobId).toBe("job/id");
          headers.push(request.headers.get("Authorization"));
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    expect(await repo.submit("user/id", input)).toEqual(job);
    await repo.delete("user/id", "job/id");
    expect(headers).toEqual(["Bearer first-token", "Bearer second-token"]);
  });

  it("retains analysis defaults for null or missing arrays", async () => {
    server.use(
      http.get(`${baseURL}/api/job-analyses/:id`, () =>
        HttpResponse.json({
          id: "analysis-id",
          matchSummary: "Matches",
          requirements: null,
          redFlags: null,
        }),
      ),
    );
    const result = await new HttpAnalysisRepository(transport()).get(
      "analysis-id",
    );
    expect(result).toMatchObject({
      id: "analysis-id",
      matchSummary: "Matches",
      requirements: [],
      redFlags: [],
      questionsToClarify: [],
    });
  });

  it("retains account/onboarding and profile update endpoints", async () => {
    server.use(
      http.put(`${baseURL}/api/users/:id`, async ({ request }) => {
        expect(await request.json()).toEqual({ firstName: "Updated" });
        return HttpResponse.json({ ...account, firstName: "Updated" });
      }),
      http.post(`${baseURL}/api/users/:id/onboarding/complete`, () =>
        HttpResponse.json({ ...account, onboardingCompleted: true }),
      ),
      http.put(
        `${baseURL}/api/users/:id/candidate-contexts/:contextId`,
        async ({ request }) => {
          expect(await request.json()).toEqual({
            targetRoles: ["Engineer"],
            preferences: [],
            redFlags: [],
          });
          return HttpResponse.json(profile);
        },
      ),
    );
    const users = new HttpUserRepository(transport());
    expect(
      (await users.update("user-id", { firstName: "Updated" })).firstName,
    ).toBe("Updated");
    expect(
      (await users.completeOnboarding("user-id")).onboardingCompleted,
    ).toBe(true);
    expect(
      await new HttpCandidateContextRepository(transport()).update(
        "user-id",
        "profile-id",
        { targetRoles: ["Engineer"], preferences: [], redFlags: [] },
      ),
    ).toEqual(profile);
  });

  it.each(["message", "detail"])(
    "exposes the backend %s as an ordinary error and preserves the transport cause",
    async (field) => {
      server.use(
        http.get(`${baseURL}/api/users/:id/jobs/:jobId`, () =>
          HttpResponse.json(
            { [field]: "Submission not found" },
            { status: 404 },
          ),
        ),
      );
      const error = await new HttpJobRepository(transport())
        .get("user-id", "missing")
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({
        message: "Submission not found",
        name: "Error",
        cause: { response: { status: 404 } },
      });
    },
  );
});

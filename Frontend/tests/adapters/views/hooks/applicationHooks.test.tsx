import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthSessionProvider } from "../../../../src/infrastructure/providers/AuthSessionProvider";
import {
  useJob,
  useDeleteJob,
  jobKeys,
} from "../../../../src/adapters/hooks/useJobs";
import {
  useAccount,
  useSaveAccount,
} from "../../../../src/adapters/hooks/useAccount";
import {
  useContext,
  useContexts,
  useSaveContext,
} from "../../../../src/adapters/hooks/useContexts";
import {
  makeControllers,
  makeSession,
  job,
  account,
  profile,
} from "../../../fixtures/application";

function setup() {
  const {
    candidateContextController,
    accountController,
    jobController,
    jobPresenter,
    repositories,
  } = makeControllers();
  const session = makeSession();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
      </QueryClientProvider>
    );
  }
  return {
    wrapper,
    queryClient,
    jobPresenter,
    repositories,
    candidateContextController,
    accountController,
    jobController,
  };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("hooks with injected application operations", () => {
  it("reuses cached presenter output without another request or presentation callback", async () => {
    const { wrapper, repositories, jobPresenter, jobController } = setup();
    repositories.jobs.get.mockResolvedValue({
      ...job,
      status: "FAILED",
      errorCode: "CV_MISSING",
    });
    const presented = vi.spyOn(jobPresenter, "presentFailed");
    const first = renderHook(() => useJob("job-id", jobController), {
      wrapper,
    });
    await waitFor(() =>
      expect(first.result.current.data?.presentation.state).toBe("failed"),
    );
    first.unmount();

    const second = renderHook(() => useJob("job-id", jobController), {
      wrapper,
    });
    await waitFor(() =>
      expect(second.result.current.data?.presentation).toMatchObject({
        state: "failed",
        actionLabel: "Update candidate profile",
      }),
    );
    expect(repositories.jobs.get).toHaveBeenCalledTimes(1);
    expect(presented).toHaveBeenCalledTimes(1);
  });

  it("keeps a late response for a previous job out of the current job's display state", async () => {
    const { wrapper, queryClient, repositories, jobController } = setup();
    let resolvePrevious!: (value: typeof job) => void;
    const previous = new Promise<typeof job>((resolve) => {
      resolvePrevious = resolve;
    });
    repositories.jobs.get.mockImplementation((_userId: string, id: string) =>
      id === "previous-job"
        ? previous
        : Promise.resolve({
            ...job,
            id,
            status: "FAILED",
            errorMessage: "Current job failed",
          }),
    );
    const hook = renderHook(({ id }) => useJob(id, jobController), {
      wrapper,
      initialProps: { id: "previous-job" },
    });
    await waitFor(() =>
      expect(repositories.jobs.get).toHaveBeenCalledWith(
        "user-id",
        "previous-job",
      ),
    );
    hook.rerender({ id: "current-job" });
    await waitFor(() =>
      expect(hook.result.current.data?.presentation).toMatchObject({
        state: "failed",
        message: "Current job failed",
      }),
    );

    await act(async () => {
      resolvePrevious({ ...job, id: "previous-job" });
    });
    await waitFor(() =>
      expect(
        queryClient.getQueryData(jobKeys.one("user-id", "previous-job")),
      ).toMatchObject({
        id: "previous-job",
        presentation: { state: "pending" },
      }),
    );
    expect(hook.result.current.data).toMatchObject({
      id: "current-job",
      presentation: { state: "failed", message: "Current job failed" },
    });
  });

  it.each(["COMPLETED", "FAILED"] as const)(
    "polls pending work and stops at %s",
    async (status) => {
      vi.useFakeTimers();
      const { wrapper, repositories, jobController } = setup();
      repositories.jobs.get
        .mockResolvedValueOnce(job)
        .mockResolvedValue({ ...job, status });
      renderHook(() => useJob("job-id", jobController), { wrapper });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(repositories.jobs.get).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
      expect(repositories.jobs.get).toHaveBeenCalledTimes(2);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(repositories.jobs.get).toHaveBeenCalledTimes(2);
      expect(repositories.jobs.get).toHaveBeenCalledWith("user-id", "job-id");
    },
  );

  it("routes deletion through the application and invalidates only the current user's list", async () => {
    const {
      wrapper,
      queryClient,
      repositories,
      accountController,
      jobController,
    } = setup();
    queryClient.setQueryData(jobKeys.all("user-id"), [job]);
    queryClient.setQueryData(jobKeys.all("another-user"), []);
    const hook = renderHook(
      () => ({
        account: useAccount(accountController),
        deletion: useDeleteJob(jobController),
      }),
      { wrapper },
    );
    await waitFor(() =>
      expect(hook.result.current.account.isSuccess).toBe(true),
    );
    await act(async () => {
      await hook.result.current.deletion.mutateAsync("job-id");
    });
    expect(repositories.jobs.delete).toHaveBeenCalledWith("user-id", "job-id");
    expect(
      queryClient.getQueryState(jobKeys.all("user-id"))?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(jobKeys.all("another-user"))?.isInvalidated,
    ).toBe(false);
  });

  it("shares account cache and refreshes it after account mutations", async () => {
    const { wrapper, repositories, accountController } = setup();
    const hook = renderHook(
      () => ({
        account: useAccount(accountController),
        save: useSaveAccount(accountController),
      }),
      { wrapper },
    );
    await waitFor(() =>
      expect(hook.result.current.account.isSuccess).toBe(true),
    );
    expect(repositories.users.get).toHaveBeenCalledTimes(1);
    repositories.users.get.mockResolvedValue({
      ...account,
      firstName: "Updated",
    });
    await act(async () => {
      await hook.result.current.save.mutateAsync({
        firstName: "Updated",
        lastName: account.lastName,
        email: account.email,
      });
    });
    await waitFor(() =>
      expect(hook.result.current.account.data?.firstName).toBe("Updated"),
    );
    expect(repositories.users.update).toHaveBeenCalledWith("user-id", {
      firstName: "Updated",
      lastName: account.lastName,
      email: account.email,
    });
  });

  it("refreshes both profile list and detail after an edit", async () => {
    const { wrapper, repositories, candidateContextController } = setup();
    const hook = renderHook(
      () => ({
        list: useContexts(candidateContextController),
        detail: useContext("profile-id", candidateContextController),
        save: useSaveContext("profile-id", candidateContextController),
      }),
      { wrapper },
    );
    await waitFor(() =>
      expect(
        hook.result.current.detail.isSuccess &&
          hook.result.current.list.isSuccess,
      ).toBe(true),
    );
    const updated = { ...profile, targetRoles: ["Designer"] };
    repositories.contexts.list.mockResolvedValue([updated]);
    repositories.contexts.get.mockResolvedValue(updated);
    const input = { targetRoles: ["Designer"], preferences: [], redFlags: [] };
    await act(async () => {
      await hook.result.current.save.mutateAsync(input);
    });
    await waitFor(() => {
      expect(hook.result.current.list.data?.[0].targetRoles).toEqual([
        "Designer",
      ]);
      expect(hook.result.current.detail.data?.targetRoles).toEqual([
        "Designer",
      ]);
    });
    expect(repositories.contexts.update).toHaveBeenCalledWith(
      "user-id",
      "profile-id",
      input,
    );
    expect(repositories.contexts.create).not.toHaveBeenCalled();
  });
});

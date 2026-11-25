import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthContext } from "../../../../src/adapters/AuthContext";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthSessionProvider } from "../../../../src/infrastructure/providers/AuthSessionProvider";
import type { AuthSessionContract } from "../../../../src/application/contracts/clients/AuthClientContract";
import { makeSession, signedIn } from "../../../fixtures/application";

function Status() {
  const auth = useAuthContext();
  return (
    <div>
      {!auth.lifecycle.ready
        ? "Connecting"
        : auth.session.error || auth.session.userId || "Signed out"}
    </div>
  );
}

function Logout() {
  const auth = useAuthContext();
  return <button onClick={() => void auth.actions.logout()}>Logout</button>;
}

function withQueryClient(
  children: React.ReactNode,
  client = new QueryClient(),
) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("AuthSessionProvider", () => {
  it("restores a session, observes logout and removes its subscription on unmount", async () => {
    const session = makeSession();
    let publish: ((value: AuthSessionContract) => void) | undefined;
    const unsubscribe = vi.fn();
    vi.mocked(session.subscribe).mockImplementation((listener) => {
      publish = listener;
      return unsubscribe;
    });
    const view = render(
      withQueryClient(
        <AuthSessionProvider session={session}>
          <Status />
        </AuthSessionProvider>,
      ),
    );
    expect(screen.getByText("Connecting")).toBeInTheDocument();
    await screen.findByText("user-id");
    act(() =>
      publish?.({ ...signedIn, authenticated: false, userId: null, name: "" }),
    );
    expect(screen.getByText("Signed out")).toBeInTheDocument();
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("ignores a previous session's late initialisation after dependencies change", async () => {
    const previous = makeSession();
    let resolvePrevious!: (value: AuthSessionContract) => void;
    vi.mocked(previous.initialise).mockReturnValue(
      new Promise((resolve) => {
        resolvePrevious = resolve;
      }),
    );
    const next = makeSession({ ...signedIn, userId: "next-user" });
    const queryClient = new QueryClient();
    const view = render(
      withQueryClient(
        <AuthSessionProvider session={previous}>
          <Status />
        </AuthSessionProvider>,
        queryClient,
      ),
    );
    view.rerender(
      withQueryClient(
        <AuthSessionProvider session={next}>
          <Status />
        </AuthSessionProvider>,
        queryClient,
      ),
    );
    await screen.findByText("next-user");
    await act(async () => resolvePrevious(signedIn));
    expect(screen.getByText("next-user")).toBeInTheDocument();
  });

  it("finishes initialisation with an error when configuration is missing", async () => {
    const session = makeSession();
    vi.mocked(session.initialise).mockRejectedValue(
      new Error("Keycloak configuration is missing.."),
    );
    render(
      withQueryClient(
        <AuthSessionProvider session={session}>
          <Status />
        </AuthSessionProvider>,
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Keycloak configuration is missing.."),
      ).toBeInTheDocument(),
    );
  });

  it("clears cached data when the signed-in identity changes or signs out", async () => {
    const session = makeSession();
    let publish!: (value: AuthSessionContract) => void;
    vi.mocked(session.subscribe).mockImplementation((listener) => {
      publish = listener;
      return () => undefined;
    });
    const queryClient = new QueryClient();
    render(
      withQueryClient(
        <AuthSessionProvider session={session}>
          <Status />
        </AuthSessionProvider>,
        queryClient,
      ),
    );
    await screen.findByText("user-id");
    queryClient.setQueryData(["account", "user-id"], "old account");
    act(() => publish({ ...signedIn, userId: "next-user" }));
    expect(queryClient.getQueryData(["account", "user-id"])).toBeUndefined();
    expect(screen.getByText("next-user")).toBeInTheDocument();

    queryClient.setQueryData(["account", "next-user"], "next account");
    act(() => publish({ ...signedIn, authenticated: false, userId: null }));
    expect(queryClient.getQueryData(["account", "next-user"])).toBeUndefined();
    expect(screen.getByText("Signed out")).toBeInTheDocument();
  });

  it("clears cached data after logout succeeds", async () => {
    const session = makeSession();
    const queryClient = new QueryClient();
    render(
      withQueryClient(
        <AuthSessionProvider session={session}>
          <Status />
          <Logout />
        </AuthSessionProvider>,
        queryClient,
      ),
    );
    await screen.findByText("user-id");
    queryClient.setQueryData(["account", "user-id"], "old account");
    await act(async () => screen.getByText("Logout").click());
    expect(session.logout).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(["account", "user-id"])).toBeUndefined();
    expect(screen.getByText("Signed out")).toBeInTheDocument();
  });

  it("does not clear a new session when an earlier logout finishes late", async () => {
    const session = makeSession();
    let publish!: (value: AuthSessionContract) => void;
    let finishLogout!: () => void;
    vi.mocked(session.subscribe).mockImplementation((listener) => {
      publish = listener;
      return () => undefined;
    });
    vi.mocked(session.logout).mockReturnValue(
      new Promise((resolve) => {
        finishLogout = resolve;
      }),
    );
    const queryClient = new QueryClient();
    render(
      withQueryClient(
        <AuthSessionProvider session={session}>
          <Status />
          <Logout />
        </AuthSessionProvider>,
        queryClient,
      ),
    );
    await screen.findByText("user-id");
    act(() => screen.getByText("Logout").click());
    act(() => publish({ ...signedIn, userId: "next-user" }));
    queryClient.setQueryData(["account", "next-user"], "next account");
    await act(async () => finishLogout());
    expect(screen.getByText("next-user")).toBeInTheDocument();
    expect(queryClient.getQueryData(["account", "next-user"])).toBe(
      "next account",
    );
  });
});

import { useContext } from "react";
import { AuthContainer } from "../../../../src/adapters/containers/AuthContainer";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthContainerProvider } from "../../../../src/infrastructure/providers/AuthContainerProvider";
import type { AuthSessionContract } from "../../../../src/application/contracts/clients/AuthClientContract";
import { makeSession, signedIn } from "../../../fixtures/application";

function Status() {
  const auth = useContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }
  return (
    <div>
      {!auth.ready ? "Connecting" : auth.error || auth.userId || "Signed out"}
    </div>
  );
}

describe("AuthContainerProvider", () => {
  it("restores a session, observes logout and removes its subscription on unmount", async () => {
    const session = makeSession();
    let publish: ((value: AuthSessionContract) => void) | undefined;
    const unsubscribe = vi.fn();
    vi.mocked(session.subscribe).mockImplementation((listener) => {
      publish = listener;
      return unsubscribe;
    });
    const view = render(
      <AuthContainerProvider session={session}>
        <Status />
      </AuthContainerProvider>,
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
    const view = render(
      <AuthContainerProvider session={previous}>
        <Status />
      </AuthContainerProvider>,
    );
    view.rerender(
      <AuthContainerProvider session={next}>
        <Status />
      </AuthContainerProvider>,
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
      <AuthContainerProvider session={session}>
        <Status />
      </AuthContainerProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByText("Keycloak configuration is missing.."),
      ).toBeInTheDocument(),
    );
  });
});

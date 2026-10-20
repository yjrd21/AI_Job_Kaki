import { useMutation } from "@tanstack/react-query";
import { AuthContainer } from "../containers/AuthContainer";
import { useContext, useEffect, useMemo, useState } from "react";
import type {
  AuthClientContract,
  AuthSessionContract,
} from "../../application/contracts/clients/AuthClientContract";
import type { AuthState } from "../containers/AuthContainer";

// Provide the initial anonymous state before session restoration completes.
const signedOut: AuthSessionContract = {
  authenticated: false,
  userId: null,
  name: "",
  error: null,
};

// Restore the injected session and adapt its lifecycle to React state.
export function useAuthSession(session: AuthClientContract): AuthState {
  // Start with an anonymous session while authentication is being restored.
  const [state, setState] = useState({ ...signedOut, ready: false });

  // Restore and observe the supplied session for the lifetime of this provider effect.
  useEffect(() => {
    // Prevent an expired effect from updating state after cleanup or dependency replacement.
    let live = true;

    setState({ ...signedOut, ready: false });

    // Subscribe to identity changes while retaining the current initialisation state.
    const unsubscribe = session.subscribe((next) => {
      if (live) setState((previous) => ({ ...next, ready: previous.ready }));
    });

    // Finish the initial session check or expose its failure once restoration settles.
    void session.initialise().then(
      (next) => {
        if (live) setState({ ...next, ready: true });
      },
      (error: unknown) => {
        if (live)
          setState({
            ...signedOut,
            ready: true,
            error:
              error instanceof Error ? error.message : "Authentication failed",
          });
      },
    );

    // Stop observing the old session and ignore any late initialisation result.
    return () => {
      live = false;
      unsubscribe();
    };
  }, [session]);

  // Memoise session state and delegate login and logout to the injected contract.
  const value = useMemo<AuthState>(
    () => ({
      ...state,
      login: () => session.login(),
      logout: () => session.logout(),
    }),
    [state, session],
  );

  return value;
}

// Expose sign-in state and handle rejected login requests without leaking promises from the view.
export function useLogin() {
  const auth = useContext(AuthContainer);

  if (!auth) throw new Error("AuthContainer provider missing");

  const login = useMutation({ mutationFn: () => auth.login() });

  return {
    authenticated: auth.authenticated,
    error: login.error
      ? login.error instanceof Error
        ? login.error.message
        : "Unable to sign in. Please try again."
      : auth.error,
    isPending: login.isPending,
    onLogin: () => login.mutate(),
  };
}

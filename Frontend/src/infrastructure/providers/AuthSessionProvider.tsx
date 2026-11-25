import { useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthClientContract } from "../../application/contracts/clients/AuthClientContract";
import type { AuthSessionContract } from "../../application/contracts/clients/AuthClientContract";
import { AuthContext, type AuthContextValue } from "../../adapters/AuthContext";

const signedOut: AuthSessionContract = {
  authenticated: false,
  userId: null,
  name: "",
  error: null,
};

type SessionState = {
  session: AuthSessionContract;
  ready: boolean;
  sessionVersion: number;
};

type SessionEvent =
  | { type: "initialization-started"; sessionVersion: number }
  | {
      type: "session-changed";
      session: AuthSessionContract;
      sessionVersion: number;
    }
  | {
      type: "initialization-completed";
      session: AuthSessionContract;
      sessionVersion: number;
    }
  | {
      type: "initialization-failed";
      message: string;
      sessionVersion: number;
    }
  | { type: "logout-completed"; sessionVersion: number };

function sessionReducer(
  state: SessionState,
  event: SessionEvent,
): SessionState {
  switch (event.type) {
    case "initialization-started":
      return {
        session: signedOut,
        ready: false,
        sessionVersion: event.sessionVersion,
      };
    case "session-changed":
      return {
        ...state,
        session: event.session,
        sessionVersion: event.sessionVersion,
      };
    case "initialization-completed":
      return {
        session: event.session,
        ready: true,
        sessionVersion: event.sessionVersion,
      };
    case "initialization-failed":
      return {
        session: { ...signedOut, error: event.message },
        ready: true,
        sessionVersion: event.sessionVersion,
      };
    case "logout-completed":
      return {
        session: signedOut,
        ready: state.ready,
        sessionVersion: event.sessionVersion,
      };
  }
}

// Own session transitions and expose their state to the React component tree.
export function AuthSessionProvider({
  session,
  children,
}: {
  session: AuthClientContract;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(sessionReducer, {
    session: signedOut,
    ready: false,
    sessionVersion: 0,
  });
  const queryClient = useQueryClient();
  const currentUserId = useRef<string | null>(null);
  const identityVersion = useRef(0);

  useEffect(() => {
    let active = true;

    if (currentUserId.current !== null) {
      queryClient.clear();
      currentUserId.current = null;
      identityVersion.current++;
    }
    dispatch({
      type: "initialization-started",
      sessionVersion: identityVersion.current,
    });

    const updateIdentity = (next: AuthSessionContract) => {
      const nextUserId = next.authenticated ? next.userId : null;
      if (currentUserId.current !== nextUserId) {
        if (currentUserId.current !== null) queryClient.clear();
        identityVersion.current++;
      }
      currentUserId.current = nextUserId;
      return identityVersion.current;
    };

    const unsubscribe = session.subscribe((next) => {
      if (!active) return;
      dispatch({
        type: "session-changed",
        session: next,
        sessionVersion: updateIdentity(next),
      });
    });

    void session.initialise().then(
      (next) => {
        if (!active) return;
        dispatch({
          type: "initialization-completed",
          session: next,
          sessionVersion: updateIdentity(next),
        });
      },
      (error: unknown) => {
        if (!active) return;
        const sessionVersion = updateIdentity(signedOut);
        dispatch({
          type: "initialization-failed",
          message:
            error instanceof Error ? error.message : "Authentication failed",
          sessionVersion,
        });
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: state.session,
      lifecycle: {
        ready: state.ready,
        sessionVersion: state.sessionVersion,
      },
      actions: {
        logout: async () => {
          const version = identityVersion.current;
          await session.logout();
          if (identityVersion.current !== version) return;
          queryClient.clear();
          currentUserId.current = null;
          identityVersion.current++;
          dispatch({
            type: "logout-completed",
            sessionVersion: identityVersion.current,
          });
        },
      },
    }),
    [queryClient, session, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

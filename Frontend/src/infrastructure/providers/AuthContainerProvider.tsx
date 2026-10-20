import type { ReactNode } from "react";
import type { AuthClientContract } from "../../application/contracts/clients/AuthClientContract";
import { AuthContainer } from "../../adapters/containers/AuthContainer";
import { useAuthSession } from "../../adapters/hooks/useAuthSession";

// Supply the React session state produced by the authentication adapter hook.
export function AuthContainerProvider({
  session,
  children,
}: {
  session: AuthClientContract;
  children: ReactNode;
}) {
  // Connect the injected session to its React lifecycle adapter.
  const state = useAuthSession(session);

  return (
    <AuthContainer.Provider value={state}>{children}</AuthContainer.Provider>
  );
}

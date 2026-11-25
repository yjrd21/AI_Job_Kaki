import { createContext, useContext } from "react";
import type { AuthSessionContract } from "../application/contracts/clients/AuthClientContract";

export type AuthContextValue = {
  session: AuthSessionContract;
  lifecycle: {
    ready: boolean;
    sessionVersion: number;
  };
  actions: {
    logout(): Promise<void>;
  };
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("AuthContext provider missing");
  }

  return auth;
}

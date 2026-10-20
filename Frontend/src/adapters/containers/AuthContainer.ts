import { createContext } from "react";
import type { AuthSessionContract } from "../../application/contracts/clients/AuthClientContract";

// Combine application session data with React readiness and authentication actions.
export type AuthState = AuthSessionContract & {
  ready: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

// Share authentication state and actions with descendant components.
export const AuthContainer = createContext<AuthState | null>(null);

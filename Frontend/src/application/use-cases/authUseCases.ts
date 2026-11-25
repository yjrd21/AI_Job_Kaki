import type { AuthClientContract } from "../contracts/clients/AuthClientContract";

// Start the authentication provider's login flow.
export function startLogin(auth: Pick<AuthClientContract, "login">) {
  return auth.login();
}

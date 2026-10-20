import { createContext } from "react";
import type { AccountControllerContract } from "../../application/contracts/controllers/AccountControllerContract";

// Hold the account controller contract without coupling views to its implementation.
export const AccountControllerContainer =
  createContext<AccountControllerContract | null>(null);

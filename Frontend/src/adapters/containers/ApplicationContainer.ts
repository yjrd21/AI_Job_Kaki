import { createContext } from "react";
import type { ApplicationContract } from "../../application/contracts/ApplicationContract";

// Hold the injected application API without importing concrete dependencies into views.
export const ApplicationContainer = createContext<ApplicationContract | null>(
  null,
);

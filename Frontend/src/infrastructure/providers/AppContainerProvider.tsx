import { OnboardingControllerContainer } from "../../adapters/containers/OnboardingControllerContainer";
import { CandidateContextControllerContainer } from "../../adapters/containers/CandidateContextControllerContainer";
import {
  useState,
  type ComponentProps,
  type ContextType,
  type ReactNode,
} from "react";
import { AccountControllerContainer } from "../../adapters/containers/AccountControllerContainer";
import { ApplicationContainer } from "../../adapters/containers/ApplicationContainer";
import { AuthContainerProvider } from "./AuthContainerProvider";
import { JobControllerContainer } from "../../adapters/containers/JobControllerContainer";
import { QueryContainerProvider } from "./QueryContainerProvider";
import { createQueryClient } from "../clients/createQueryClient";

// Describe the constructed dependencies required to assemble the React providers.
type AppContainerProviderProps = {
  application: NonNullable<ContextType<typeof ApplicationContainer>>;
  accountController: NonNullable<
    ContextType<typeof AccountControllerContainer>
  >;
  candidateContextController: NonNullable<
    ContextType<typeof CandidateContextControllerContainer>
  >;
  jobController: NonNullable<ContextType<typeof JobControllerContainer>>;
  onboardingController: NonNullable<
    ContextType<typeof OnboardingControllerContainer>
  >;
  authSession: ComponentProps<typeof AuthContainerProvider>["session"];
  children: ReactNode;
};

// Wire application dependencies into the React tree at the composition root.
export function AppContainerProvider({
  application,
  accountController,
  jobController,
  candidateContextController,
  authSession,
  onboardingController,
  children,
}: AppContainerProviderProps) {
  // Retain one configured query client for this mounted application tree.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryContainerProvider client={queryClient}>
      <ApplicationContainer.Provider value={application}>
        <AccountControllerContainer.Provider value={accountController}>
          <JobControllerContainer.Provider value={jobController}>
            <CandidateContextControllerContainer.Provider
              value={candidateContextController}
            >
              <OnboardingControllerContainer.Provider
                value={onboardingController}
              >
                <AuthContainerProvider session={authSession}>
                  {children}
                </AuthContainerProvider>
              </OnboardingControllerContainer.Provider>
            </CandidateContextControllerContainer.Provider>
          </JobControllerContainer.Provider>
        </AccountControllerContainer.Provider>
      </ApplicationContainer.Provider>
    </QueryContainerProvider>
  );
}

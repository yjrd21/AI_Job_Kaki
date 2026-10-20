import { useNavigate } from "react-router-dom";
import { OnboardingControllerContainer } from "../containers/OnboardingControllerContainer";
import { fileToBase64, MAX_CV_BYTES } from "../views/utils/fileUtils";
import { useAccount } from "./useAccount";
import type {
  OnboardingInputContract,
  OnboardingProgressContract,
} from "../../application/contracts/controllers/OnboardingControllerContract";
import { useContext, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContainer } from "../containers/AuthContainer";
import { AccountControllerContainer } from "../containers/AccountControllerContainer";

// Reuse the account query so onboarding checks and account editing share one cache entry.
export { useAccount as useOnboardingStatus } from "./useAccount";

// Complete onboarding and refresh the shared account status after success.
/** Requires the future User Service POST /users/{id}/onboarding/complete endpoint. */
export function useCompleteOnboarding() {
  // Read the injected application operations used by this hook.
  const controller = useContext(AccountControllerContainer);

  if (!controller) {
    throw new Error("AccountControllerContainer provider missing");
  }

  // Read the signed-in user identifier for user-scoped operations.
  const auth = useContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  // Access the query cache so successful mutations can invalidate related data.
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => controller.completeOnboarding(userId!),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["account", userId] }),
  });
}

// Connect onboarding steps, file reading, and workflow execution to React.
export function useOnboardingForm() {
  const controller = useContext(OnboardingControllerContainer);

  if (!controller)
    throw new Error("OnboardingControllerContainer provider missing");

  const auth = useContext(AuthContainer);

  if (!auth) throw new Error("AuthContainer provider missing");

  const account = useAccount();

  const queryClient = useQueryClient();

  const navigate = useNavigate();

  // Keep the workflow checkpoint for retries during this mounted onboarding attempt.
  const progress = useRef<OnboardingProgressContract>({ contextId: null });

  const [step, setStep] = useState(0);

  const [finished, setFinished] = useState(false);

  const [values, setValues] = useState<Omit<OnboardingInputContract, "cv">>({
    roles: "",
    preferences: "",
    redFlags: "",
    arrangement: "",
    locations: "",
  });

  const [cv, setCv] = useState<{ name: string; content: string } | null>(null);

  const [cvLoading, setCvLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Ignore results from a file read superseded by a newer selection.
  const fileSelection = useRef(0);

  const finish = useMutation({
    mutationFn: () =>
      controller.finish(
        auth.userId!,
        { ...values, ...(cv ? { cv } : {}) },
        progress.current,
      ),
    onSuccess: () => {
      setFinished(true);
      void queryClient.invalidateQueries({
        queryKey: ["account", auth.userId],
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["contexts", auth.userId],
      });
    },
  });

  const update = (key: keyof typeof values, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));

  // Validate the browser selection and retain encoded CV content for the controller.
  async function chooseCv(file: File | undefined) {
    const selection = ++fileSelection.current;

    setCv(null);
    setCvLoading(false);
    setError(null);
    if (!file) return;
    if (file.size > MAX_CV_BYTES || !/\.(pdf|docx)$/i.test(file.name)) {
      setError("Choose a PDF or DOCX file under 5 MB.");
      return;
    }
    setCvLoading(true);
    try {
      const content = await fileToBase64(file);

      if (selection === fileSelection.current)
        setCv({ name: file.name, content });
    } catch (cause) {
      if (selection === fileSelection.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to read the CV. Please try again.",
        );
    } finally {
      if (selection === fileSelection.current) setCvLoading(false);
    }
  }

  // Advance visual steps or execute the single application onboarding workflow.
  const next = () => {
    if (finish.isPending || cvLoading) return;
    setError(null);
    const validation = controller.validateRoles(values.roles);

    if (validation) {
      setError(validation);
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    finish.mutate();
  };

  const previous = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  };

  return {
    account,
    finish,
    step,
    finished,
    values,
    cv,
    cvLoading,
    error,
    update,
    chooseCv,
    next,
    previous,
    onDashboard: () => navigate("/dashboard"),
    onAnalyse: () => navigate("/analyse"),
  };
}

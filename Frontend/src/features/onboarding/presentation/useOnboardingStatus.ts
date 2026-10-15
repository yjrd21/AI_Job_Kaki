import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/presentation/AuthProvider";
import { repositories } from "../../../app/dependencies";
import { getAccount } from "../../users/application/use-cases";

export function useOnboardingStatus() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["account", userId],
    queryFn: () => getAccount(repositories.users, userId!),
    enabled: !!userId,
  });
}

/** Requires the future User Service POST /users/{id}/onboarding/complete endpoint. */
export function useCompleteOnboarding() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.users.completeOnboarding(userId!),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account", userId] }),
  });
}

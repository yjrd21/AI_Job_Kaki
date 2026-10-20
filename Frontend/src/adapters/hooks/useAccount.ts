import { useContext, useEffect } from "react";
import { useForm, type ResolverResult } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountInputContract } from "../../application/contracts/controllers/AccountControllerContract";
import { AccountControllerContainer } from "../containers/AccountControllerContainer";
import { AuthContainer } from "../containers/AuthContainer";

// Load account details using the cache shared with onboarding checks.
export function useAccount() {
  // Read the injected controller that handles account input and application access.
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

  return useQuery({
    queryKey: ["account", userId],
    queryFn: () => controller.getAccount(userId!),
    enabled: !!userId,
  });
}

// Save account changes and refresh the shared account query.
export function useSaveAccount() {
  // Read the injected controller that handles account input and application access.
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

  // Access the query cache so successful mutations can refresh account data.
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: AccountInputContract) =>
      controller.saveAccount(userId!, update),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["account", userId] }),
  });
}

// Connect account form state, controller validation, and query results to React.
export function useAccountForm() {
  // Load the account data used to populate the form.
  const query = useAccount();

  // Read account input validation through the layer 2 controller contract.
  const controller = useContext(AccountControllerContainer);

  if (!controller) {
    throw new Error("AccountControllerContainer provider missing");
  }

  // Translate controller validation feedback into React Hook Form field errors.
  const form = useForm<AccountInputContract>({
    resolver: (values): ResolverResult<AccountInputContract> => {
      // Validate form values without importing the concrete controller or Zod.
      const validation = controller.validateAccount(values);

      if (validation.valid) return { values: validation.values, errors: {} };

      return {
        values: {},
        errors: {
          firstName: validation.errors.firstName
            ? { type: "validate", message: validation.errors.firstName }
            : undefined,
          lastName: validation.errors.lastName
            ? { type: "validate", message: validation.errors.lastName }
            : undefined,
          email: validation.errors.email
            ? { type: "validate", message: validation.errors.email }
            : undefined,
          root: validation.formError
            ? {
                controller: { type: "validate", message: validation.formError },
              }
            : undefined,
        },
      };
    },
  });

  // Populate the editable fields when account data is fetched or refreshed.
  useEffect(() => {
    if (query.data)
      form.reset({
        firstName: query.data.firstName,
        lastName: query.data.lastName,
        email: query.data.email,
      });
  }, [query.data, form]);

  // Prepare the account update mutation and its feedback state.
  const save = useSaveAccount();

  // Submit validated form values through the account mutation.
  const onSubmit = form.handleSubmit((values) => save.mutate(values));

  return { query, form, save, onSubmit };
}

import { useNavigate, useParams } from "react-router-dom";
import { useForm, type ResolverResult } from "react-hook-form";
import type { CandidateContextFormContract } from "../../application/contracts/controllers/CandidateContextControllerContract";
import { fileToBase64 } from "../views/utils/fileUtils";
import { CandidateContextControllerContainer } from "../containers/CandidateContextControllerContainer";
import {
  useCallback,
  useContext as useReactContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContainer } from "../containers/AuthContainer";
import type {
  CandidateContext,
  CandidateContextInput,
} from "../../domain/models/CandidateContext";

// Load the signed-in user's candidate profiles into the query cache.
export function useContexts() {
  // Read the injected application operations used by this hook.
  const controller = useReactContext(CandidateContextControllerContainer);

  if (!controller) {
    throw new Error("CandidateContextControllerContainer provider missing");
  }

  // Read the signed-in user identifier for user-scoped operations.
  const auth = useReactContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  return useQuery({
    queryKey: ["contexts", userId],
    queryFn: () => controller.listContexts(userId!),
    enabled: !!userId,
  });
}

// Load one candidate profile when both the user and profile identifiers are available.
export function useContext(id: string) {
  // Read the injected application operations used by this hook.
  const controller = useReactContext(CandidateContextControllerContainer);

  if (!controller) {
    throw new Error("CandidateContextControllerContainer provider missing");
  }

  // Read the signed-in user identifier for user-scoped operations.
  const auth = useReactContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  return useQuery({
    queryKey: ["context", userId, id],
    queryFn: () => controller.getContext(userId!, id),
    enabled: !!userId && !!id,
  });
}

// Create or update a profile and refresh its list and detail queries.
export function useSaveContext(id?: string) {
  // Read the injected application operations used by this hook.
  const controller = useReactContext(CandidateContextControllerContainer);

  if (!controller) {
    throw new Error("CandidateContextControllerContainer provider missing");
  }

  // Read the signed-in user identifier for user-scoped operations.
  const auth = useReactContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  // Access the query cache so successful mutations can invalidate related data.
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CandidateContextInput) =>
      controller.saveContext(userId!, data, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contexts", userId] });
      void qc.invalidateQueries({ queryKey: ["context", userId, id] });
    },
  });
}

// Delete a candidate profile and refresh the user's profile list.
export function useDeleteContext() {
  // Read the injected application operations used by this hook.
  const controller = useReactContext(CandidateContextControllerContainer);

  if (!controller) {
    throw new Error("CandidateContextControllerContainer provider missing");
  }

  // Read the signed-in user identifier for user-scoped operations.
  const auth = useReactContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  // Access the query cache so successful mutations can invalidate related data.
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => controller.deleteContext(userId!, id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["contexts", userId] }),
  });
}

// Observe the shared context list and expose primary-context output prepared by the use case presenter.
export function usePrimaryContext() {
  // Read the controller supplied by startup without importing its implementation.
  const controller = useReactContext(CandidateContextControllerContainer);

  if (!controller) {
    throw new Error("CandidateContextControllerContainer provider missing");
  }

  // Scope the shared candidate context cache to the authenticated user.
  const auth = useReactContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  // Reuse prepared output until the cached list or injected controller changes.
  const selectPrimary = useCallback(
    (contexts: CandidateContext[]) => controller.getPrimaryContext(contexts),
    [controller],
  );

  return useQuery({
    queryKey: ["contexts", userId],
    queryFn: () => controller.listContexts(userId!),
    enabled: !!userId,
    select: selectPrimary,
  });
}

// Prepare profile-card output from the shared list cache and handle confirmed deletion.
export function useProfiles() {
  // Read the injected candidate context input and presentation operations.
  const controller = useReactContext(CandidateContextControllerContainer);

  if (!controller)
    throw new Error("CandidateContextControllerContainer provider missing");

  // Observe the saved contexts shared with the dashboard and submission form.
  const contexts = useContexts();

  // Expose deletion feedback through the existing user-scoped mutation.
  const del = useDeleteContext();

  // Invoke presentation only when the underlying list or injected controller changes.
  const profiles = useMemo(
    () => (contexts.data ? controller.getProfiles(contexts.data) : []),
    [contexts.data, controller],
  );

  // Keep deletion failures in the mutation state consumed by the view.
  const onDelete = (id: string) => {
    if (
      window.confirm(
        "Delete this candidate profile? Existing job submissions may still reference it.",
      )
    )
      del.mutate(id);
  };

  return { contexts, profiles, del, onDelete };
}

// Connect profile validation, loaded fields, selected files, and save navigation to React.
export function useProfileEditor() {
  // Read the injected candidate context input and presentation operations.
  const controller = useReactContext(CandidateContextControllerContainer);

  if (!controller)
    throw new Error("CandidateContextControllerContainer provider missing");

  // Identify the profile being edited from the route.
  const { contextId } = useParams();

  // Distinguish creation from editing an existing profile.
  const editing = !!contextId;

  // Load existing values only when an identifier is present.
  const query = useContext(contextId || "");

  // Save through the shared create-or-update mutation.
  const save = useSaveContext(contextId);

  // Return to the profile list after a successful save.
  const navigate = useNavigate();

  // Retain a replacement CV until the user submits it.
  const [file, setFile] = useState<File | null>(null);

  // Keep browser file-reading errors separate from save errors.
  const [fileError, setFileError] = useState<string | null>(null);

  // Adapt controller validation to React Hook Form field feedback.
  const form = useForm<CandidateContextFormContract>({
    resolver: (values): ResolverResult<CandidateContextFormContract> => {
      const result = controller.validateProfile(values);

      if (result.valid) return { values: result.values, errors: {} };

      return {
        values: {},
        errors: {
          roles: result.errors.roles
            ? { type: "validate", message: result.errors.roles }
            : undefined,
          preferences: result.errors.preferences
            ? { type: "validate", message: result.errors.preferences }
            : undefined,
          redFlags: result.errors.redFlags
            ? { type: "validate", message: result.errors.redFlags }
            : undefined,
        },
      };
    },
    defaultValues: { roles: "", preferences: "", redFlags: "" },
  });

  // Restore presenter-prepared editor values when saved data is loaded or refreshed.
  useEffect(() => {
    if (query.data) form.reset(controller.getEditorValues(query.data));
  }, [query.data, controller, form]);

  // Read browser files before passing encoded content to the input controller.
  const onSubmit = form.handleSubmit(async (values) => {
    setFileError(null);
    let cv: { name: string; content: string } | undefined;

    if (file) {
      try {
        cv = { name: file.name, content: await fileToBase64(file) };
      } catch (error) {
        setFileError(
          error instanceof Error ? error.message : "Unable to read file",
        );
        return;
      }
    }

    save.mutate(controller.prepareProfile(values, cv), {
      onSuccess: () => navigate("/profiles"),
    });
  });

  // Clear stale file feedback when a replacement is selected.
  const onFileChange = (next: File | null) => {
    setFile(next);
    setFileError(null);
  };

  return {
    editing,
    query,
    save,
    form,
    file,
    fileError,
    onSubmit,
    onFileChange,
  };
}

import { useContext, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, type ResolverResult } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { JobControllerContainer } from "../containers/JobControllerContainer";
import { AuthContainer } from "../containers/AuthContainer";
import type { JobInputContract } from "../../application/contracts/controllers/JobControllerContract";

// Keep job list, submission, and analysis query keys consistent across hooks.
export const jobKeys = {
  all: (userId: string) => ["jobs", userId] as const,
  one: (userId: string, id: string) => ["job", userId, id] as const,
  analysis: (id: string) => ["analysis", id] as const,
};

// Load the signed-in user's submissions into the query cache.
export function useJobs() {
  // Read the injected controller that handles job input and application access.
  const controller = useContext(JobControllerContainer);

  if (!controller) {
    throw new Error("JobControllerContainer provider missing");
  }

  // Read the signed-in user identifier for user-scoped operations.
  const auth = useContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  return useQuery({
    queryKey: jobKeys.all(userId!),
    queryFn: () => controller.listJobs(userId!),
    enabled: !!userId,
  });
}

// Poll an active submission every 2.5 seconds until processing completes or fails.
export function useJob(id: string) {
  // Read the injected controller that handles job input and application access.
  const controller = useContext(JobControllerContainer);

  if (!controller) {
    throw new Error("JobControllerContainer provider missing");
  }

  // Read the signed-in user identifier for user-scoped operations.
  const auth = useContext(AuthContainer);

  if (!auth) {
    throw new Error("AuthContainer provider missing");
  }

  const { userId } = auth;

  return useQuery({
    queryKey: jobKeys.one(userId!, id),
    queryFn: () => controller.getJob(userId!, id),
    enabled: !!userId && !!id,
    refetchInterval: (query) =>
      ["PENDING", "PROCESSING"].includes(query.state.data?.status || "")
        ? 2500
        : false,
  });
}

// Fetch a saved analysis only when an analysis identifier is available.
export function useAnalysis(id: string | null | undefined) {
  // Read the injected controller that handles job input and application access.
  const controller = useContext(JobControllerContainer);

  if (!controller) {
    throw new Error("JobControllerContainer provider missing");
  }

  return useQuery({
    queryKey: jobKeys.analysis(id || ""),
    queryFn: () => controller.getAnalysis(id!),
    enabled: !!id,
  });
}

// Submit a job and invalidate the current user's cached submission list.
export function useSubmitJob() {
  // Read the injected controller that handles job input and application access.
  const controller = useContext(JobControllerContainer);

  if (!controller) {
    throw new Error("JobControllerContainer provider missing");
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
    mutationFn: (input: JobInputContract) =>
      controller.submitJob(userId!, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: jobKeys.all(userId!) }),
  });
}

// Delete a submission and invalidate the current user's cached submission list.
export function useDeleteJob() {
  // Read the injected controller that handles job input and application access.
  const controller = useContext(JobControllerContainer);

  if (!controller) {
    throw new Error("JobControllerContainer provider missing");
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
    mutationFn: (id: string) => controller.deleteJob(userId!, id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: jobKeys.all(userId!) }),
  });
}

// Connect job form state, controller validation, URL defaults, and submission to React.
export function useAnalyseJobForm() {
  // Prepare the submission mutation and its loading and error state.
  const submit = useSubmitJob();

  // Access route navigation for transitions after successful user actions.
  const navigate = useNavigate();

  // Read prefilled job and profile values from the current URL.
  const [params] = useSearchParams();

  // Read job input validation through the layer 2 controller contract.
  const controller = useContext(JobControllerContainer);

  if (!controller) {
    throw new Error("JobControllerContainer provider missing");
  }

  // Translate controller validation feedback into React Hook Form field errors.
  const form = useForm<JobInputContract>({
    resolver: (values): ResolverResult<JobInputContract> => {
      // Validate submission input without importing the concrete controller or Zod.
      const validation = controller.validateJob(values);

      if (validation.valid) return { values: validation.values, errors: {} };

      return {
        values: {},
        errors: {
          submissionType: validation.errors.submissionType
            ? { type: "validate", message: validation.errors.submissionType }
            : undefined,
          candidateContextId: validation.errors.candidateContextId
            ? {
                type: "validate",
                message: validation.errors.candidateContextId,
              }
            : undefined,
          jobContext: validation.errors.jobContext
            ? { type: "validate", message: validation.errors.jobContext }
            : undefined,
          root: validation.formError
            ? {
                controller: { type: "validate", message: validation.formError },
              }
            : undefined,
        },
      };
    },
    defaultValues: {
      submissionType: params.get("type") === "URL" ? "URL" : "TEXT",
      candidateContextId: params.get("context") || "",
      jobContext: params.get("jobContext") || "",
    },
  });

  // Observe the selected submission mode from the same values passed to the controller.
  const kind = form.watch("submissionType");

  // Submit validated values and navigate only after the submission succeeds.
  const onSubmit = form.handleSubmit((values) => {
    submit.mutate(values, { onSuccess: (job) => navigate(`/jobs/${job.id}`) });
  });

  // Update the submission mode without clearing the entered job information.
  const onSubmissionTypeChange = (type: JobInputContract["submissionType"]) => {
    form.setValue("submissionType", type);
  };

  return { submit, form, kind, onSubmit, onSubmissionTypeChange };
}

// Connect history search, cached submissions, and confirmed deletion to React.
export function useJobHistory() {
  // Observe the existing user-scoped list and deletion mutation.
  const jobs = useJobs();

  const del = useDeleteJob();

  // Retain the local search input without refetching the submission list.
  const [search, setSearch] = useState("");

  // Match the same posting text, status, and identifier fields regardless of case.
  const filtered = (jobs.data || []).filter((job) =>
    `${job.jobContext} ${job.status} ${job.id}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // Confirm the user's intent and leave mutation failures in React Query state.
  const onDelete = (id: string) => {
    if (
      window.confirm(
        "Delete this job submission? The analysis may remain stored by the AI service.",
      )
    ) {
      del.mutate(id);
    }
  };

  return { jobs, del, search, onSearchChange: setSearch, filtered, onDelete };
}

// Coordinate submission polling, completed-report retrieval, and result actions.
export function useJobResult() {
  // Read the submission identifier and the navigation action from React Router.
  const { jobId = "" } = useParams();

  const navigate = useNavigate();

  // Poll the submission and enable report retrieval only after completion.
  const job = useJob(jobId);

  const result = useAnalysis(
    job.data?.presentation.state === "completed"
      ? job.data.jobAnalysisId
      : null,
  );

  const del = useDeleteJob();

  // Use the report heading when available and the prepared submission heading otherwise.
  const heading =
    result.data?.presentation.heading || job.data?.presentation.resultHeading;

  // Navigate back to history only after the confirmed deletion succeeds.
  const onDelete = () => {
    if (job.data && window.confirm("Delete this job submission?")) {
      del.mutate(job.data.id, { onSuccess: () => navigate("/history") });
    }
  };

  return { job, result, del, heading, onDelete };
}

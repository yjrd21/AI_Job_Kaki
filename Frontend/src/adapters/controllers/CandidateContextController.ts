import type { ApplicationContract } from "../../application/contracts/ApplicationContract";
import type { CandidateContextControllerContract } from "../../application/contracts/controllers/CandidateContextControllerContract";
import type { CandidateContext } from "../../domain/models/CandidateContext";
import type { JobSubmission, JobAnalysis } from "../../domain/models/Job";
import { z } from "zod";
import { listFromLines } from "../views/utils/textUtils";
import type {
  CandidateContextFormContract,
  CandidateContextValidationContract,
} from "../../application/contracts/controllers/CandidateContextControllerContract";
import type { CandidateContextInput } from "../../domain/models/CandidateContext";

// Validate multiline profile input before creating the application payload.
const schema = z.object({
  roles: z
    .string()
    .refine(
      (value) => listFromLines(value).length > 0,
      "At least one target role is required",
    ),
  preferences: z.string(),
  redFlags: z.string(),
});

// Delegate candidate context retrieval and primary selection to the application API.
export class CandidateContextController<
  TOutput,
  TProfiles,
> implements CandidateContextControllerContract<TOutput, TProfiles> {
  // Receive context operations without constructing repositories or presenters.
  constructor(
    private readonly application: Pick<
      ApplicationContract<JobSubmission, JobAnalysis, TOutput, TProfiles>,
      "contexts"
    >,
  ) {}

  // Translate profile validation into plain field feedback.
  validateProfile(input: unknown): CandidateContextValidationContract {
    const result = schema.safeParse(input);

    if (result.success) return { valid: true, values: result.data };

    const errors = result.error.flatten().fieldErrors;

    return {
      valid: false,
      errors: {
        roles: errors.roles?.[0],
        preferences: errors.preferences?.[0],
        redFlags: errors.redFlags?.[0],
      },
    };
  }

  // Translate validated multiline input and an optional encoded CV into application fields.
  prepareProfile(
    input: CandidateContextFormContract,
    cv?: { name: string; content: string },
  ): CandidateContextInput {
    const values = schema.parse(input);

    return {
      targetRoles: listFromLines(values.roles),
      preferences: listFromLines(values.preferences),
      redFlags: listFromLines(values.redFlags),
      ...(cv ? { cvFile: cv.content, cvFileName: cv.name } : {}),
    };
  }

  // Load one candidate context through the application API.
  getContext(userId: string, id: string) {
    return this.application.contexts.get(userId, id);
  }

  // Save candidate context fields through the application API.
  saveContext(userId: string, input: CandidateContextInput, id?: string) {
    return this.application.contexts.save(userId, input, id);
  }

  // Delete a saved candidate context through the application API.
  deleteContext(userId: string, id: string) {
    return this.application.contexts.delete(userId, id);
  }

  // Invoke the use-case presenter boundary for profile cards.
  getProfiles(contexts: CandidateContext[]) {
    return this.application.contexts.profiles(contexts);
  }

  // Invoke the use-case presenter boundary for editable profile values.
  getEditorValues(context: CandidateContext) {
    return this.application.contexts.editor(context);
  }

  // Retrieve the signed-in user's candidate contexts without changing list order.
  listContexts(userId: string) {
    return this.application.contexts.list(userId);
  }

  // Invoke primary-context selection and presentation for the retrieved list.
  getPrimaryContext(contexts: CandidateContext[]) {
    return this.application.contexts.primary(contexts);
  }
}

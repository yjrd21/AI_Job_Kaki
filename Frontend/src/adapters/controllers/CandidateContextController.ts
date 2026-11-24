import type {
  CandidateContext,
  CandidateContextInput,
} from "../../domain/models/CandidateContext";
import { z } from "zod";
import { listFromLines } from "../views/utils/textUtils";
import type { CandidateContextForm } from "../../application/contracts/presenters/CandidateContextPresenterContract";
import type { AnalysisProfilesOutput } from "../../application/use-cases/candidateContextUseCases";

export type CandidateContextValidation =
  | { valid: true; values: CandidateContextForm }
  | {
      valid: false;
      errors: Partial<Record<keyof CandidateContextForm, string>>;
    };

type CandidateContextControllerDependencies<TOutput, TProfiles> = {
  getContext(userId: string, id: string): Promise<CandidateContext>;
  saveContext(
    userId: string,
    input: CandidateContextInput,
    id?: string,
  ): Promise<CandidateContext>;
  deleteContext(userId: string, id: string): Promise<void>;
  getProfiles(contexts: CandidateContext[]): TProfiles;
  getEditorValues(context: CandidateContext): CandidateContextForm;
  listContexts(userId: string): Promise<CandidateContext[]>;
  loadAnalysisProfiles(
    userId: string,
    output: AnalysisProfilesOutput,
  ): Promise<void>;
  getPrimaryContext(contexts: CandidateContext[]): TOutput;
};

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

// Delegate candidate context operations to the injected use cases and presenters.
export class CandidateContextController<TOutput, TProfiles> {
  constructor(
    private readonly dependencies: CandidateContextControllerDependencies<
      TOutput,
      TProfiles
    >,
  ) {}

  // Translate profile validation into plain field feedback.
  validateProfile(input: unknown): CandidateContextValidation {
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
    input: CandidateContextForm,
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

  // Load one candidate context.
  getContext(userId: string, id: string) {
    return this.dependencies.getContext(userId, id);
  }

  // Save candidate context fields.
  saveContext(userId: string, input: CandidateContextInput, id?: string) {
    return this.dependencies.saveContext(userId, input, id);
  }

  // Delete a saved candidate context.
  deleteContext(userId: string, id: string) {
    return this.dependencies.deleteContext(userId, id);
  }

  // Prepare profile-card output.
  getProfiles(contexts: CandidateContext[]) {
    return this.dependencies.getProfiles(contexts);
  }

  // Prepare editable profile values.
  getEditorValues(context: CandidateContext): CandidateContextForm {
    return this.dependencies.getEditorValues(context);
  }

  // Retrieve the signed-in user's candidate contexts without changing list order.
  listContexts(userId: string) {
    return this.dependencies.listContexts(userId);
  }

  // Request selector data without managing React state or formatting the result.
  loadAnalysisProfiles(userId: string, output: AnalysisProfilesOutput) {
    return this.dependencies.loadAnalysisProfiles(userId, output);
  }

  // Select and present the primary context from the retrieved list.
  getPrimaryContext(contexts: CandidateContext[]) {
    return this.dependencies.getPrimaryContext(contexts);
  }
}

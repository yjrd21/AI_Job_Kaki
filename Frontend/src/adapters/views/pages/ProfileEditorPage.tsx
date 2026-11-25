import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, type ResolverResult } from "react-hook-form";
import { useAuthContext } from "../../AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Info, Save } from "lucide-react";
import { Button } from "../components/primitives/Button";
import { Card } from "../components/primitives/Card";
import { FormField } from "../components/primitives/FormField";
import { ErrorState } from "../components/composed/ErrorState";
import { LoadingState } from "../components/composed/LoadingState";
import { PageHeader } from "../components/composed/PageHeader";
import type { ProfileEditorController } from "../../controllers/ProfileEditorController";
import type { CandidateContextForm } from "../../../application/contracts/presenters/CandidateContextPresenterContract";
import { ProfileEditorPresenter } from "../../presenters/ProfileEditorPresenter";

// Create or edit a candidate profile with an optional replacement CV.
export function ProfileEditorPage({
  profileEditorController,
}: {
  profileEditorController: ProfileEditorController;
}) {
  const { contextId } = useParams();
  const editing = !!contextId;
  const userId = useAuthContext().session.userId;
  const navigate = useNavigate();
  const [presenter] = useState(() => new ProfileEditorPresenter());
  const view = useSyncExternalStore(presenter.subscribe, presenter.getSnapshot);
  const form = useForm<CandidateContextForm>({
    resolver: (values): ResolverResult<CandidateContextForm> => {
      const result = profileEditorController.validateProfile(values);

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
  const loadProfile = useCallback(() => {
    if (contextId) {
      void profileEditorController.loadProfile(userId, contextId, presenter);
    }
  }, [contextId, profileEditorController, presenter, userId]);

  useEffect(() => {
    if (editing) {
      loadProfile();
      return () => presenter.cancelRequests();
    }
  }, [editing, loadProfile, presenter]);

  useEffect(() => {
    if (view.profile.status === "ready") {
      form.reset(view.profile.values);
    }
  }, [view.profile, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const saved = await profileEditorController.saveProfile(
      userId,
      contextId,
      values,
      presenter,
    );
    if (saved) navigate("/profiles");
  });
  const onFileChange = (next: File | null) => {
    void profileEditorController.chooseCv(next, presenter);
  };

  return (
    <div className="max-w-3xl">
      <Link
        to="/profiles"
        className="flex gap-2 items-center text-sm muted mb-8"
      >
        <ArrowLeft size={16} /> Candidate profiles
      </Link>
      <PageHeader
        eyebrow="CAREER CONTEXT"
        title={editing ? "Refine your profile." : "Create a candidate profile."}
        description="Your profile describes where you want to go, what matters to you, and the signals you'd rather avoid."
        className="max-w-2xl"
      />
      {editing &&
      (view.profile.status === "idle" || view.profile.status === "loading") ? (
        <LoadingState />
      ) : editing && view.profile.status === "error" ? (
        <ErrorState error={view.profile.error} retry={loadProfile} />
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
          <Card className="p-6 sm:p-8">
            <p className="eyebrow mb-5">01 — TARGET ROLES</p>
            <FormField
              id="roles"
              label="Career directions"
              required
              hint="Enter one role per line."
              error={form.formState.errors.roles?.message}
            >
              {({ id, describedBy, invalid }) => (
                <textarea
                  id={id}
                  rows={4}
                  className="field"
                  placeholder={"Product Manager\nBusiness Analyst"}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("roles")}
                />
              )}
            </FormField>
          </Card>
          <Card className="p-6 sm:p-8">
            <p className="eyebrow mb-5">02 — YOUR PREFERENCES</p>
            <FormField
              id="preferences"
              label="What you're looking for"
              hint="One preference per line."
            >
              {({ id, describedBy, invalid }) => (
                <textarea
                  id={id}
                  className="field"
                  rows={5}
                  placeholder={
                    "Cross-functional collaboration\nFlexible working hours\nOpportunities to grow"
                  }
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("preferences")}
                />
              )}
            </FormField>
          </Card>
          <Card className="p-6 sm:p-8">
            <p className="eyebrow mb-5">03 — DEAL-BREAKERS</p>
            <FormField
              id="redFlags"
              label="What would make you think twice?"
              hint="One red flag per line."
            >
              {({ id, describedBy, invalid }) => (
                <textarea
                  id={id}
                  className="field"
                  rows={4}
                  placeholder={"Unpaid trial work\nUnclear responsibilities"}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("redFlags")}
                />
              )}
            </FormField>
          </Card>
          <Card className="p-6 sm:p-8">
            <p className="eyebrow mb-5">04 — YOUR CV</p>
            <div className="border border-dashed border-[#c9ccc0] bg-[#fcfcfa] rounded-lg px-6 py-8 text-center">
              <FileText className="text-forest mx-auto mb-3" size={27} />
              <FormField
                id="cv"
                label="Upload a CV (required for job analysis)"
                error={view.fileError ?? undefined}
              >
                {({ id, describedBy, invalid }) => (
                  <input
                    id={id}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                    className="text-sm max-w-full"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                  />
                )}
              </FormField>
              <p className="text-xs muted mt-3">
                PDF, DOC, or DOCX, up to 5 MiB. Your CV is sent to the AI with
                each job analysis to assess your qualifications.
              </p>
              {view.profile.status === "ready" &&
                view.profile.cvFileName &&
                !view.cv && (
                  <p className="text-sm mt-3">
                    Existing file: {view.profile.cvFileName}
                  </p>
                )}
            </div>
            {view.cvLoading && (
              <p className="text-sm muted mt-3">Reading CV…</p>
            )}
            <p className="text-xs muted mt-3 flex gap-2">
              <Info size={15} className="shrink-0" />
              The current API does not support downloading an existing CV.
            </p>
          </Card>
          {view.save.status === "error" && (
            <ErrorState error={view.save.error} />
          )}
          <div className="flex justify-end gap-3">
            <Link to="/profiles" className="btn btn-outline">
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={
                view.save.status === "saving" ||
                form.formState.isSubmitting ||
                view.cvLoading ||
                view.fileError !== null
              }
            >
              <Save size={16} />
              {view.save.status === "saving" ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

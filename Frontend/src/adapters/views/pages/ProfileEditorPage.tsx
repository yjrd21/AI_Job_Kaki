import { useProfileEditor } from "../../hooks/useContexts";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Info, Save } from "lucide-react";
import { Button } from "../components/primitives/Button";
import { ErrorNotice, Loading } from "../components/composed/Feedback";

// Create or edit a candidate profile with an optional replacement CV.
export function ProfileEditorPage() {
  // Bind profile editor state and handlers supplied by the candidate context hook.
  const {
    editing,
    query,
    save,
    form,
    file,
    fileError,
    onSubmit,
    onFileChange,
  } = useProfileEditor();

  return (
    <div className="max-w-3xl">
      <Link
        to="/profiles"
        className="flex gap-2 items-center text-sm muted mb-8"
      >
        <ArrowLeft size={16} /> Candidate profiles
      </Link>
      <p className="eyebrow mb-4">CAREER CONTEXT</p>
      <h1 className="display-title mb-4">
        {editing ? "Refine your profile." : "Create a candidate profile."}
      </h1>
      <p className="muted mb-10 max-w-2xl leading-relaxed">
        Your profile describes where you want to go, what matters to you, and
        the signals you'd rather avoid.
      </p>
      {editing && query.isLoading ? (
        <Loading />
      ) : editing && query.isError ? (
        <ErrorNotice error={query.error} />
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
          <div className="card p-6 sm:p-8">
            <p className="eyebrow mb-5">01 — TARGET ROLES</p>
            <label htmlFor="roles" className="field-label">
              Career directions <span className="text-rust">*</span>
            </label>
            <textarea
              id="roles"
              rows={4}
              className="field"
              placeholder={"Product Manager\nBusiness Analyst"}
              {...form.register("roles")}
            />
            <p className="text-xs muted mt-2">Enter one role per line.</p>
            {form.formState.errors.roles && (
              <p role="alert" className="text-red-700 text-sm mt-2">
                {form.formState.errors.roles.message}
              </p>
            )}
          </div>
          <div className="card p-6 sm:p-8">
            <p className="eyebrow mb-5">02 — YOUR PREFERENCES</p>
            <label htmlFor="preferences" className="field-label">
              What you're looking for
            </label>
            <textarea
              id="preferences"
              className="field"
              rows={5}
              placeholder={
                "Cross-functional collaboration\nFlexible working hours\nOpportunities to grow"
              }
              {...form.register("preferences")}
            />
            <p className="text-xs muted mt-2">One preference per line.</p>
          </div>
          <div className="card p-6 sm:p-8">
            <p className="eyebrow mb-5">03 — DEAL-BREAKERS</p>
            <label htmlFor="redFlags" className="field-label">
              What would make you think twice?
            </label>
            <textarea
              id="redFlags"
              className="field"
              rows={4}
              placeholder={"Unpaid trial work\nUnclear responsibilities"}
              {...form.register("redFlags")}
            />
            <p className="text-xs muted mt-2">One red flag per line.</p>
          </div>
          <div className="card p-6 sm:p-8">
            <p className="eyebrow mb-5">04 — YOUR CV</p>
            <label htmlFor="cv" className="field-label">
              Upload a CV (required for job analysis)
            </label>
            <div className="border border-dashed border-[#c9ccc0] bg-[#fcfcfa] rounded-lg px-6 py-8 text-center">
              <FileText className="text-forest mx-auto mb-3" size={27} />
              <input
                id="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className="text-sm max-w-full"
              />
              <p className="text-xs muted mt-3">
                PDF, DOC, or DOCX, up to 5 MiB. Your CV is sent to the AI with
                each job analysis to assess your qualifications.
              </p>
              {query.data?.cvFileName && !file && (
                <p className="text-sm mt-3">
                  Existing file: {query.data.cvFileName}
                </p>
              )}
            </div>
            <p className="text-xs muted mt-3 flex gap-2">
              <Info size={15} className="shrink-0" />
              The current API does not support downloading an existing CV.
            </p>
          </div>
          {fileError && (
            <p className="text-red-700 text-sm" role="alert">
              {fileError}
            </p>
          )}
          {save.isError && <ErrorNotice error={save.error} />}
          <div className="flex justify-end gap-3">
            <Link to="/profiles" className="btn btn-outline">
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={save.isPending || form.formState.isSubmitting}
            >
              <Save size={16} />
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

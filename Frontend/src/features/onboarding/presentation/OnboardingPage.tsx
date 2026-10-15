import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { useContexts, useSaveContext } from "../../candidate-contexts/presentation/hooks/useContexts";
import { fileToBase64, MAX_CV_BYTES } from "../../../utils/fileUtils";
import { listFromLines } from "../../../utils/textUtils";
import { Button } from "../../../components/ui/Button";
import { StepProgress } from "../../../components/ui/StepProgress";
import { ErrorNotice, Loading } from "../../../components/feedback/Feedback";

const steps = ["Target roles", "CV", "Work preferences", "Priorities"] as const;
type FormValues = {
  roles: string;
  preferences: string;
  redFlags: string;
  arrangement: string;
  locations: string;
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const contexts = useContexts();
  const save = useSaveContext();
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [values, setValues] = useState<FormValues>({
    roles: "", preferences: "", redFlags: "", arrangement: "", locations: "",
  });
  const [cv, setCv] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof FormValues, value: string) =>
    setValues((old) => ({ ...old, [key]: value }));

  if (contexts.isPending) return <Loading label="Checking candidate profiles…" />;
  if (contexts.isError) return <ErrorNotice error={contexts.error} retry={() => void contexts.refetch()} />;
  if (contexts.data?.length && !finished) return <Navigate to="/dashboard" replace />;

  async function next() {
    setError(null);
    if (step === 0 && listFromLines(values.roles).length === 0) {
      setError("Add at least one target role.");
      return;
    }
    if (step === 1 && cv && (cv.size > MAX_CV_BYTES || !/\.(pdf|docx)$/i.test(cv.name))) {
      setError("Choose a PDF or DOCX file under 5 MB.");
      return;
    }
    if (step < 3) { setStep(step + 1); return; }
    try {
      const detail = [
        ...listFromLines(values.preferences),
        ...(values.arrangement.trim() ? [`Work arrangement: ${values.arrangement.trim()}`] : []),
        ...(values.locations.trim() ? [`Preferred locations: ${values.locations.trim()}`] : []),
      ];
      const payload = {
        targetRoles: listFromLines(values.roles),
        preferences: detail,
        redFlags: listFromLines(values.redFlags),
        ...(cv ? { cvFile: await fileToBase64(cv), cvFileName: cv.name } : {}),
      };
      await save.mutateAsync(payload);
      setFinished(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your profile. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-paper px-5 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 font-semibold mb-12">
          <span className="w-9 h-9 rounded-lg bg-forest text-white grid place-items-center">K</span>
          AI Job Kaki
        </Link>
        {finished ? (
          <div className="card p-7 sm:p-10" role="status">
            <CheckCircle2 className="text-forest mb-5" size={36} aria-hidden="true" />
            <p className="eyebrow">COMPLETE</p>
            <h1 className="display-title mb-4">Your profile is ready</h1>
            <p className="muted mb-6">Your candidate profile has been saved. You can update it any time.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/dashboard")}>Go to Dashboard <ArrowRight size={17}/></Button>
              <Button variant="outline" onClick={() => navigate("/analyse")}>Analyse your first job</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="eyebrow mb-3">{step + 1} of 4</p>
            <StepProgress steps={steps} activeIndex={step} />
            <div className="card p-6 sm:p-10">
              {step === 0 && <>
                <h1 className="page-title mb-3">Choose your target roles</h1>
                <p className="muted mb-7">Choose at least one target role. Your target roles identify this profile.</p>
                <label htmlFor="roles" className="field-label">Target roles</label>
                <textarea id="roles" className="field" rows={4} value={values.roles} onChange={(e) => update("roles",e.target.value)} placeholder={"Design Lead\nSenior Product Designer"} aria-invalid={!!error}/>
                <p className="ui-field-hint">Enter one role per line.</p>
              </>}
              {step === 1 && <>
                <h1 className="page-title mb-3">Add your CV</h1>
                <p className="muted mb-7">Store your CV with this profile. Add relevant experience to your preferences for the current comparison.</p>
                <label htmlFor="cv" className="field-label">CV (optional)</label>
                <input id="cv" type="file" className="field" accept=".pdf,.docx" onChange={(e) => { setCv(e.target.files?.[0] ?? null); setError(null); }} />
                <p className="ui-field-hint"><FileText size={14} className="inline mr-2"/>PDF or DOCX · up to 5 MB</p>
                {cv && <p className="mt-3 text-sm">{cv.name}</p>}
              </>}
              {step === 2 && <>
                <h1 className="page-title mb-3">Define your target roles</h1>
                <p className="muted mb-7">Choose the working style and locations you’re aiming for. You can update these later.</p>
                <label htmlFor="arrangement" className="field-label">Preferred work arrangement</label>
                <input id="arrangement" className="field mb-5" value={values.arrangement} onChange={(e) => update("arrangement",e.target.value)} placeholder="Hybrid or remote"/>
                <label htmlFor="locations" className="field-label">Preferred locations</label>
                <input id="locations" className="field" value={values.locations} onChange={(e) => update("locations",e.target.value)} placeholder="Singapore, Remote APAC"/>
              </>}
              {step === 3 && <>
                <h1 className="page-title mb-3">What matters most?</h1>
                <p className="muted mb-7">Add preferences and deal-breakers so analysis reflects your priorities.</p>
                <label htmlFor="preferences" className="field-label">Preferences</label>
                <textarea id="preferences" className="field mb-5" rows={4} value={values.preferences} onChange={(e) => update("preferences",e.target.value)} placeholder="Clear ownership, supportive manager"/>
                <label htmlFor="redflags" className="field-label">Red flags and deal-breakers</label>
                <textarea id="redflags" className="field" rows={4} value={values.redFlags} onChange={(e) => update("redFlags",e.target.value)} placeholder="Unclear reporting line, always-on culture"/>
                <p className="ui-field-hint">These are decision context, not automatic rejection rules.</p>
              </>}
              {error && <p role="alert" className="ui-field-error">{error}</p>}
              {save.isError && <ErrorNotice error={save.error}/>}
              <div className="flex justify-between gap-3 mt-8">
                <Button variant="outline" type="button" disabled={step === 0 || save.isPending} onClick={() => { setError(null); setStep((s) => Math.max(0, s - 1)); }}><ArrowLeft size={16}/> Back</Button>
                <Button type="button" disabled={save.isPending} onClick={() => void next()}>{save.isPending ? "Saving…" : step === 3 ? "Finish profile" : "Continue"} <ArrowRight size={16}/></Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

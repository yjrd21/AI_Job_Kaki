import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Info, Save, ShieldCheck } from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import { ErrorState } from "../components/composed/ErrorState";
import { LoadingState } from "../components/composed/LoadingState";
import { PageHeader } from "../components/composed/PageHeader";
import type { AccountController } from "../../controllers/AccountController";
import { AccountPresenter } from "../../presenters/AccountPresenter";
import { Card } from "../components/primitives/Card";
import { Button } from "../components/primitives/Button";
import { FormField } from "../components/primitives/FormField";
import { useForm } from "react-hook-form";
import type { AccountFormInput } from "../../controllers/AccountController";

// Display editable account details and the result of saving changes.
export function AccountPage({
  accountController,
}: {
  accountController: AccountController;
}) {
  const userId = useAuthContext().session.userId;
  const [presenter] = useState(() => new AccountPresenter());
  const view = useSyncExternalStore(presenter.subscribe, presenter.getSnapshot);
  const formValues = useMemo(
    () =>
      view.account.status === "ready"
        ? accountController.toFormValues(view.account.data)
        : null,
    [accountController, view.account],
  );
  const form = useForm<AccountFormInput>({
    resolver: (values) =>
      accountController.resolveAccountForm(values, presenter),
    defaultValues: formValues ?? { firstName: "", lastName: "", email: "" },
  });
  const saveAccount = form.handleSubmit((values) =>
    accountController.submitAccount(userId, values, presenter),
  );

  // The protected route remounts when the authenticated user changes.
  useEffect(() => {
    void accountController.loadAccount(userId, presenter);
    return () => presenter.cancelRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Load once per page mount.
  }, []);

  useEffect(() => {
    if (formValues) form.reset(formValues);
  }, [form, formValues]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="YOUR WORKSPACE"
        title="Account settings"
        description="Keep your basic account information up to date."
      />
      {view.account.status === "loading" ? (
        <LoadingState />
      ) : view.account.status === "error" ? (
        <ErrorState
          error={view.account.error}
          retry={() => void accountController.loadAccount(userId, presenter)}
        />
      ) : (
        <>
          {view.account.status === "ready" && formValues && (
            <form
              onSubmit={(event) => void saveAccount(event)}
              className="card p-6 sm:p-8 mb-6"
            >
              <h2 className="section-title mb-6">Personal details</h2>
              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                <FormField
                  id="firstName"
                  label="First name"
                  error={form.formState.errors.firstName?.message}
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="text"
                      className="field"
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      {...form.register("firstName")}
                    />
                  )}
                </FormField>
                <FormField
                  id="lastName"
                  label="Last name"
                  error={form.formState.errors.lastName?.message}
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      type="text"
                      className="field"
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      {...form.register("lastName")}
                    />
                  )}
                </FormField>
              </div>
              <FormField
                id="email"
                label="Email address"
                error={form.formState.errors.email?.message}
              >
                {({ id, describedBy, invalid }) => (
                  <input
                    id={id}
                    type="email"
                    className="field"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...form.register("email")}
                  />
                )}
              </FormField>
              <p className="text-xs muted flex items-start gap-2 mt-4 leading-5">
                <Info size={16} className="shrink-0" />
                Keycloak and PostgreSQL store identity information separately.
                The gateway may resynchronize names and email from Keycloak;
                coordinate permanent identity changes there as well.
              </p>
              {form.formState.errors.root?.controller?.message && (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {form.formState.errors.root.controller.message}
                </p>
              )}
              {view.save.status === "error" && (
                <div className="mt-5">
                  <ErrorState error={view.save.error} />
                </div>
              )}
              {view.save.status === "saved" && (
                <p role="status" className="mt-4 text-sm text-green-700">
                  Account saved.
                </p>
              )}
              <div className="flex justify-end mt-6">
                <Button disabled={view.save.status === "saving"} type="submit">
                  <Save size={16} />{" "}
                  {view.save.status === "saving" ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck size={23} className="text-forest" />
              <h2 className="section-title mb-0">Security and sign-in</h2>
            </div>
            <p className="text-sm muted leading-7 mb-4">
              Your sign-in credentials are managed by Keycloak. This app does
              not modify your Keycloak password or security settings.
            </p>
            <p className="text-xs muted">
              Account ID:
              {view.account.status === "ready"
                ? view.account.data.id
                : " Not available"}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

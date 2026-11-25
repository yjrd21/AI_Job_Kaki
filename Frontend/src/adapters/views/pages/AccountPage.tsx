import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Info, Save, ShieldCheck } from "lucide-react";
import { useAuthContext } from "../../AuthContext";
import { ErrorNotice, Loading } from "../components/composed/Feedback";
import type { AccountController } from "../../controllers/AccountController";
import { AccountPresenter } from "../../presenters/AccountPresenter";
import { AccountForm } from "../components/composed/AccountForm";

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

  // The protected route remounts when the authenticated user changes.
  useEffect(() => {
    void accountController.loadAccount(userId, presenter);
    return () => presenter.cancelRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Load once per page mount.
  }, []);

  return (
    <div className="max-w-3xl">
      <p className="eyebrow mb-4">YOUR WORKSPACE</p>
      <h1 className="display-title mb-4">Account settings</h1>
      <p className="muted mb-10">
        Keep your basic account information up to date.
      </p>
      {view.account.status === "loading" ? (
        <Loading />
      ) : view.account.status === "error" ? (
        <ErrorNotice
          error={view.account.error}
          retry={() => void accountController.loadAccount(userId, presenter)}
        />
      ) : (
        <>
          {view.account.status === "ready" && formValues && (
            <AccountForm
              values={formValues}
              resolver={(values) =>
                accountController.resolveAccountForm(values, presenter)
              }
              onSubmit={(values) =>
                accountController.submitAccount(userId, values, presenter)
              }
              formClassName="card p-6 sm:p-8 mb-6"
              title="Personal details"
              description={
                <p className="text-xs muted flex items-start gap-2 mt-4 leading-5">
                  <Info size={16} className="shrink-0" />
                  Keycloak and PostgreSQL store identity information separately.
                  The gateway may resynchronize names and email from Keycloak;
                  coordinate permanent identity changes there as well.
                </p>
              }
              getFormErrorMessage={(errors) => errors.root?.controller?.message}
              submissionError={
                view.save.status === "error" ? (
                  <div className="mt-5">
                    <ErrorNotice error={view.save.error} />
                  </div>
                ) : null
              }
              successMessage={
                view.save.status === "saved" ? (
                  <p role="status" className="mt-4 text-sm text-green-700">
                    Account saved.
                  </p>
                ) : null
              }
              isSubmitting={view.save.status === "saving"}
              submitIcon={<Save size={16} />}
              submitLabel="Save changes"
              submittingLabel="Saving…"
            />
          )}
          <section className="card p-6 sm:p-8">
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
          </section>
        </>
      )}
    </div>
  );
}

import { useEffect, type HTMLInputTypeAttribute, type ReactNode } from "react";
import {
  useForm,
  type FieldErrors,
  type FieldPath,
  type Resolver,
  type SubmitHandler,
} from "react-hook-form";
import { Button } from "../primitives/Button";
import type { AccountFormInput } from "../../../controllers/AccountController";

export type FormField = {
  id: string;
  name: FieldPath<AccountFormInput>;
  label: string;
  type: HTMLInputTypeAttribute;
  className: string;
};

export type FormFieldGroup = {
  className?: string;
  fields: readonly FormField[];
};

const accountFormFields: readonly FormFieldGroup[] = [
  {
    className: "grid sm:grid-cols-2 gap-5 mb-5",
    fields: [
      {
        id: "firstName",
        name: "firstName",
        label: "First name",
        type: "text",
        className: "field",
      },
      {
        id: "lastName",
        name: "lastName",
        label: "Last name",
        type: "text",
        className: "field",
      },
    ],
  },
  {
    fields: [
      {
        id: "email",
        name: "email",
        label: "Email address",
        type: "email",
        className: "field",
      },
    ],
  },
];

export function AccountForm({
  values,
  resolver,
  onSubmit,
  fieldGroups = accountFormFields,
  formClassName,
  title,
  description,
  getFormErrorMessage,
  submissionError,
  successMessage,
  isSubmitting,
  submitIcon,
  submitLabel,
  submittingLabel,
}: {
  values: AccountFormInput;
  resolver: Resolver<AccountFormInput>;
  onSubmit: SubmitHandler<AccountFormInput>;
  fieldGroups?: readonly FormFieldGroup[];
  formClassName: string;
  title: string;
  description: ReactNode;
  getFormErrorMessage(
    errors: FieldErrors<AccountFormInput>,
  ): string | undefined;
  submissionError: ReactNode;
  successMessage: ReactNode;
  isSubmitting: boolean;
  submitIcon: ReactNode;
  submitLabel: string;
  submittingLabel: string;
}) {
  const form = useForm<AccountFormInput>({
    resolver,
    defaultValues: values,
  });

  useEffect(() => {
    form.reset(values);
  }, [form, values]);

  const handleSubmit = form.handleSubmit(onSubmit);
  const formErrorMessage = getFormErrorMessage(form.formState.errors);

  return (
    <form onSubmit={handleSubmit} className={formClassName}>
      <h2 className="section-title mb-6">{title}</h2>
      {fieldGroups.map((group, groupIndex) => (
        <div className={group.className ?? ""} key={groupIndex}>
          {group.fields.map((field) => {
            const error = form.getFieldState(field.name, form.formState).error;

            return (
              <div key={field.name}>
                <label htmlFor={field.id} className="field-label">
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type={field.type}
                  className={field.className}
                  {...form.register(field.name)}
                />
                {error?.message && (
                  <p className="text-xs text-red-700 mt-1">{error.message}</p>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {description}
      {formErrorMessage && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {formErrorMessage}
        </p>
      )}
      {submissionError}
      {successMessage}
      <div className="flex justify-end mt-6">
        <Button disabled={isSubmitting} type="submit">
          {submitIcon} {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

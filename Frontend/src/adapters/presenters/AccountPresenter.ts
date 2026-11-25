import type { ResolverResult } from "react-hook-form";
import type { User } from "../../domain/models/User";

type AccountState =
  | { status: "loading"; data: User | undefined; error: null }
  | { status: "ready"; data: User; error: null }
  | { status: "error"; data: User | undefined; error: unknown };

type AccountFormValues = Pick<User, "email" | "firstName" | "lastName">;

type AccountValidationInput =
  | { valid: true; values: AccountFormValues }
  | {
      valid: false;
      errors: {
        firstName: string | undefined;
        lastName: string | undefined;
        email: string | undefined;
      };
      formError?: string | undefined;
    };

type AccountValidationPresentation =
  | { valid: true; values: AccountFormValues }
  | {
      valid: false;
      fieldErrors: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      };
      formError: string | null;
    };

export type AccountViewState = {
  account: AccountState;
  save: {
    status: "idle" | "saving" | "saved" | "error";
    error: unknown;
  };
};

const initialState = (): AccountViewState => ({
  account: { status: "loading", data: undefined, error: null },
  save: { status: "idle", error: null },
});

export class AccountPresenter {
  private loadRequest = 0;
  private saveRequest = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): AccountViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.loadRequest++;
    this.saveRequest++;
    this.state = initialState();
    this.notify();
  }

  cancelRequests() {
    this.loadRequest++;
    this.saveRequest++;
  }

  beginLoad(): number {
    const request = ++this.loadRequest;
    const data = this.state.account.data;
    this.publish({
      account: data
        ? { status: "ready", data, error: null }
        : { status: "loading", data: undefined, error: null },
    });
    return request;
  }

  presentAccount(request: number, data: User) {
    if (request === this.loadRequest) {
      this.publish({ account: { status: "ready", data, error: null } });
    }
  }

  presentLoadFailure(request: number, error: unknown) {
    if (request === this.loadRequest) {
      this.publish({
        account: { status: "error", data: this.state.account.data, error },
      });
    }
  }

  beginSave(): number {
    const request = ++this.saveRequest;
    this.publish({ save: { status: "saving", error: null } });
    return request;
  }

  presentSaved(request: number, account: User): boolean {
    if (request !== this.saveRequest) return false;
    this.publish({
      account: { status: "ready", data: account, error: null },
      save: { status: "saved", error: null },
    });
    return true;
  }

  presentSaveFailure(request: number, error: unknown) {
    if (request === this.saveRequest) {
      this.publish({ save: { status: "error", error } });
    }
  }

  presentValidation(
    validation: AccountValidationInput,
  ): AccountValidationPresentation {
    if (validation.valid) {
      return { valid: true, values: validation.values };
    }

    return {
      valid: false,
      fieldErrors: {
        firstName: validation.errors.firstName ?? null,
        lastName: validation.errors.lastName ?? null,
        email: validation.errors.email ?? null,
      },
      formError: validation.formError ?? null,
    };
  }

  toResolverResult(
    validation: AccountValidationPresentation,
  ): ResolverResult<AccountFormValues> {
    if (validation.valid) {
      return { values: validation.values, errors: {} };
    }

    return {
      values: {},
      errors: {
        firstName: validation.fieldErrors.firstName
          ? { type: "validate", message: validation.fieldErrors.firstName }
          : undefined,
        lastName: validation.fieldErrors.lastName
          ? { type: "validate", message: validation.fieldErrors.lastName }
          : undefined,
        email: validation.fieldErrors.email
          ? { type: "validate", message: validation.fieldErrors.email }
          : undefined,
        root: validation.formError
          ? {
              controller: { type: "validate", message: validation.formError },
            }
          : undefined,
      },
    };
  }

  private publish(changes: Partial<AccountViewState>) {
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export type LoginViewState = {
  submitting: boolean;
  error: string | null;
};

function initialState(): LoginViewState {
  return { submitting: false, error: null };
}

export class LoginPresenter {
  private request = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): LoginViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  beginLogin() {
    const request = ++this.request;
    this.publish({ submitting: true, error: null });
    return request;
  }

  presentLoginCompleted(request: number) {
    if (request !== this.request) return;
    this.publish({ submitting: false });
  }

  presentLoginFailure(request: number, error: unknown) {
    if (request !== this.request) return;
    this.publish({
      submitting: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
    });
  }

  private publish(changes: Partial<LoginViewState>) {
    this.state = { ...this.state, ...changes };
    this.listeners.forEach((listener) => listener());
  }
}

import type { LoginPresenter } from "../presenters/LoginPresenter";

type LoginControllerDependencies = {
  startLogin(): Promise<void>;
};

// Coordinate the login use case and present its request outcome.
export class LoginController {
  constructor(private readonly dependencies: LoginControllerDependencies) {}

  async login(presenter: LoginPresenter) {
    const request = presenter.beginLogin();
    try {
      await this.dependencies.startLogin();
      presenter.presentLoginCompleted(request);
    } catch (error) {
      presenter.presentLoginFailure(request, error);
    }
  }
}

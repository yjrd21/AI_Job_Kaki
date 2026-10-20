import type {
  AuthSessionContract,
  AuthClientContract,
} from "../../application/contracts/clients/AuthClientContract";

import type { KeycloakSdkContract } from "../../application/contracts/clients/KeycloakSdkContract";

// Implement the authentication session contract using an injected Keycloak SDK.
export class KeycloakAuthClient implements AuthClientContract {
  // Retain the initialisation promise so the SDK is never initialised twice.
  private initialisation?: Promise<AuthSessionContract>;

  // Track consumers that need to react to session changes.
  private readonly listeners = new Set<
    (session: AuthSessionContract) => void
  >();

  // Connect provider lifecycle events to application session notifications.
  constructor(
    private readonly sdk: KeycloakSdkContract | null,
    private readonly redirects: { login: string; logout: string },
  ) {
    if (sdk) {
      sdk.onAuthSuccess = () => this.publish();
      sdk.onAuthLogout = () => this.publish();
      sdk.onAuthRefreshSuccess = () => this.publish();

      // Clear expired credentials before publishing a refresh failure.
      sdk.onAuthRefreshError = () => {
        sdk.clearToken();
        this.publish("Authentication failed");
      };

      // Attempt a refresh when the provider reports token expiry.
      sdk.onTokenExpired = () => {
        void this.getAccessToken().catch(() => undefined);
      };
    }
  }

  // Restore the session once and return the latest identity to each caller.
  initialise(): Promise<AuthSessionContract> {
    // Keycloak permits init only once, including across React provider remounts.
    this.initialisation ??= this.restore();
    return this.initialisation.then(() => this.snapshot());
  }

  // Check for an existing Keycloak session using Authorization Code with PKCE.
  private async restore(): Promise<AuthSessionContract> {
    if (!this.sdk) throw new Error("Keycloak configuration is missing..");
    await this.sdk.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });
    return this.snapshot();
  }

  // Register a session listener and return the function that removes it.
  subscribe(listener: (session: AuthSessionContract) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Start the provider login flow with the configured return destination.
  async login(): Promise<void> {
    await this.sdk?.login({ redirectUri: this.redirects.login });
  }

  // End the provider session and return to the configured application URL.
  async logout(): Promise<void> {
    await this.sdk?.logout({ redirectUri: this.redirects.logout });
  }

  // Refresh tokens nearing expiry and discard the session if refresh fails.
  async getAccessToken(): Promise<string | undefined> {
    if (!this.sdk?.authenticated) return undefined;
    try {
      await this.sdk.updateToken(30);
      return this.sdk.token;
    } catch (error) {
      this.sdk.clearToken();
      this.publish(
        error instanceof Error ? error.message : "Authentication failed",
      );
      throw error;
    }
  }

  // Translate provider claims into application authentication state.
  private snapshot(error: string | null = null): AuthSessionContract {
    // Read whether the identity provider currently has an authenticated session.
    const authenticated = !!this.sdk?.authenticated;

    // Read identity claims only while the session is authenticated.
    const claims = authenticated ? this.sdk?.tokenParsed : undefined;

    return {
      authenticated,
      userId: claims?.sub ?? null,
      name: String(claims?.name || claims?.preferred_username || ""),
      error,
    };
  }

  // Notify subscribers with a fresh session snapshot and any authentication error.
  private publish(error: string | null = null) {
    // Build the application session data delivered to registered listeners.
    const session = this.snapshot(error);

    this.listeners.forEach((listener) => listener(session));
  }
}

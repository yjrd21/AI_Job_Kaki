// Only the SDK capabilities used by the adapter cross this boundary.
export interface KeycloakSdkContract {
  authenticated?: boolean;
  token?: string;
  tokenParsed?: { sub?: string; name?: string; preferred_username?: string };
  init(options: {
    onLoad: "check-sso";
    pkceMethod: "S256";
    checkLoginIframe: boolean;
  }): Promise<boolean>;
  login(options: { redirectUri: string }): Promise<void>;
  logout(options: { redirectUri: string }): Promise<void>;
  updateToken(minValidity: number): Promise<boolean>;
  clearToken(): void;
  onAuthSuccess?: () => void;
  onAuthLogout?: () => void;
  onAuthRefreshSuccess?: () => void;
  onAuthRefreshError?: () => void;
  onTokenExpired?: () => void;
}

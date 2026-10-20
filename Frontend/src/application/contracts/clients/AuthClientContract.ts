// Expose authentication state and user identity without identity-provider details.
export interface AuthSessionContract {
  authenticated: boolean;
  userId: string | null;
  name: string;
  error: string | null;
}

// Define the session lifecycle and token capabilities required by the application.
export interface AuthClientContract {
  initialise(): Promise<AuthSessionContract>;
  subscribe(listener: (session: AuthSessionContract) => void): () => void;
  login(): Promise<void>;
  logout(): Promise<void>;
  getAccessToken(): Promise<string | undefined>;
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import Keycloak from "keycloak-js";

import { env } from "../../../app/config/env";
import { configureAccessToken } from "../../../networks/client/httpClient";

type AuthState = {
  ready: boolean;
  authenticated: boolean;
  userId: string | null;
  name: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
};

const Context = createContext<AuthState | null>(null);

const kc =
  env.keycloakUrl && env.keycloakRealm && env.keycloakClientId
    ? new Keycloak({
        url: env.keycloakUrl,
        realm: env.keycloakRealm,
        clientId: env.keycloakClientId,
      })
    : null;

// Owns the Keycloak session: restores it on load, tracks who is signed in, wires the access token into the HTTP client, and shares it all with the app through context.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<string | null>(null);

  // Runs once on mount: initialises Keycloak (silent SSO check), copies the user's identity into state, and registers the token supplier used by httpClient.
  useEffect(() => {
    if (!kc) {
      setError("Keycloak configuration is missing..");
      setReady(true);
      return;
    }

    // Guards against setting state after the component unmounted.
    let live = true;

    kc.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
    })
      .then((ok) => {
        if (!live) return;
        setAuthenticated(ok);
        setName(
          String(
            kc.tokenParsed?.name || kc.tokenParsed?.preferred_username || "",
          ),
        );
        setSubject(kc.tokenParsed?.sub ?? null);
        setReady(true);
      })
      .catch((e) => {
        if (live) {
          setError(e instanceof Error ? e.message : "Authentication failed");
          setReady(true);
        }
      });

    // Gives httpClient a way to fetch a valid token per request, refreshing it if it expires within 30s.
    configureAccessToken(async () => {
      if (!kc?.authenticated) return undefined;
      await kc.updateToken(30);
      return kc.token;
    });

    // Cleanup on unmount: ignore late results and stop supplying tokens.
    return () => {
      live = false;
      configureAccessToken(async () => undefined);
    };
  }, []);

  // Builds the context value, recreated only when one of the listed dependencies changes so consumers don't re-render needlessly.
  const value = useMemo<AuthState>(
    () => ({
      ready,
      authenticated,
      userId: subject,
      name,
      error,

      // Redirects the browser to Keycloak's login page, returning to /dashboard afterwards.
      login: async () => {
        await kc?.login({ redirectUri: window.location.origin + "/dashboard" });
      },

      // Ends the Keycloak session and returns to the app's root URL.
      logout: async () => {
        await kc?.logout({ redirectUri: window.location.origin });
      },
    }),
    [ready, authenticated, name, subject, error],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// Hook that lets any component read the auth state, and fails loudly if used outside AuthProvider.
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}

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
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  useEffect(() => {
    if (!kc) {
      setError("Keycloak configuration is missing. See .env.example.");
      setReady(true);
      return;
    }
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
    configureAccessToken(async () => {
      if (!kc?.authenticated) return undefined;
      await kc.updateToken(30);
      return kc.token;
    });
    return () => {
      live = false;
      configureAccessToken(async () => undefined);
    };
  }, []);
  const value = useMemo<AuthState>(
    () => ({
      ready,
      authenticated,
      userId: subject,
      name,
      error,
      login: async () => {
        await kc?.login({ redirectUri: window.location.origin + "/dashboard" });
      },
      logout: async () => {
        await kc?.logout({ redirectUri: window.location.origin });
      },
    }),
    [ready, authenticated, name, subject, error],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}

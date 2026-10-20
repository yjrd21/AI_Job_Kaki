// Read public Vite configuration and apply the local API URL fallback.
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL || "",
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM || "",
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "",
};

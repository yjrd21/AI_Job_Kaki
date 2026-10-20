import Keycloak from "keycloak-js";
import type { KeycloakSdkContract } from "../../application/contracts/clients/KeycloakSdkContract";

// Construct the Keycloak SDK only when its required configuration is available.
export function createKeycloakSdk(config: {
  url: string;
  realm: string;
  clientId: string;
}): KeycloakSdkContract | null {
  return config.url && config.realm && config.clientId
    ? new Keycloak(config)
    : null;
}

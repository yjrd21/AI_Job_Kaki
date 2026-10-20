import { describe, expect, it, vi } from "vitest";
import { KeycloakAuthClient } from "../../../src/adapters/clients/KeycloakAuthClient";
import type { KeycloakSdkContract } from "../../../src/application/contracts/clients/KeycloakSdkContract";

function makeDriver() {
  const sdk: KeycloakSdkContract = {
    authenticated: true,
    token: "old-token",
    tokenParsed: { sub: "user-id", preferred_username: "Candidate" },
    init: vi.fn().mockResolvedValue(true),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    updateToken: vi.fn().mockResolvedValue(false),
    clearToken: vi.fn(() => {
      sdk.authenticated = false;
      sdk.token = undefined;
    }),
  };
  return sdk;
}
const redirects = {
  login: "http://localhost/dashboard",
  logout: "http://localhost",
};

describe("Keycloak authentication boundary", () => {
  it("initialises once across concurrent callers and remounts, and maps identity", async () => {
    const sdk = makeDriver();
    const client = new KeycloakAuthClient(sdk, redirects);
    const [first, second] = await Promise.all([
      client.initialise(),
      client.initialise(),
    ]);
    expect(first).toEqual({
      authenticated: true,
      userId: "user-id",
      name: "Candidate",
      error: null,
    });
    expect(second).toEqual(first);
    await client.initialise();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });
  });

  it("refreshes before returning the token and preserves redirect destinations", async () => {
    const sdk = makeDriver();
    vi.mocked(sdk.updateToken).mockImplementation(async () => {
      sdk.token = "fresh-token";
      return true;
    });
    const client = new KeycloakAuthClient(sdk, redirects);
    expect(await client.getAccessToken()).toBe("fresh-token");
    expect(sdk.updateToken).toHaveBeenCalledWith(30);
    await client.login();
    await client.logout();
    expect(sdk.login).toHaveBeenCalledWith({ redirectUri: redirects.login });
    expect(sdk.logout).toHaveBeenCalledWith({
      redirectUri: redirects.logout,
    });
  });

  it("clears stale identity on refresh failure and unsubscribes listeners", async () => {
    const sdk = makeDriver();
    vi.mocked(sdk.updateToken).mockRejectedValue(new Error("Session expired"));
    const client = new KeycloakAuthClient(sdk, redirects);
    const listener = vi.fn();
    const unsubscribe = client.subscribe(listener);
    await expect(client.getAccessToken()).rejects.toThrow("Session expired");
    expect(sdk.clearToken).toHaveBeenCalled();
    expect(listener).toHaveBeenLastCalledWith({
      authenticated: false,
      userId: null,
      name: "",
      error: "Session expired",
    });
    expect(await client.getAccessToken()).toBeUndefined();
    unsubscribe();
    listener.mockClear();
    sdk.onAuthLogout?.();
    expect(listener).not.toHaveBeenCalled();
  });

  it("publishes SDK login/logout changes without leaking stale identity", () => {
    const sdk = makeDriver();
    const client = new KeycloakAuthClient(sdk, redirects);
    const listener = vi.fn();
    client.subscribe(listener);
    sdk.onAuthSuccess?.();
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: "user-id" }),
    );
    sdk.authenticated = false;
    sdk.onAuthLogout?.();
    expect(listener).toHaveBeenLastCalledWith({
      authenticated: false,
      userId: null,
      name: "",
      error: null,
    });
  });

  it("reports missing configuration without contacting an identity provider", async () => {
    const client = new KeycloakAuthClient(null, redirects);
    await expect(client.initialise()).rejects.toThrow(
      "Keycloak configuration is missing",
    );
    expect(await client.getAccessToken()).toBeUndefined();
  });
});

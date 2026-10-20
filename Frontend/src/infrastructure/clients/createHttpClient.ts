import axios from "axios";
import type { HttpClientContract } from "../../application/contracts/clients/HttpClientContract";

// Construct an authenticated Axios transport behind the application HTTP contract.
export function createHttpClient(
  baseURL: string,
  getToken: () => Promise<string | undefined>,
): HttpClientContract {
  // Configure the API base URL and a twenty-second request timeout.
  const client = axios.create({ baseURL, timeout: 20000 });

  // Attach a current bearer token to each outgoing request when a session is available.
  client.interceptors.request.use(async (config) => {
    // Obtain a valid access token from the injected session before sending the request.
    const token = await getToken();

    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  // Expose public backend messages as ordinary errors while retaining the original cause.
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error)) {
        // Prefer the backend explanation over the generic transport message.
        const payload = error.response?.data as
          { message?: string; detail?: string } | undefined;

        throw new Error(
          payload?.message ||
            payload?.detail ||
            error.message ||
            "Network request failed",
          { cause: error },
        );
      }

      throw error instanceof Error
        ? error
        : new Error("Unexpected error", { cause: error });
    },
  );

  // Expose response payloads through the transport contract without leaking Axios response types.
  return {
    get: async <T>(url: string) => ({ data: (await client.get<T>(url)).data }),
    post: async <T>(url: string, body?: unknown) => ({
      data: (await client.post<T>(url, body)).data,
    }),
    put: async <T>(url: string, body: unknown) => ({
      data: (await client.put<T>(url, body)).data,
    }),
    delete: async (url: string) => {
      await client.delete(url);
    },
  };
}

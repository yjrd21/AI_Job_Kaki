// Define the HTTP transport contract without exposing Axios-specific types.
export interface HttpClientContract {
  get<T>(url: string): Promise<{ data: T }>;
  post<T>(url: string, body?: unknown): Promise<{ data: T }>;
  put<T>(url: string, body: unknown): Promise<{ data: T }>;
  delete(url: string): Promise<void>;
}

import { QueryClient } from "@tanstack/react-query";

// Construct the React Query client with shared cache and retry configuration.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false },
    },
  });
}

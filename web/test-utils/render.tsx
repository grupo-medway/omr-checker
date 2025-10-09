import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient();
  return {
    queryClient,
    wrapper: ({ children: node }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
    ),
  };
}

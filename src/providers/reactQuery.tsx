import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { type FunctionComponent, type ReactNode, useMemo } from "react";
import useAuth from "@/hooks/useAuth";
import { toaster } from "@/lib/toaster";

interface ReactQueryProviderProps {
  children: ReactNode;
}

const ReactQueryProvider: FunctionComponent<ReactQueryProviderProps> = ({
  children,
}) => {
  const { user, workspaceId } = useAuth();

  const queryClient = useMemo(() => {
    const enabled = !!user?.id && !!workspaceId;
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          onError: (err: unknown) => {
            const axiosError = err as AxiosError<{ message: string }>;
            const message = axiosError?.response?.data?.message;
            toaster.error({
              title: message || (err as Error).message,
              type: "error",
            });
          },
        },
        queries: {
          enabled,
          queryKeyHashFn: (queryKey) => {
            const key = [
              `workspaceId:${workspaceId || "none"}`,
              `userId:${user?.id || "none"}`,
              ...queryKey,
            ];
            return JSON.stringify(key);
          },
          refetchOnWindowFocus: false,
        },
      },
    });

    return queryClient;
  }, [workspaceId, user?.id]);

  return (
    <>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </>
  );
};

export default ReactQueryProvider;

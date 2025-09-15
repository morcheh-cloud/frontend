import { NuqsAdapter } from "nuqs/adapters/react";
import type { FunctionComponent, ReactNode } from "react";
import AppProvider from "@/providers/AppProvider";
import AuthProvider from "@/providers/AuthProvider";
import ReactQueryProvider from "@/providers/reactQuery";
import ThemeProvider from "@/providers/theme";

interface ProviderProps {
  children: ReactNode;
}

const AppProviders: FunctionComponent<ProviderProps> = ({ children }) => {
  return (
    <>
      <ThemeProvider>
        <NuqsAdapter>
          <AuthProvider>
            <ReactQueryProvider>
              <AppProvider>{children}</AppProvider>
            </ReactQueryProvider>
          </AuthProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </>
  );
};

export default AppProviders;

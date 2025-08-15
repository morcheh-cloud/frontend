import MainLayout from "@/layouts/main";
import ThemeProvider from "@/providers/theme";
import type { FunctionComponent } from "react";

interface ProviderProps {
  children: React.ReactNode;
}

const Provider: FunctionComponent<ProviderProps> = ({ children }) => {
  return (
    <>
      <ThemeProvider>{children}</ThemeProvider>
    </>
  );
};

export default Provider;

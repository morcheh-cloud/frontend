import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";
import type { FunctionComponent, ReactNode } from "react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {},
    },
  },
});

const system = createSystem(defaultConfig, config);

interface ThemeProps {
  children: ReactNode;
}

const ThemeProvider: FunctionComponent<ThemeProps> = ({ children }) => {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
};

export default ThemeProvider;

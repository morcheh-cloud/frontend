import {
  createTheme,
  DEFAULT_THEME,
  MantineProvider,
  mergeMantineTheme,
  type MantineProviderProps,
} from "@mantine/core";
import { emotionTransform, MantineEmotionProvider } from "@mantine/emotion";

export const customTheme = createTheme({
  fontFamily: "Inter, sans-serif",
  colors: {
    brand: DEFAULT_THEME.colors.blue,
  },
  primaryColor: "brand",
  autoContrast: true,
  cursorType: "pointer",
  components: {
    Text: {
      styles: {
        root: {
          color: "#333333",
        },
      },
    },
  },
});

export const appTheme = mergeMantineTheme(DEFAULT_THEME, customTheme);

export function AppTheme({
  children,
  theme = appTheme,
  ...props
}: MantineProviderProps) {
  return (
    <MantineProvider
      stylesTransform={emotionTransform}
      defaultColorScheme="light"
      theme={theme}
      {...props}
    >
      <MantineEmotionProvider>{children}</MantineEmotionProvider>
    </MantineProvider>
  );
}

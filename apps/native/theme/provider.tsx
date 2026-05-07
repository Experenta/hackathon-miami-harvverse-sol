import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { useFonts, type FontSource } from "expo-font";
import {
  createTheme,
  type AppTheme,
  type ResolvedThemeMode,
  type ThemeMode,
} from "./semantic";
import { createGradients, type GradientTokens } from "./gradients";
import { resolveBrandFontFamily } from "./typography";

function getTrendaFontSource(): FontSource | null {
  return null;
}

export type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
  theme: AppTheme;
  gradients: GradientTokens;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = PropsWithChildren<{
  defaultMode?: ThemeMode;
}>;

export function ThemeProvider({
  children,
  defaultMode = "dark",
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const trendaFontSource = getTrendaFontSource();
  const [fontsLoaded] = useFonts(
    trendaFontSource
      ? {
          Trenda: trendaFontSource,
        }
      : {},
  );
  const systemResolvedMode: ResolvedThemeMode =
    systemColorScheme === "light" ? "light" : "dark";

  const resolvedMode: ResolvedThemeMode =
    mode === "system" ? systemResolvedMode : mode;
  const brandFontFamily = resolveBrandFontFamily(
    Boolean(trendaFontSource) && fontsLoaded,
  );
  const theme = createTheme(resolvedMode, brandFontFamily);
  const gradients = createGradients(theme);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        resolvedMode,
        setMode,
        theme,
        gradients,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeProvider is required to use theme hooks.");
  }

  return context;
}

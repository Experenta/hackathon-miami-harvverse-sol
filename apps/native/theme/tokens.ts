import { Platform, type ViewStyle } from "react-native";

const baseColors = {
  backgroundBlue: "#001020",
  green: "#93D832",
  blue: "#67B9C1",
  purple: "#6766C4",
  white: "#EEEEEE",
} as const;

const darkNeutrals = {
  950: "#001020",
  900: "#04172a",
  850: "#082036",
  800: "#0d2942",
  750: "#12314d",
  700: "#183b59",
} as const;

const whiteAlpha = {
  100: "rgba(238, 238, 238, 1)",
  96: "rgba(238, 238, 238, 0.96)",
  92: "rgba(238, 238, 238, 0.92)",
  72: "rgba(238, 238, 238, 0.72)",
  56: "rgba(238, 238, 238, 0.56)",
  40: "rgba(238, 238, 238, 0.40)",
  24: "rgba(238, 238, 238, 0.24)",
  12: "rgba(238, 238, 238, 0.12)",
  8: "rgba(238, 238, 238, 0.08)",
} as const;

const neutralAlpha = {
  20: "rgba(0, 16, 32, 0.20)",
  16: "rgba(0, 16, 32, 0.16)",
  12: "rgba(0, 16, 32, 0.12)",
  8: "rgba(0, 16, 32, 0.08)",
} as const;

const greenAlpha = {
  8: "rgba(147, 216, 50, 0.08)",
  24: "rgba(147, 216, 50, 0.24)",
  16: "rgba(147, 216, 50, 0.16)",
  12: "rgba(147, 216, 50, 0.12)",
} as const;

const blueAlpha = {
  8: "rgba(103, 185, 193, 0.08)",
  24: "rgba(103, 185, 193, 0.24)",
  16: "rgba(103, 185, 193, 0.16)",
  12: "rgba(103, 185, 193, 0.12)",
} as const;

const purpleAlpha = {
  8: "rgba(103, 102, 196, 0.08)",
  24: "rgba(103, 102, 196, 0.24)",
  16: "rgba(103, 102, 196, 0.16)",
  12: "rgba(103, 102, 196, 0.12)",
} as const;

const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
} as const;

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

const borderWidth = {
  none: 0,
  thin: 1,
  strong: 2,
  brandOutline: 2,
} as const;

const elevation = {
  card: Platform.select<ViewStyle>({
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: baseColors.white,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
  }) as ViewStyle,
  raised: Platform.select<ViewStyle>({
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: baseColors.white,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
  }) as ViewStyle,
} as const;

export const foundationTokens = {
  colors: {
    base: baseColors,
    neutral: darkNeutrals,
    alpha: {
      white: whiteAlpha,
      neutral: neutralAlpha,
      green: greenAlpha,
      blue: blueAlpha,
      purple: purpleAlpha,
    },
  },
  spacing,
  radius,
  borderWidth,
  elevation,
} as const;

export type FoundationTokens = typeof foundationTokens;

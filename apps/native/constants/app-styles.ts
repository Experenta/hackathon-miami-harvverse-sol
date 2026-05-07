import { StyleSheet } from "react-native";
import type { AppTheme } from "@/theme";

export function createAppStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface.default,
      borderColor: theme.colors.border.default,
      borderRadius: theme.radius.md,
      borderWidth: theme.borderWidth.thin,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      ...theme.elevation.card,
    },
    screen: {
      flex: 1,
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    stack: {
      gap: theme.spacing.xs,
    },
    title: {
      ...theme.typography.text1,
      color: theme.colors.text.primary,
    },
  });
}

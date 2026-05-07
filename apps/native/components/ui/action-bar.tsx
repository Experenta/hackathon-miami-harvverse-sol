import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface ActionBarProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "subtle";
}

export function ActionBar({
  children,
  style,
  variant = "default",
}: ActionBarProps) {
  const { theme } = useTheme();
  const palette =
    variant === "subtle"
      ? {
          backgroundColor: theme.colors.surface.default,
          borderColor: theme.colors.border.subtle,
        }
      : {
          backgroundColor: theme.colors.surface.raised,
          borderColor: theme.colors.border.default,
        };

  return (
    <View
      style={[
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderRadius: theme.radius.xl,
          borderWidth: theme.borderWidth.thin,
          padding: theme.spacing.sm,
          gap: theme.spacing.sm,
          ...theme.elevation.raised,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

export type StatusPillTone =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "farmer"
  | "partner"
  | "accent";

interface StatusPillProps {
  label: string;
  tone: StatusPillTone;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ label, tone, style }: StatusPillProps) {
  const { theme } = useTheme();

  const palette =
    tone === "success"
      ? theme.colors.feedback.success
      : tone === "info"
        ? theme.colors.feedback.info
        : tone === "warning"
          ? theme.colors.feedback.warning
          : tone === "error"
            ? theme.colors.feedback.error
            : tone === "accent"
              ? {
                  background: theme.colors.role.partner.background,
                  border: theme.colors.role.partner.border,
                  foreground: theme.colors.role.partner.foreground,
                  accent: theme.colors.role.partner.foreground,
                }
              : tone === "farmer"
                ? {
                    background: theme.colors.role.farmer.background,
                    border: theme.colors.role.farmer.border,
                    foreground: theme.colors.role.farmer.foreground,
                    accent: theme.colors.role.farmer.foreground,
                  }
                : {
                    background: theme.colors.role.partner.background,
                    border: theme.colors.role.partner.border,
                    foreground: theme.colors.role.partner.foreground,
                    accent: theme.colors.role.partner.foreground,
                  };

  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: theme.radius.pill,
          borderWidth: theme.borderWidth.thin,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 6,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: theme.radius.pill,
          backgroundColor: palette.accent,
        }}
      />
      <Text
        style={[
          theme.typography.labelSm,
          {
            color: palette.foreground,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

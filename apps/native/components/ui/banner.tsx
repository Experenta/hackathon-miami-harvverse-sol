import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

export type BannerTone = "info" | "success" | "warning" | "error" | "accent";

interface BannerProps {
  title: string;
  description?: string;
  tone?: BannerTone;
  accessory?: React.ReactNode;
  eyebrow?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Banner({
  title,
  description,
  tone = "info",
  accessory,
  eyebrow,
  children,
  style,
}: BannerProps) {
  const { theme } = useTheme();
  const palette =
    tone === "success"
      ? theme.colors.feedback.success
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
            : theme.colors.feedback.info;

  return (
    <View
      style={[
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          {eyebrow ? (
            <Text
              style={[
                theme.typography.labelSm,
                {
                  color: palette.accent,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                },
              ]}
            >
              {eyebrow}
            </Text>
          ) : null}
          <Text style={[theme.typography.text1, { color: palette.foreground }]}>
            {title}
          </Text>
          {description ? (
            <Text
              style={[
                theme.typography.bodySm,
                {
                  color:
                    tone === "warning"
                      ? palette.foreground
                      : theme.colors.text.secondary,
                },
              ]}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {accessory ? <View>{accessory}</View> : null}
      </View>
      {children ? (
        <View style={{ gap: theme.spacing.sm }}>{children}</View>
      ) : null}
    </View>
  );
}

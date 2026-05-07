import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface DetailRowProps {
  label: string;
  value: string;
  helper?: string;
  mono?: boolean;
  valueTone?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
}

export function DetailRow({
  label,
  value,
  helper,
  mono = false,
  valueTone = "primary",
  style,
}: DetailRowProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text
          style={[
            theme.typography.labelSm,
            {
              color: theme.colors.text.muted,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            },
          ]}
        >
          {label}
        </Text>
        {helper ? (
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.muted },
            ]}
          >
            {helper}
          </Text>
        ) : null}
      </View>
      <View style={{ flexShrink: 1, minWidth: 0, maxWidth: "58%" }}>
        <Text
          style={[
            mono ? theme.typography.mono : theme.typography.labelMd,
            {
              color:
                valueTone === "secondary"
                  ? theme.colors.text.secondary
                  : theme.colors.text.primary,
              textAlign: "right",
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

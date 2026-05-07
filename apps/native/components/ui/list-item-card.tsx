import {
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import { Badge, type BadgeTone } from "./badge";
import { Card } from "./card";
import { DetailRow } from "./detail-row";
import { StatusPill, type StatusPillTone } from "./status-pill";

type ListItemCardTone = "default" | "farmer" | "partner" | "info" | "success";

interface ListItemCardBadge {
  label: string;
  tone?: BadgeTone;
}

interface ListItemCardDetail {
  label: string;
  value: string;
  helper?: string;
}

interface ListItemCardProps extends Omit<
  TouchableOpacityProps,
  "style" | "children"
> {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  status?: {
    label: string;
    tone: StatusPillTone;
  };
  highlight?: {
    label: string;
    value: string;
  };
  badges?: ListItemCardBadge[];
  details?: ListItemCardDetail[];
  tone?: ListItemCardTone;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function ListItemCard({
  title,
  subtitle,
  eyebrow,
  status,
  highlight,
  badges,
  details,
  tone = "default",
  style,
  contentStyle,
  disabled,
  ...rest
}: ListItemCardProps) {
  const { theme } = useTheme();

  const variant =
    tone === "farmer"
      ? "success"
      : tone === "partner"
        ? "accent"
        : tone === "info"
          ? "info"
          : tone === "success"
            ? "success"
            : "default";

  const accentColor =
    tone === "farmer"
      ? theme.colors.role.farmer.foreground
      : tone === "partner"
        ? theme.colors.role.partner.foreground
        : tone === "info"
          ? theme.colors.feedback.info.accent
          : tone === "success"
            ? theme.colors.feedback.success.accent
            : theme.colors.text.brand;
  const textPalette =
    variant === "default"
      ? {
          title: theme.colors.text.primary,
          body: theme.colors.text.secondary,
          surface: theme.colors.surface.subtle,
          border: theme.colors.border.default,
          label: theme.colors.text.muted,
        }
      : variant === "accent"
        ? {
            title: theme.colors.role.partner.foreground,
            body: theme.colors.role.partner.foreground,
            surface: theme.colors.surface.raised,
            border: theme.colors.border.strong,
            label: theme.colors.text.muted,
          }
        : {
            title: theme.colors.feedback[variant].foreground,
            body: theme.colors.feedback[variant].foreground,
            surface: theme.colors.surface.raised,
            border: theme.colors.border.strong,
            label: theme.colors.text.muted,
          };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.9}
      disabled={disabled}
      style={style}
      {...rest}
    >
      <Card
        variant={variant}
        style={[
          {
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.xl,
          },
          contentStyle,
        ]}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: theme.radius.pill,
                  backgroundColor: accentColor,
                }}
              />
              {eyebrow ? (
                <Text
                  style={[
                    theme.typography.labelSm,
                    {
                      color: accentColor,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    },
                  ]}
                >
                  {eyebrow}
                </Text>
              ) : null}
            </View>
            {status ? (
              <StatusPill label={status.label} tone={status.tone} />
            ) : null}
          </View>

          <View style={{ gap: 4 }}>
            <Text
              style={[theme.typography.text2, { color: textPalette.title }]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[theme.typography.bodySm, { color: textPalette.body }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {highlight ? (
          <View
            style={{
              backgroundColor: textPalette.surface,
              borderColor: textPalette.border,
              borderRadius: theme.radius.lg,
              borderWidth: theme.borderWidth.thin,
              padding: theme.spacing.md,
              gap: 4,
            }}
          >
            <Text
              style={[
                theme.typography.labelSm,
                {
                  color: textPalette.label,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                },
              ]}
            >
              {highlight.label}
            </Text>
            <Text style={[theme.typography.h2, { color: textPalette.title }]}>
              {highlight.value}
            </Text>
          </View>
        ) : null}

        {badges && badges.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: theme.spacing.xs,
            }}
          >
            {badges.map((badge) => (
              <Badge
                key={`${badge.tone ?? "neutral"}-${badge.label}`}
                label={badge.label}
                tone={badge.tone}
              />
            ))}
          </View>
        ) : null}

        {details && details.length > 0 ? (
          <View style={{ gap: theme.spacing.sm }}>
            {details.map((detail) => (
              <DetailRow
                key={`${detail.label}-${detail.value}`}
                label={detail.label}
                value={detail.value}
                helper={detail.helper}
              />
            ))}
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}

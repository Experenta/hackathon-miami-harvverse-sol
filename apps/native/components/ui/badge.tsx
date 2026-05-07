import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

export type BadgeTone =
	| "neutral"
	| "brand"
	| "info"
	| "warning"
	| "success"
	| "partner";

interface BadgeProps {
	label: string;
	tone?: BadgeTone;
	style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = "neutral", style }: BadgeProps) {
	const { theme } = useTheme();

	const palette =
		tone === "brand"
			? {
					background: theme.colors.role.farmer.background,
					border: theme.colors.role.farmer.border,
					foreground: theme.colors.role.farmer.foreground,
				}
			: tone === "info"
				? {
						background: theme.colors.feedback.info.background,
						border: theme.colors.feedback.info.border,
						foreground: theme.colors.feedback.info.foreground,
				  }
				: tone === "warning"
					? {
							background: theme.colors.feedback.warning.background,
							border: theme.colors.feedback.warning.border,
							foreground: theme.colors.feedback.warning.foreground,
					  }
				: tone === "success"
					? {
							background: theme.colors.feedback.success.background,
							border: theme.colors.feedback.success.border,
							foreground: theme.colors.feedback.success.foreground,
					  }
					: tone === "partner"
						? {
								background: theme.colors.role.partner.background,
								border: theme.colors.role.partner.border,
								foreground: theme.colors.role.partner.foreground,
						  }
				: {
						background: theme.colors.surface.subtle,
						border: theme.colors.border.default,
						foreground: theme.colors.text.secondary,
				  };

	return (
		<View
			style={[
				{
					alignSelf: "flex-start",
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
			<Text
				style={[
					theme.typography.labelSm,
					{
						color: palette.foreground,
						letterSpacing: 0.8,
						textTransform: "uppercase",
					},
				]}
			>
				{label}
			</Text>
		</View>
	);
}

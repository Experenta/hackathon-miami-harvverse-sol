import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { Badge, type BadgeTone } from "./badge";
import { Card } from "./card";

type MetricCardTone = "default" | "farmer" | "partner" | "info" | "success";

interface MetricCardProps {
	label: string;
	value: string;
	helper?: string;
	eyebrow?: string;
	badge?: {
		label: string;
		tone?: BadgeTone;
	};
	tone?: MetricCardTone;
	style?: StyleProp<ViewStyle>;
}

export function MetricCard({
	label,
	value,
	helper,
	eyebrow,
	badge,
	tone = "default",
	style,
}: MetricCardProps) {
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
				}
			: variant === "accent"
				? {
						title: theme.colors.role.partner.foreground,
						body: theme.colors.role.partner.foreground,
					}
				: {
						title: theme.colors.feedback[variant].foreground,
						body: theme.colors.feedback[variant].foreground,
					};

	return (
		<Card
			variant={variant}
			style={[
				{
					flex: 1,
					gap: theme.spacing.sm,
					minHeight: 124,
				},
				style,
			]}
		>
			<View
				style={{
					alignItems: "flex-start",
					flexDirection: "row",
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
									color: accentColor,
									letterSpacing: 1,
									textTransform: "uppercase",
								},
							]}
						>
							{eyebrow}
						</Text>
					) : null}
					<Text
						style={[
							theme.typography.labelMd,
							{ color: textPalette.body },
						]}
					>
						{label}
					</Text>
				</View>
				{badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
			</View>

			<View style={{ gap: 6 }}>
				<Text
					style={[theme.typography.h2, { color: textPalette.title }]}
				>
					{value}
				</Text>
				{helper ? (
					<Text
						style={[
							theme.typography.bodySm,
							{ color: textPalette.body },
						]}
					>
						{helper}
					</Text>
				) : null}
			</View>
		</Card>
	);
}

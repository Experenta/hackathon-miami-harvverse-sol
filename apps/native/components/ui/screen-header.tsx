import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface ScreenHeaderProps {
	title: string;
	subtitle?: string;
	eyebrow?: string;
	trailing?: React.ReactNode;
	style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
	title,
	subtitle,
	eyebrow,
	trailing,
	style,
}: ScreenHeaderProps) {
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
			<View style={{ flex: 1, gap: theme.spacing.xs }}>
				{eyebrow ? (
					<Text
						style={[
							theme.typography.labelSm,
							{
								color: theme.colors.text.brand,
								letterSpacing: 1.2,
								textTransform: "uppercase",
							},
						]}
					>
						{eyebrow}
					</Text>
				) : null}
				<Text
					style={[
						theme.typography.h1,
						{ color: theme.colors.text.primary },
					]}
				>
					{title}
				</Text>
				{subtitle ? (
					<Text
						style={[
							theme.typography.bodySm,
							{ color: theme.colors.text.secondary, maxWidth: 520 },
						]}
					>
						{subtitle}
					</Text>
				) : null}
			</View>
			{trailing ? <View>{trailing}</View> : null}
		</View>
	);
}

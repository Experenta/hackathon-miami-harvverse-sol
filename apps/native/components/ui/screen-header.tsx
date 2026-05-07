import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BackButton } from "./back-button";
import { useTheme } from "@/theme";

interface ScreenHeaderProps {
	title: string;
	subtitle?: string;
	eyebrow?: string;
	trailing?: React.ReactNode;
	style?: StyleProp<ViewStyle>;
	/** Show an inline back button above the title. Defaults to false. */
	showBack?: boolean;
	/** Custom label for the back button (e.g. "Back"). */
	backLabel?: string;
	/** Custom onPress for the back button. Falls back to router.back(). */
	onBack?: () => void;
}

export function ScreenHeader({
	title,
	subtitle,
	eyebrow,
	trailing,
	style,
	showBack = false,
	backLabel,
	onBack,
}: ScreenHeaderProps) {
	const { theme } = useTheme();

	return (
		<View style={[{ gap: theme.spacing.xs }, style]}>
			{showBack ? (
				<BackButton label={backLabel} onPress={onBack} />
			) : null}
			<View
				style={{
					flexDirection: "row",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: theme.spacing.md,
				}}
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
								{
									color: theme.colors.text.secondary,
									maxWidth: 520,
								},
							]}
						>
							{subtitle}
						</Text>
					) : null}
				</View>
				{trailing ? <View>{trailing}</View> : null}
			</View>
		</View>
	);
}

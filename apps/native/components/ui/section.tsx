import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface SectionProps {
	title?: string;
	description?: string;
	aside?: React.ReactNode;
	children?: React.ReactNode;
	style?: StyleProp<ViewStyle>;
	contentStyle?: StyleProp<ViewStyle>;
}

export function Section({
	title,
	description,
	aside,
	children,
	style,
	contentStyle,
}: SectionProps) {
	const { theme } = useTheme();

	return (
		<View style={[{ gap: theme.spacing.sm }, style]}>
			{title || description || aside ? (
				<View
					style={{
						flexDirection: "row",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: theme.spacing.sm,
					}}
				>
					<View style={{ flex: 1, gap: 4 }}>
						{title ? (
							<Text
								style={[
									theme.typography.text1,
									{ color: theme.colors.text.primary },
								]}
							>
								{title}
							</Text>
						) : null}
						{description ? (
							<Text
								style={[
									theme.typography.bodySm,
									{ color: theme.colors.text.secondary },
								]}
							>
								{description}
							</Text>
						) : null}
					</View>
					{aside ? <View>{aside}</View> : null}
				</View>
			) : null}
			{children ? (
				<View style={[{ gap: theme.spacing.md }, contentStyle]}>
					{children}
				</View>
			) : null}
		</View>
	);
}

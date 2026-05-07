import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme";

interface BackButtonProps {
	label?: string;
	onPress?: () => void;
	style?: StyleProp<ViewStyle>;
}

/**
 * Minimal inline back button for immersive screens without a navigation header.
 * Falls back to router.back() if no custom onPress is provided.
 */
export function BackButton({ label, onPress, style }: BackButtonProps) {
	const router = useRouter();
	const { theme } = useTheme();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label ?? "Go back"}
			onPress={onPress ?? (() => router.back())}
			hitSlop={12}
			style={({ pressed }) => [
				{
					flexDirection: "row",
					alignItems: "center",
					alignSelf: "flex-start",
					gap: 4,
					paddingVertical: theme.spacing.xs,
					opacity: pressed ? 0.6 : 1,
				},
				style,
			]}
		>
			<Text
				style={{
					fontSize: 22,
					color: theme.colors.text.secondary,
					lineHeight: 24,
				}}
			>
				‹
			</Text>
			{label ? (
				<Text
					style={[
						theme.typography.bodySm,
						{ color: theme.colors.text.secondary },
					]}
				>
					{label}
				</Text>
			) : null}
		</Pressable>
	);
}

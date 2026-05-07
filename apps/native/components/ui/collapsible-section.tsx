import { useState } from "react";
import {
	Text,
	TouchableOpacity,
	View,
	type StyleProp,
	type ViewStyle,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

interface CollapsibleSectionProps {
	title: string;
	subtitle?: string;
	aside?: React.ReactNode;
	children?: React.ReactNode;
	defaultOpen?: boolean;
	style?: StyleProp<ViewStyle>;
}

export function CollapsibleSection({
	title,
	subtitle,
	aside,
	children,
	defaultOpen = false,
	style,
}: CollapsibleSectionProps) {
	const { theme } = useTheme();
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const rotation = useSharedValue(defaultOpen ? 1 : 0);

	const toggleOpen = () => {
		setIsOpen((prev) => !prev);
		rotation.value = withTiming(isOpen ? 0 : 1, { duration: 200 });
	};

	const chevronStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value * 180}deg` }],
	}));

	return (
		<View style={[{ gap: theme.spacing.sm }, style]}>
			<TouchableOpacity
				onPress={toggleOpen}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${title}`}
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					paddingVertical: theme.spacing.xs,
					gap: theme.spacing.sm,
				}}
			>
				<View style={{ flex: 1, gap: 2 }}>
					<Text
						style={[
							theme.typography.labelMd,
							{ color: theme.colors.text.secondary },
						]}
					>
						{title}
					</Text>
					{subtitle ? (
						<Text
							style={[
								theme.typography.caption,
								{ color: theme.colors.text.muted },
							]}
						>
							{subtitle}
						</Text>
					) : null}
				</View>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: theme.spacing.xs,
					}}
				>
					{aside}
					<Animated.View style={chevronStyle}>
						<MaterialIcons
							name="expand-more"
							size={20}
							color={theme.colors.text.muted}
						/>
					</Animated.View>
				</View>
			</TouchableOpacity>
			{isOpen ? (
				<View style={{ gap: theme.spacing.md }}>{children}</View>
			) : null}
		</View>
	);
}

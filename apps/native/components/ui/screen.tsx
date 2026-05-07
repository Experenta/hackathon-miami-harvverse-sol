import {
	ScrollView,
	View,
	type ScrollViewProps,
	type StyleProp,
	type ViewProps,
	type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

interface ScreenProps extends Omit<ViewProps, "style"> {
	children: React.ReactNode;
	scrollable?: boolean;
	style?: StyleProp<ViewStyle>;
	contentContainerStyle?: StyleProp<ViewStyle>;
	scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle" | "style">;
	edges?: Edge[];
}

export function Screen({
	children,
	scrollable = false,
	style,
	contentContainerStyle,
	scrollViewProps,
	edges = ["top", "left", "right"],
	...rest
}: ScreenProps) {
	const { theme } = useTheme();

	const baseStyle: ViewStyle = {
		flex: 1,
		backgroundColor: theme.colors.background.app,
	};

	const innerContentStyle: ViewStyle = {
		flexGrow: 1,
		paddingHorizontal: theme.spacing.xl,
		paddingTop: theme.spacing.lg,
		paddingBottom: theme.spacing["2xl"],
		gap: theme.spacing.lg,
	};

	return (
		<SafeAreaView edges={edges} style={[baseStyle, style]}>
			{scrollable ? (
				<ScrollView
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					style={{ flex: 1 }}
					contentContainerStyle={[innerContentStyle, contentContainerStyle]}
					{...scrollViewProps}
				>
					{children}
				</ScrollView>
			) : (
				<View style={[innerContentStyle, contentContainerStyle]} {...rest}>
					{children}
				</View>
			)}
		</SafeAreaView>
	);
}

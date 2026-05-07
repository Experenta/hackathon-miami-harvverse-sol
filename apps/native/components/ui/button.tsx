import {
	ActivityIndicator,
	Text,
	TouchableOpacity,
	type TouchableOpacityProps,
} from "react-native";
import { useTheme } from "@/theme";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "accent"
	| "danger"
	| "ghost";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
	title: string;
	variant?: ButtonVariant;
	loading?: boolean;
	disabled?: boolean;
	fullWidth?: boolean;
}

export function Button({
	title,
	variant = "primary",
	loading = false,
	disabled = false,
	fullWidth = true,
	...rest
}: ButtonProps) {
	const { theme } = useTheme();
	const isDisabled = disabled || loading;
	const actionVariant = isDisabled
		? theme.colors.action.disabled
		: variant === "danger"
			? theme.colors.action.critical
			: theme.colors.action[variant];
	const indicatorColor =
		variant === "ghost" && !isDisabled
			? theme.colors.action.ghost.foreground
			: actionVariant.foreground;

	return (
		<TouchableOpacity
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityState={{ disabled: isDisabled }}
			style={{
				alignSelf: fullWidth ? "stretch" : "flex-start",
				paddingVertical: theme.spacing.sm,
				paddingHorizontal: theme.spacing.lg,
				borderRadius: theme.radius.md,
				alignItems: "center",
				justifyContent: "center",
				minHeight: 48,
				backgroundColor: actionVariant.background,
				borderWidth: actionVariant.borderWidth,
				borderColor: actionVariant.borderColor,
				opacity: isDisabled ? 0.72 : 1,
			}}
			activeOpacity={0.85}
			disabled={isDisabled}
			{...rest}
		>
			{loading ? (
				<ActivityIndicator color={indicatorColor} size="small" />
			) : (
				<Text
					style={[
						theme.typography.button,
						{
							color: actionVariant.foreground,
							textAlign: "center",
						},
					]}
					numberOfLines={1}
				>
					{title}
				</Text>
			)}
		</TouchableOpacity>
	);
}

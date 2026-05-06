import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	type TouchableOpacityProps,
} from "react-native";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
	title: string;
	variant?: ButtonVariant;
	loading?: boolean;
	disabled?: boolean;
}

export function Button({
	title,
	variant = "primary",
	loading = false,
	disabled = false,
	...rest
}: ButtonProps) {
	const isDisabled = disabled || loading;

	return (
		<TouchableOpacity
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityState={{ disabled: isDisabled }}
			style={[
				styles.base,
				variantStyles[variant],
				isDisabled && styles.disabled,
			]}
			disabled={isDisabled}
			{...rest}
		>
			{loading ? (
				<ActivityIndicator
					color={variant === "ghost" ? "#16a34a" : "#ffffff"}
					size="small"
				/>
			) : (
				<Text
					style={[styles.text, variantTextStyles[variant]]}
					numberOfLines={1}
				>
					{title}
				</Text>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	base: {
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 48,
	},
	disabled: {
		opacity: 0.5,
	},
	text: {
		fontSize: 16,
		fontWeight: "600",
	},
});

const variantStyles = StyleSheet.create({
	primary: {
		backgroundColor: "#16a34a",
	},
	secondary: {
		backgroundColor: "#ffffff",
		borderWidth: 1,
		borderColor: "#d1d5db",
	},
	danger: {
		backgroundColor: "#dc2626",
	},
	ghost: {
		backgroundColor: "transparent",
	},
});

const variantTextStyles = StyleSheet.create({
	primary: {
		color: "#ffffff",
	},
	secondary: {
		color: "#374151",
	},
	danger: {
		color: "#ffffff",
	},
	ghost: {
		color: "#16a34a",
	},
});

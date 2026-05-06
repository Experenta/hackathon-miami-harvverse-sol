import { StyleSheet, View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
	variant?: "default" | "selected" | "muted";
	children: React.ReactNode;
}

export function Card({
	variant = "default",
	children,
	style,
	...rest
}: CardProps) {
	return (
		<View style={[styles.base, variantStyles[variant], style]} {...rest}>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	base: {
		backgroundColor: "#ffffff",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		padding: 16,
		gap: 8,
	},
});

const variantStyles = StyleSheet.create({
	default: {},
	selected: {
		borderColor: "#16a34a",
		backgroundColor: "#f0fdf4",
	},
	muted: {
		backgroundColor: "#f9fafb",
		borderColor: "#f3f4f6",
	},
});

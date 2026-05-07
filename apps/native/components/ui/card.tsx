import { View, type ViewProps } from "react-native";
import { useTheme } from "@/theme";

interface CardProps extends ViewProps {
	variant?:
		| "default"
		| "selected"
		| "muted"
		| "info"
		| "success"
		| "warning"
		| "accent";
	children: React.ReactNode;
}

export function Card({
	variant = "default",
	children,
	style,
	...rest
}: CardProps) {
	const { theme } = useTheme();
	const variantStyle =
		variant === "selected"
			? {
					backgroundColor: theme.colors.surface.ticket,
					borderColor: theme.colors.border.accent,
			  }
			: variant === "info"
				? {
						backgroundColor: theme.colors.feedback.info.background,
						borderColor: theme.colors.feedback.info.border,
				  }
				: variant === "warning"
					? {
							backgroundColor: theme.colors.feedback.warning.background,
							borderColor: theme.colors.feedback.warning.border,
					  }
				: variant === "success"
					? {
							backgroundColor: theme.colors.feedback.success.background,
							borderColor: theme.colors.feedback.success.border,
					  }
					: variant === "accent"
						? {
								backgroundColor: theme.colors.role.partner.background,
								borderColor: theme.colors.role.partner.border,
						  }
			: variant === "muted"
				? {
						backgroundColor: theme.colors.surface.subtle,
						borderColor: theme.colors.border.subtle,
				  }
				: {
						backgroundColor: theme.colors.surface.default,
						borderColor: theme.colors.border.default,
				  };

	return (
		<View
			style={[
				{
					backgroundColor: theme.colors.surface.default,
					borderRadius: theme.radius.md,
					borderWidth: theme.borderWidth.thin,
					padding: theme.spacing.md,
					gap: theme.spacing.xs,
					...theme.elevation.card,
				},
				variantStyle,
				style,
			]}
			{...rest}
		>
			{children}
		</View>
	);
}

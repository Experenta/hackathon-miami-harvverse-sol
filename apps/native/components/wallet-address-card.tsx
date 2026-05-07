import { MaterialIcons } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import { useCallback, useEffect, useState } from "react";
import { Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface WalletAddressCardProps {
	address: string;
	label?: string;
	style?: ViewStyle;
}

export function WalletAddressCard({
	address,
	label = "Wallet address",
	style,
}: WalletAddressCardProps) {
	const { theme } = useTheme();
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;

		const timeout = setTimeout(() => setCopied(false), 1600);
		return () => clearTimeout(timeout);
	}, [copied]);

	const copyAddress = useCallback(() => {
		Clipboard.setString(address);
		setCopied(true);
	}, [address]);

	const copyPalette = copied
		? theme.colors.feedback.success
		: {
				background: theme.colors.surface.subtle,
				border: theme.colors.border.default,
				foreground: theme.colors.text.secondary,
				accent: theme.colors.text.secondary,
			};

	return (
		<View
			style={[
				{
					backgroundColor: theme.colors.surface.default,
					borderColor: theme.colors.border.default,
					borderRadius: theme.radius.sm,
					borderWidth: theme.borderWidth.thin,
					gap: theme.spacing.xs + 2,
					padding: 14,
					...theme.elevation.card,
				},
				style,
			]}
		>
			<View
				style={{
					alignItems: "flex-start",
					flexDirection: "row",
					gap: theme.spacing.sm,
					justifyContent: "space-between",
				}}
			>
				<View style={{ flex: 1, gap: 2 }}>
					<Text
						style={[
							theme.typography.labelSm,
							{
								color: theme.colors.text.primary,
								textTransform: "uppercase",
							},
						]}
					>
						{label}
					</Text>
					<Text
						style={[
							theme.typography.caption,
							{ color: theme.colors.text.muted, lineHeight: 16 },
						]}
					>
						Use this public key for seeding
					</Text>
				</View>
				<TouchableOpacity
					accessibilityLabel={`Copy ${label}`}
					accessibilityRole="button"
					onPress={copyAddress}
					style={{
						alignItems: "center",
						backgroundColor: copyPalette.background,
						borderColor: copyPalette.border,
						borderRadius: theme.radius.sm,
						borderWidth: theme.borderWidth.thin,
						flexDirection: "row",
						gap: 6,
						minHeight: 34,
						paddingHorizontal: theme.spacing.xs + 2,
					}}
				>
					<MaterialIcons
						color={copyPalette.accent}
						name={copied ? "check" : "content-copy"}
						size={17}
					/>
					<Text
						style={[
							theme.typography.labelMd,
							{ color: copyPalette.foreground },
						]}
					>
						{copied ? "Copied" : "Copy"}
					</Text>
				</TouchableOpacity>
			</View>

			<View
				style={{
					backgroundColor: theme.colors.surface.subtle,
					borderColor: theme.colors.border.default,
					borderRadius: theme.radius.sm,
					borderWidth: theme.borderWidth.thin,
					paddingHorizontal: theme.spacing.xs + 2,
					paddingVertical: theme.spacing.xs + 1,
				}}
			>
				<Text
					selectable
					style={[
						theme.typography.mono,
						{
							color: theme.colors.text.primary,
							flexShrink: 1,
							width: "100%",
						},
					]}
				>
					{address}
				</Text>
			</View>
		</View>
	);
}

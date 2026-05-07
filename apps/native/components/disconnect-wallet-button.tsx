import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	TouchableOpacity,
	type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useWalletConnection } from "@/features/wallet/use-wallet-connection";
import { useTheme } from "@/theme";

interface DisconnectWalletButtonProps {
	style?: ViewStyle;
}

export function DisconnectWalletButton({ style }: DisconnectWalletButtonProps) {
	const { theme } = useTheme();
	const router = useRouter();
	const { account, disconnect } = useWalletConnection();
	const [isDisconnecting, setIsDisconnecting] = useState(false);

	const handleDisconnect = useCallback(async () => {
		if (isDisconnecting) return;

		setIsDisconnecting(true);
		try {
			await disconnect();
			router.replace("/connect-wallet" as Href);
		} catch (error) {
			console.error("Failed to disconnect wallet", error);
			setIsDisconnecting(false);
		}
	}, [disconnect, isDisconnecting, router]);

	if (!account) {
		return null;
	}

	return (
		<TouchableOpacity
			accessibilityLabel="Disconnect wallet"
			accessibilityRole="button"
			disabled={isDisconnecting}
			onPress={handleDisconnect}
			style={[
				{
					alignItems: "center",
					justifyContent: "center",
					width: 36,
					height: 36,
					borderRadius: 18,
					backgroundColor: theme.colors.surface.subtle,
					opacity: isDisconnecting ? 0.7 : 1,
				},
				style,
			]}
		>
			{isDisconnecting ? (
				<ActivityIndicator
					color={theme.colors.text.muted}
					size="small"
				/>
			) : (
				<MaterialIcons
					name="logout"
					size={18}
					color={theme.colors.text.muted}
				/>
			)}
		</TouchableOpacity>
	);
}

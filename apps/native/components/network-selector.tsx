import { Text, TouchableOpacity, View } from "react-native";
import type { SolanaCluster } from "@wallet-ui/react-native-kit";
import { useNetwork } from "@/features/network/use-network";
import { useTheme } from "@/theme";

export function NetworkSelector() {
	const { theme } = useTheme();
	const { networks, selectedNetwork, setSelectedNetwork } = useNetwork();

	return (
		<View style={{ alignSelf: "stretch", gap: theme.spacing.xs }}>
			<Text
				style={[
					theme.typography.labelMd,
					{ color: theme.colors.text.secondary },
				]}
			>
				Network
			</Text>
			<View
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					gap: theme.spacing.xs,
				}}
			>
				{networks.map((network) => {
					const isSelected = network.id === selectedNetwork.id;
					return (
						<TouchableOpacity
							key={`${network.id}:${network.url}`}
							accessibilityRole="button"
							accessibilityState={{ selected: isSelected }}
							disabled={isSelected}
							onPress={() => setSelectedNetwork(network)}
							style={{
								borderColor: isSelected
									? theme.colors.action.secondary.borderColor
									: theme.colors.border.default,
								backgroundColor: isSelected
									? theme.colors.surface.raised
									: theme.colors.surface.default,
								borderRadius: theme.radius.sm,
								borderWidth: isSelected
									? theme.borderWidth.strong
									: theme.borderWidth.thin,
								paddingHorizontal: theme.spacing.sm,
								paddingVertical: 9,
							}}
						>
							<Text
								style={[
									theme.typography.labelMd,
									{
										color: isSelected
											? theme.colors.text.primary
											: theme.colors.text.secondary,
									},
								]}
							>
								{network.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
			<Text
				style={[
					theme.typography.caption,
					{ color: theme.colors.text.muted },
				]}
			>
				{formatEndpoint(selectedNetwork)}
			</Text>
		</View>
	);
}

function formatEndpoint(network: SolanaCluster) {
	return network.url.replace(/^https?:\/\//, "");
}

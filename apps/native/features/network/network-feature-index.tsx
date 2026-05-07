import React from "react";
import { View } from "react-native";
import { NetworkFeatureGetVersion } from "./network-feature-get-version";
import { NetworkFeatureGetGenesisHash } from "./network-feature-get-genesis-hash";
import { NetworkUiSelect } from "./network-ui-select";
import { useNetwork } from "./use-network";
import { Card, DetailRow, Section, StatusPill } from "@/components/ui";
import { useTheme } from "@/theme";

export function NetworkFeatureIndex() {
	const { selectedNetwork, networks, setSelectedNetwork } = useNetwork();
	const { theme } = useTheme();

	return (
		<View style={{ gap: theme.spacing.lg }}>
			<Section
				title="Network"
				description="Cluster selection and RPC diagnostics stay available here."
				aside={<StatusPill label={selectedNetwork.label} tone="accent" />}
			>
				<Card variant="info">
					<DetailRow
						label="Current cluster"
						value={selectedNetwork.label}
						valueTone="secondary"
					/>
				</Card>
			</Section>
			<NetworkUiSelect
				networks={networks}
				selectedNetwork={selectedNetwork}
				setSelectedNetwork={setSelectedNetwork}
			/>
			<Card variant="muted">
				<NetworkFeatureGetVersion />
				<NetworkFeatureGetGenesisHash />
			</Card>
		</View>
	);
}

import React from "react";
import { View } from "react-native";
import { SolanaCluster } from "@wallet-ui/react-native-kit";
import { Button, Card, DetailRow } from "@/components/ui";
import { useTheme } from "@/theme";

export function NetworkUiSelect({
  networks,
  selectedNetwork,
  setSelectedNetwork,
}: {
  networks: SolanaCluster[];
  selectedNetwork: SolanaCluster;
  setSelectedNetwork: (network: SolanaCluster) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {networks
        .filter((i) => i.id !== selectedNetwork.id)
        .map((network) => (
          <Card key={network.id} variant="muted">
            <DetailRow
              label="Target cluster"
              value={network.label}
              valueTone="secondary"
            />
            <Button
              disabled={selectedNetwork.id === network.id}
              onPress={() => setSelectedNetwork(network)}
              title={`Switch to ${network.label}`}
              variant="secondary"
            />
          </Card>
        ))}
    </View>
  );
}

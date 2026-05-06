import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { SolanaCluster } from "@wallet-ui/react-native-kit";
import { useNetwork } from "@/features/network/use-network";

export function NetworkSelector() {
  const { networks, selectedNetwork, setSelectedNetwork } = useNetwork();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Network</Text>
      <View style={styles.options}>
        {networks.map((network) => {
          const isSelected = network.id === selectedNetwork.id;
          return (
            <TouchableOpacity
              key={`${network.id}:${network.url}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              disabled={isSelected}
              onPress={() => setSelectedNetwork(network)}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {network.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.endpoint} numberOfLines={1}>
        {formatEndpoint(selectedNetwork)}
      </Text>
    </View>
  );
}

function formatEndpoint(network: SolanaCluster) {
  return network.url.replace(/^https?:\/\//, "");
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    gap: 8,
  },
  label: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    borderColor: "#d1d5db",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  optionLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  optionLabelSelected: {
    color: "#ffffff",
  },
  endpoint: {
    color: "#6b7280",
    fontSize: 12,
  },
});

import { Text } from "react-native";
import { ellipsify } from "@/utils/ellipsify";
import { useNetworkGetGenesisHash } from "./use-network-get-genesis-hash";
import { useTheme } from "@/theme";

export function NetworkFeatureGetGenesisHash() {
  const { data, isLoading } = useNetworkGetGenesisHash();
  const { theme } = useTheme();

  return (
    <Text
      style={[theme.typography.bodySm, { color: theme.colors.text.secondary }]}
    >
      Genesis Hash: {isLoading ? "Loading..." : `${ellipsify(data, 8)}`}
    </Text>
  );
}

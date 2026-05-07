import { Text } from "react-native";
import { useNetworkGetVersion } from "./use-network-get-version";
import { useTheme } from "@/theme";

export function NetworkFeatureGetVersion() {
  const { data, isLoading } = useNetworkGetVersion();
  const { theme } = useTheme();

  return (
    <Text
      style={[theme.typography.bodySm, { color: theme.colors.text.secondary }]}
    >
      Version: {isLoading ? "Loading..." : `${data?.core} (${data?.features})`}
    </Text>
  );
}

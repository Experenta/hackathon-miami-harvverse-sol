import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { useWalletConnection } from "@/features/wallet/use-wallet-connection";

interface DisconnectWalletButtonProps {
  style?: ViewStyle;
}

export function DisconnectWalletButton({ style }: DisconnectWalletButtonProps) {
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
      style={[styles.button, isDisconnecting && styles.buttonDisabled, style]}
    >
      {isDisconnecting ? (
        <ActivityIndicator color="#374151" size="small" />
      ) : (
        <Text style={styles.buttonText}>Disconnect wallet</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: "#d1d5db",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
});

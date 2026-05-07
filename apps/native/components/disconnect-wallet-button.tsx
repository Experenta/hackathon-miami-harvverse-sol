import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
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
          backgroundColor: theme.colors.action.secondary.background,
          borderColor: theme.colors.action.secondary.borderColor,
          borderRadius: theme.radius.sm,
          borderWidth: theme.colors.action.secondary.borderWidth,
          paddingHorizontal: theme.spacing.sm + 2,
          paddingVertical: theme.spacing.xs + 3,
          opacity: isDisconnecting ? 0.7 : 1,
        },
        style,
      ]}
    >
      {isDisconnecting ? (
        <ActivityIndicator
          color={theme.colors.action.secondary.foreground}
          size="small"
        />
      ) : (
        <Text
          style={[
            theme.typography.labelMd,
            { color: theme.colors.action.secondary.foreground },
          ]}
        >
          Disconnect wallet
        </Text>
      )}
    </TouchableOpacity>
  );
}

import { useEffect } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { NetworkSelector } from "@/components/network-selector";
import {
  ActionBar,
  Badge,
  Banner,
  Button,
  DetailRow,
  Screen,
  ScreenHeader,
  Section,
} from "@/components/ui";
import { useWalletConnection } from "@/features/wallet/use-wallet-connection";
import { useTheme } from "@/theme";

export default function ConnectWalletScreen() {
  const router = useRouter();
  const { account, connect, connectAndUpsert } = useWalletConnection();
  const { theme } = useTheme();

  useEffect(() => {
    if (account) {
      connectAndUpsert(account.address.toString()).catch(console.error);
      router.replace("/");
    }
  }, [account, connectAndUpsert, router]);

  return (
    <Screen contentContainerStyle={{ justifyContent: "center" }}>
      <ScreenHeader
        eyebrow="Harvverse"
        title="Enter the network"
        subtitle="Connect a Mobile Wallet Adapter compatible Solana wallet to continue into the Android app."
        trailing={<Badge label="Android only" tone="brand" />}
      />

      <Banner
        title="Wallet connection is the only gate here"
        description="After the wallet connects, the current flow still upserts the user and routes back to the root screen."
      />

      <Section
        title="Session"
        description="Choose the cluster for this device session before connecting."
      >
        <NetworkSelector />
        <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.xs }}>
          <DetailRow label="Adapter" value="Mobile Wallet Adapter" />
          <DetailRow label="Wallets" value="Phantom, Solflare" />
        </View>
      </Section>

      <ActionBar>
        <Button title="Connect Wallet" onPress={connect} />
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.text.muted, textAlign: "center" },
          ]}
        >
          Requires a compatible wallet app installed on Android.
        </Text>
      </ActionBar>
    </Screen>
  );
}

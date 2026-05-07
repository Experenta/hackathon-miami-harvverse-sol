import { useEffect } from "react";
import { Text } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { LoadingScreen } from "@/components/loading-screen";
import {
  ActionBar,
  Banner,
  Button,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { useRole } from "@/features/role/use-role";
import { useTheme } from "@/theme";

/**
 * Root index screen acts as a router:
 *
 * 1. No wallet connected -> redirect to /connect-wallet
 * 2. Wallet connected, fetching role -> show loading screen
 * 3. Role fetch failed -> show error with retry
 * 4. No role PDA -> redirect to /role-select
 * 5. Farmer role -> redirect to /(farmer)/home
 * 6. Partner role -> redirect to /(partner)/home
 */
export default function IndexScreen() {
  const router = useRouter();
  const { account } = useMobileWallet();
  const { role, isLoading, error, refetch } = useRole();
  const { theme } = useTheme();

  useEffect(() => {
    if (!account) {
      router.replace("/connect-wallet" as Href);
      return;
    }

    if (isLoading) return;
    if (error) return;

    if (role === null) {
      router.replace("/role-select" as Href);
      return;
    }

    if (role === "farmer") {
      router.replace("/(farmer)/home" as Href);
    } else {
      router.replace("/(partner)/home" as Href);
    }
  }, [account, isLoading, error, role, router]);

  if (!account) {
    return null;
  }

  if (isLoading) {
    return <LoadingScreen message="Checking your on-chain role..." />;
  }

  if (error) {
    return (
      <Screen contentContainerStyle={{ justifyContent: "center" }}>
        <ScreenHeader
          eyebrow="Harvverse"
          title="We couldn't resolve your role"
          subtitle="The wallet is connected, but the role lookup failed before routing could complete."
        />
        <Banner
          tone="error"
          title="RPC lookup failed"
          description={error.message}
        />
        <ActionBar>
          <Button title="Retry role check" onPress={refetch} />
          <Text
            style={[
              theme.typography.caption,
              {
                color: theme.colors.text.muted,
                textAlign: "center",
              },
            ]}
          >
            Navigation remains unchanged. This screen only retries the current
            lookup.
          </Text>
        </ActionBar>
      </Screen>
    );
  }

  return <LoadingScreen />;
}

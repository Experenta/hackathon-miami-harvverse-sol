import { useEffect } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWalletConnection } from "@/features/wallet/use-wallet-connection";
import { NetworkSelector } from "@/components/network-selector";

export default function ConnectWalletScreen() {
  const router = useRouter();
  const { account, connect, connectAndUpsert } = useWalletConnection();

  // Once the wallet connects, upsert the user record and navigate to index
  // which will handle role-based routing.
  useEffect(() => {
    if (account) {
      connectAndUpsert(account.address.toString()).catch(console.error);
      router.replace("/");
    }
  }, [account, connectAndUpsert, router]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Harvverse</Text>
        <Text style={styles.subtitle}>
          Connect your Solana wallet to get started
        </Text>

        <NetworkSelector />

        <TouchableOpacity style={styles.button} onPress={connect}>
          <Text style={styles.buttonText}>Connect Wallet</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Requires a Mobile Wallet Adapter compatible wallet (e.g. Phantom,
          Solflare)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
});

import { Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { ellipsify } from "@/utils/ellipsify";
import { useRole } from "@/features/role/use-role";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import { WalletAddressCard } from "@/components/wallet-address-card";

export default function PartnerHomeScreen() {
  const { account } = useMobileWallet();
  const { rolePda } = useRole();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Partner Dashboard</Text>
        <DisconnectWalletButton />
        {account && <WalletAddressCard address={account.address.toString()} />}
        {rolePda && (
          <View style={styles.card}>
            <Text style={styles.label}>Role PDA</Text>
            <Text style={styles.value}>{ellipsify(rolePda)}</Text>
          </View>
        )}
        <Text style={styles.placeholder}>Lot catalog coming in task 11…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
  value: { fontSize: 14, fontWeight: "500", color: "#111827" },
  placeholder: { fontSize: 14, color: "#9ca3af", marginTop: 8 },
});

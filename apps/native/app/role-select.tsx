import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMutation } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { buildRegisterRoleTx, RoleKind } from "@repo/solana-client";
import { useTransaction } from "@/hooks/use-transaction";
import { useRole } from "@/features/role/use-role";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import { WalletAddressCard } from "@/components/wallet-address-card";

type RoleOption = "farmer" | "partner";

const ROLE_OPTIONS: {
  value: RoleOption;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: "farmer",
    label: "Farmer",
    description:
      "Create and publish coffee lots, track agronomic plans, and connect with investment partners.",
    emoji: "🌱",
  },
  {
    value: "partner",
    label: "Partner",
    description:
      "Browse verified coffee lots, reserve partnerships, and view settlement receipts on-chain.",
    emoji: "🤝",
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const { account } = useMobileWallet();
  const { signAndSendWithSigner, isPending, error, reset } = useTransaction();
  const { refetch } = useRole();
  const recordRoleRegistration = useMutation(api.users.recordRoleRegistration);

  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  async function handleRegister() {
    if (!selectedRole || !account) return;

    reset();
    setTxSignature(null);

    try {
      const roleKind =
        selectedRole === "farmer" ? RoleKind.Farmer : RoleKind.Partner;

      let rolePda = `role-pda-${account.address}`;
      const { signature } = await signAndSendWithSigner(
        async (walletSigner) => {
          const instruction = await buildRegisterRoleTx({
            wallet: walletSigner,
            role: roleKind,
          });
          rolePda = instruction.accounts?.[1]?.address?.toString() ?? rolePda;

          return [instruction];
        },
      );
      setTxSignature(signature);

      await recordRoleRegistration({
        wallet: account.address.toString(),
        role: selectedRole,
        rolePda,
        roleTx: signature,
      });

      // Refetch role and navigate
      await refetch();
      router.replace(
        (selectedRole === "farmer"
          ? "/(farmer)/home"
          : "/(partner)/home") as Href,
      );
    } catch {
      // error is already set in useTransaction
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <Text style={styles.title}>Choose your role</Text>
        <Text style={styles.subtitle}>
          Your role is registered on-chain and cannot be changed.
        </Text>

        {account && (
          <WalletAddressCard
            address={account.address.toString()}
            label="Connected wallet address"
          />
        )}

        <DisconnectWalletButton />

        <View style={styles.options}>
          {ROLE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                selectedRole === option.value && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedRole(option.value)}
              disabled={isPending}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {txSignature && (
          <View style={styles.pendingBox}>
            <ActivityIndicator size="small" color="#16a34a" />
            <Text style={styles.pendingText} numberOfLines={1}>
              Confirming… {txSignature.slice(0, 16)}…
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.registerButton,
            (!selectedRole || isPending) && styles.registerButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={!selectedRole || isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.registerButtonText}>
              Sign and register role
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  options: {
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  optionCardSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  optionDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  pendingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 12,
  },
  pendingText: {
    fontSize: 13,
    color: "#15803d",
    flex: 1,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
  },
  registerButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  registerButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});

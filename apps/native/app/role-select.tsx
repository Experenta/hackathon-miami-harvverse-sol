import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMutation } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { buildRegisterRoleTx, RoleKind } from "@repo/solana-client";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import { WalletAddressCard } from "@/components/wallet-address-card";
import {
  ActionBar,
  Badge,
  Banner,
  Button,
  ListItemCard,
  Screen,
  ScreenHeader,
  Section,
} from "@/components/ui";
import { useRole } from "@/features/role/use-role";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";

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
    emoji: "\uD83C\uDF31",
  },
  {
    value: "partner",
    label: "Partner",
    description:
      "Browse verified coffee lots, reserve partnerships, and view settlement receipts on-chain.",
    emoji: "\uD83E\uDD1D",
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const { account } = useMobileWallet();
  const { signAndSendWithSigner, isPending, error, reset } = useTransaction();
  const { refetch } = useRole();
  const recordRoleRegistration = useMutation(api.users.recordRoleRegistration);
  const { theme } = useTheme();

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
    <Screen scrollable>
      <ScreenHeader
        eyebrow="On-chain identity"
        title="Choose your role"
        subtitle="Your role is written on-chain and the current flow treats it as permanent."
        trailing={<Badge label="Root screen" tone="info" />}
      />

      <Banner
        title="One registration, one route"
        description="This step preserves the existing Solana transaction and role-routing logic. Only the visual layer changed."
      />

      {account ? (
        <Section
          title="Connected wallet"
          description="Review the active address before you sign the role registration transaction."
          aside={<DisconnectWalletButton />}
        >
          <WalletAddressCard
            address={account.address.toString()}
            label="Connected wallet address"
          />
        </Section>
      ) : null}

      <Section
        title="Available roles"
        description="Pick the role that matches how this wallet should participate in Harvverse."
      >
        <View style={{ gap: theme.spacing.sm }}>
          {ROLE_OPTIONS.map((option) => {
            const isSelected = selectedRole === option.value;
            const tone = option.value === "farmer" ? "farmer" : "partner";

            return (
              <ListItemCard
                key={option.value}
                onPress={() => setSelectedRole(option.value)}
                disabled={isPending}
                accessibilityState={{
                  disabled: isPending,
                  selected: isSelected,
                }}
                tone={tone}
                eyebrow={option.value}
                title={`${option.emoji} ${option.label}`}
                subtitle={option.description}
                status={{
                  label: isSelected ? "Selected" : "Available",
                  tone,
                }}
                highlight={{
                  label: "Role behavior",
                  value:
                    option.value === "farmer"
                      ? "Origin + publish"
                      : "Source + reserve",
                }}
                badges={[
                  {
                    label: isSelected ? "Current choice" : "Tap to select",
                    tone: isSelected ? "success" : "neutral",
                  },
                ]}
                contentStyle={{
                  borderColor: isSelected
                    ? theme.colors.border.accent
                    : undefined,
                  borderWidth: isSelected
                    ? theme.borderWidth.strong
                    : undefined,
                }}
              />
            );
          })}
        </View>
      </Section>

      {txSignature ? (
        <Banner
          tone="success"
          title="Transaction in flight"
          accessory={
            <ActivityIndicator
              size="small"
              color={theme.colors.feedback.success.accent}
            />
          }
          description={`Confirming ${txSignature.slice(0, 16)}...`}
        />
      ) : null}

      {error ? (
        <Banner
          tone="error"
          title="Role registration failed"
          description={error.message}
        />
      ) : null}

      <ActionBar>
        <Button
          title="Sign and register role"
          onPress={handleRegister}
          disabled={!selectedRole || isPending}
          loading={isPending}
        />
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.text.muted, textAlign: "center" },
          ]}
        >
          Navigation and role logic are unchanged. This action still signs the
          same transaction path.
        </Text>
      </ActionBar>
    </Screen>
  );
}

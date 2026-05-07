import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import {
  buildCreateFarmerProfileTx,
  computeManifestHash,
  computeManifestHashHex,
  findFarmerProfilePda,
} from "@repo/solana-client";
import {
  ActionBar,
  Badge,
  Banner,
  Button,
  Card,
  DetailRow,
  FormField,
  ListItemCard,
  MetricCard,
  Screen,
  ScreenHeader,
  Section,
  StatusPill,
} from "@/components/ui";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function FarmerProfileScreen() {
  const { account } = useMobileWallet();
  const { theme } = useTheme();
  const wallet = account?.address?.toString() ?? "";
  const { signAndSendWithSigner, isPending, error: txError } = useTransaction();
  const upsertProfile = useMutation(api.farmerProfiles.upsert);
  const existingProfile = useQuery(
    api.farmerProfiles.getByWallet,
    wallet ? { wallet } : "skip",
  );

  const [displayName, setDisplayName] = useState(
    existingProfile?.displayName ?? "",
  );
  const [bio, setBio] = useState(existingProfile?.bio ?? "");
  const [country, setCountry] = useState(existingProfile?.country ?? "");
  const [region, setRegion] = useState(existingProfile?.region ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  useEffect(() => {
    if (existingProfile) {
      setDisplayName(existingProfile.displayName);
      setBio(existingProfile.bio ?? "");
      setCountry(existingProfile.country ?? "");
      setRegion(existingProfile.region ?? "");
    }
  }, [existingProfile]);

  const handleSubmit = useCallback(async () => {
    if (!wallet || !displayName.trim()) {
      Alert.alert("Error", "Display name is required.");
      return;
    }

    setIsSubmitting(true);
    setSuccessTx(null);

    try {
      const profilePayload = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        country: country.trim(),
        region: region.trim(),
        wallet,
      };

      const metadataHashHex = await computeManifestHashHex(
        profilePayload as Record<string, unknown>,
      );
      const displayNameHash = await computeManifestHash({
        displayName: displayName.trim(),
      } as Record<string, unknown>);
      const metadataUriHash = await computeManifestHash(
        profilePayload as Record<string, unknown>,
      );
      const [farmerProfilePda] = await findFarmerProfilePda({
        farmer: wallet as Address,
      });

      const result = await signAndSendWithSigner(async (signer) => {
        const ix = await buildCreateFarmerProfileTx({
          farmer: signer,
          displayNameHash,
          metadataUriHash,
        });
        return [ix];
      });

      await upsertProfile({
        wallet,
        farmerProfilePda: farmerProfilePda.toString(),
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        country: country.trim() || undefined,
        region: region.trim() || undefined,
        metadataHash: metadataHashHex,
      });

      setSuccessTx(result.signature);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Profile creation failed";
      Alert.alert("Transaction Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    wallet,
    displayName,
    bio,
    country,
    region,
    signAndSendWithSigner,
    upsertProfile,
  ]);

  const busy = isPending || isSubmitting;
  const profileLive = Boolean(existingProfile?.farmerProfilePda);
  const identityTitle =
    displayName.trim() || existingProfile?.displayName || "Farmer identity";

  return (
    <Screen scrollable>
      <ScreenHeader
        eyebrow="Farmer identity"
        title="Profile and verification"
        subtitle="Present a verified grower identity that partners can inspect before reserving an agricultural asset."
        trailing={<Badge label="Android native" tone="brand" />}
      />

      <Section
        description="This migration preserves the existing on-chain profile flow and Convex upsert."
        aside={
          <StatusPill
            label={profileLive ? "Identity live" : "Setup pending"}
            tone={profileLive ? "success" : "farmer"}
          />
        }
      >
        <ListItemCard
          disabled
          tone="farmer"
          eyebrow="Verification record"
          title={identityTitle}
          subtitle={
            bio.trim() ||
            "Your public grower identity for partner due diligence."
          }
          status={{
            label: profileLive ? "On-chain profile" : "Draft identity",
            tone: profileLive ? "success" : "farmer",
          }}
          highlight={{
            label: "Wallet",
            value: wallet ? ellipsify(wallet) : "Connect wallet",
          }}
          badges={[
            { label: country.trim() || "Country pending", tone: "brand" },
            { label: region.trim() || "Region pending", tone: "neutral" },
          ]}
          details={[
            {
              label: "Profile PDA",
              value: existingProfile?.farmerProfilePda
                ? ellipsify(existingProfile.farmerProfilePda)
                : "Pending creation",
            },
            {
              label: "Role",
              value: "Farmer",
            },
          ]}
        />
      </Section>

      <Section
        title="Verification posture"
        description="Identity should read like a verified participant, not a flat data form."
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
          }}
        >
          <MetricCard
            tone="farmer"
            eyebrow="Identity"
            label="Display name"
            value={displayName.trim() || "Pending"}
            helper="Primary public label"
            style={{ minWidth: 160 }}
          />
          <MetricCard
            tone="success"
            eyebrow="Verification"
            label="Profile state"
            value={profileLive ? "Live" : "Not issued"}
            helper="Requires signature to update"
            style={{ minWidth: 160 }}
          />
        </View>
        {profileLive ? (
          <Banner
            tone="success"
            eyebrow="On-chain proof"
            title="Farmer identity is already anchored"
            description="Updating the profile will sign a new transaction while preserving the same navigation and submission flow."
          />
        ) : (
          <Banner
            tone="info"
            eyebrow="First issuance"
            title="Create the first verified farmer profile"
            description="This will derive the FarmerProfile PDA, sign the instruction, and persist the mirrored profile metadata."
          />
        )}
      </Section>

      <Section
        title="Identity fields"
        description="The fields below keep the exact same payload and validation rules."
        aside={<Badge label="Metadata payload" tone="info" />}
      >
        <Card variant="accent" style={{ gap: theme.spacing.md }}>
          <FormField
            label="Display Name"
            required
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your farm or name"
            disabled={busy}
          />
          <FormField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell partners about your farm"
            multiline
            numberOfLines={4}
            disabled={busy}
          />
          <FormField
            label="Country"
            value={country}
            onChangeText={setCountry}
            placeholder="e.g. Honduras"
            disabled={busy}
          />
          <FormField
            label="Region"
            value={region}
            onChangeText={setRegion}
            placeholder="e.g. Comayagua"
            disabled={busy}
          />
        </Card>
      </Section>

      <Section
        title="Reference details"
        description="Critical identifiers remain visible as supporting proof."
      >
        <Card variant="muted">
          <DetailRow
            label="Wallet"
            value={wallet ? ellipsify(wallet) : "Not connected"}
            mono
            valueTone="secondary"
          />
          <DetailRow
            label="Profile PDA"
            value={
              existingProfile?.farmerProfilePda
                ? ellipsify(existingProfile.farmerProfilePda)
                : "Pending creation"
            }
            mono
            valueTone="secondary"
          />
          <DetailRow
            label="Metadata status"
            value={profileLive ? "Stored in Convex" : "Awaiting first write"}
            valueTone="secondary"
          />
        </Card>
      </Section>

      {txError ? (
        <Banner
          tone="error"
          title="Profile transaction failed"
          description={txError.message}
        />
      ) : null}

      {successTx ? (
        <Banner
          tone="success"
          title="Profile recorded on-chain"
          description={`Transaction ${ellipsify(successTx)}`}
          eyebrow="Verification complete"
        />
      ) : null}

      <ActionBar>
        <Button
          title={
            existingProfile
              ? "Update profile on-chain"
              : "Sign and create profile"
          }
          onPress={handleSubmit}
          disabled={busy || !displayName.trim()}
          loading={busy}
        />
      </ActionBar>
    </Screen>
  );
}

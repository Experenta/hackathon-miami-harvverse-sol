import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import {
	buildCreatePartnerProfileTx,
	computeManifestHash,
	computeManifestHashHex,
	fetchPartnerProfileByWallet,
	findPartnerProfilePda,
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
import { useNetwork } from "@/features/network/use-network";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

function isAlreadyInUseError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("allocate account already in use") ||
		normalized.includes("already in use")
	);
}

export default function PartnerProfileScreen() {
	const { account, client } = useMobileWallet();
	const { selectedNetwork } = useNetwork();
	const { theme } = useTheme();
	const wallet = account?.address?.toString() ?? "";
	const {
		signAndSendWithSigner,
		isPending,
		error: txError,
	} = useTransaction();
	const upsertProfile = useMutation(api.partnerProfiles.upsert);
	const existingProfile = useQuery(
		api.partnerProfiles.getByWallet,
		wallet ? { wallet } : "skip",
	);

	const [displayName, setDisplayName] = useState(
		existingProfile?.displayName ?? "",
	);
	const [organization, setOrganization] = useState(
		existingProfile?.organization ?? "",
	);
	const [onChainProfilePda, setOnChainProfilePda] = useState<string | null>(
		null,
	);
	const [profileNotice, setProfileNotice] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successTx, setSuccessTx] = useState<string | null>(null);

	useEffect(() => {
		if (existingProfile) {
			setDisplayName(existingProfile.displayName);
			setOrganization(existingProfile.organization ?? "");
		}
	}, [existingProfile]);

	useEffect(() => {
		if (!wallet) {
			setOnChainProfilePda(null);
			return;
		}

		let isActive = true;

		fetchPartnerProfileByWallet(client.rpc, wallet as Address)
			.then((profile) => {
				if (!isActive) return;
				setOnChainProfilePda(profile?.address.toString() ?? null);
			})
			.catch((err) => {
				if (!isActive) return;
				console.error("Failed to fetch partner profile:", err);
				setOnChainProfilePda(null);
			});

		return () => {
			isActive = false;
		};
	}, [client.rpc, wallet, selectedNetwork.id]);

	const handleSubmit = useCallback(async () => {
		if (!wallet || !displayName.trim()) {
			Alert.alert("Error", "Display name is required.");
			return;
		}

		setIsSubmitting(true);
		setProfileNotice(null);
		setSuccessTx(null);

		try {
			const trimmedDisplayName = displayName.trim();
			const trimmedOrganization = organization.trim();
			const profilePayload = {
				displayName: trimmedDisplayName,
				organization: trimmedOrganization,
				wallet,
			};

			const metadataHashHex = await computeManifestHashHex(
				profilePayload as Record<string, unknown>,
			);
			const displayNameHash = await computeManifestHash({
				displayName: trimmedDisplayName,
			} as Record<string, unknown>);
			const metadataUriHash = await computeManifestHash(
				profilePayload as Record<string, unknown>,
			);
			const [partnerProfilePda] = await findPartnerProfilePda({
				partner: wallet as Address,
			});
			const partnerProfilePdaString = partnerProfilePda.toString();

			const syncExistingProfile = async (message: string) => {
				await upsertProfile({
					wallet,
					partnerProfilePda: partnerProfilePdaString,
					displayName: trimmedDisplayName,
					organization: trimmedOrganization || undefined,
					metadataHash: metadataHashHex,
				});

				setOnChainProfilePda(partnerProfilePdaString);
				setProfileNotice(message);
			};

			if (onChainProfilePda === partnerProfilePdaString) {
				await syncExistingProfile(
					"This wallet already has a partner profile. We refreshed the saved profile instead of sending a duplicate create transaction.",
				);
				return;
			}

			try {
				const result = await signAndSendWithSigner(async (signer) => {
					const ix = await buildCreatePartnerProfileTx({
						partner: signer,
						displayNameHash,
						metadataUriHash,
					});
					return [ix];
				});

				await upsertProfile({
					wallet,
					partnerProfilePda: partnerProfilePdaString,
					displayName: trimmedDisplayName,
					organization: trimmedOrganization || undefined,
					metadataHash: metadataHashHex,
				});

				setOnChainProfilePda(partnerProfilePdaString);
				setSuccessTx(result.signature);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Profile creation failed";
				if (!isAlreadyInUseError(message)) {
					throw err;
				}

				await syncExistingProfile(
					"This wallet already had a partner profile on-chain. We reused it and refreshed the saved profile details.",
				);
			}
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
		organization,
		onChainProfilePda,
		signAndSendWithSigner,
		upsertProfile,
	]);

	const busy = isPending || isSubmitting;
	const profilePda = existingProfile?.partnerProfilePda ?? onChainProfilePda;
	const profileLive = Boolean(profilePda);
	const identityTitle =
		displayName.trim() || existingProfile?.displayName || "Partner identity";

	return (
		<Screen scrollable>
			<ScreenHeader
				eyebrow="Partner identity"
				title="Profile and verification"
				subtitle="Establish a verifiable investor identity so farmers can review the counterparty behind an active yield agreement."
				trailing={<Badge label="Android native" tone="partner" />}
			/>

			<Section
				description="The profile transaction, PDA derivation, and Convex mirror stay unchanged."
				aside={
					<StatusPill
						label={profileLive ? "Identity live" : "Setup pending"}
						tone={profileLive ? "success" : "partner"}
					/>
				}
			>
				<ListItemCard
					disabled
					tone="partner"
					eyebrow="Verification record"
					title={identityTitle}
					subtitle={
						organization.trim() ||
						"Counterparty identity used across reserve and settlement flows."
					}
					status={{
						label: profileLive ? "On-chain profile" : "Draft identity",
						tone: profileLive ? "success" : "partner",
					}}
					highlight={{
						label: "Wallet",
						value: wallet ? ellipsify(wallet) : "Connect wallet",
					}}
					badges={[
						{
							label: organization.trim() || "Organization pending",
							tone: "partner",
						},
						{ label: "Yield partner", tone: "info" },
					]}
					details={[
						{
							label: "Profile PDA",
							value: profilePda
								? ellipsify(profilePda)
								: "Pending creation",
						},
						{
							label: "Role",
							value: "Partner",
						},
					]}
				/>
			</Section>

			<Section
				title="Verification posture"
				description="The screen frames the partner as an active counterparty identity, not a flat form."
			>
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						gap: theme.spacing.sm,
					}}
				>
					<MetricCard
						tone="partner"
						eyebrow="Identity"
						label="Display name"
						value={displayName.trim() || "Pending"}
						helper="Primary public label"
						style={{ minWidth: 160 }}
					/>
					<MetricCard
						tone="info"
						eyebrow="Counterparty"
						label="Organization"
						value={organization.trim() || "Independent"}
						helper="Optional institutional context"
						style={{ minWidth: 160 }}
					/>
				</View>
				{profileLive ? (
					<Banner
						tone="success"
						eyebrow="On-chain proof"
						title="Partner identity is already anchored"
						description="If the PDA already exists, this screen refreshes the saved profile record and avoids a duplicate create transaction."
					/>
				) : (
					<Banner
						tone="accent"
						eyebrow="First issuance"
						title="Create the first verified partner profile"
						description="This will derive the PartnerProfile PDA, sign the instruction, and persist the mirrored metadata record."
					/>
				)}
			</Section>

			<Section
				title="Identity fields"
				description="The payload and validation remain exactly the same."
				aside={<Badge label="Metadata payload" tone="info" />}
			>
				<Card variant="accent" style={{ gap: theme.spacing.md }}>
					<FormField
						label="Display Name"
						required
						value={displayName}
						onChangeText={setDisplayName}
						placeholder="Your name or alias"
						disabled={busy}
					/>
					<FormField
						label="Organization"
						value={organization}
						onChangeText={setOrganization}
						placeholder="e.g. Harvest Capital LLC"
						disabled={busy}
					/>
				</Card>
			</Section>

			<Section
				title="Reference details"
				description="Supporting identifiers stay visible for verification."
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
							profilePda
								? ellipsify(profilePda)
								: "Pending creation"
						}
						mono
						valueTone="secondary"
					/>
					<DetailRow
						label="Metadata status"
						value={
							existingProfile
								? "Stored in Convex"
								: profileLive
									? "On-chain profile found"
									: "Awaiting first write"
						}
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

			{profileNotice ? (
				<Banner
					tone="success"
					title="Profile already available"
					description={profileNotice}
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
						profileLive ? "Refresh saved profile" : "Sign and create profile"
					}
					variant="accent"
					onPress={handleSubmit}
					disabled={busy || !displayName.trim()}
					loading={busy}
				/>
			</ActionBar>
		</Screen>
	);
}

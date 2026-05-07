import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
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
	BackButton,
	Banner,
	Button,
	Card,
	DetailRow,
	FormField,
	Screen,
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
					"Profile already exists on-chain. Refreshed saved data.",
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
					err instanceof Error
						? err.message
						: "Profile creation failed";
				if (!isAlreadyInUseError(message)) {
					throw err;
				}

				await syncExistingProfile(
					"Profile already existed on-chain. Reused and refreshed.",
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

	return (
		<Screen scrollable>
			{/* Back */}
			<BackButton />

			{/* Status */}
			<Animated.View entering={FadeIn.duration(150)}>
				<StatusPill
					label={profileLive ? "Identity live" : "Setup pending"}
					tone={profileLive ? "success" : "partner"}
				/>
			</Animated.View>

			{/* Form */}
			<Animated.View entering={FadeInUp.delay(50).duration(200)}>
				<Section title="Identity">
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
			</Animated.View>

			{/* References */}
			<Animated.View entering={FadeInUp.delay(50).duration(200)}>
				<Section title="References">
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
								profilePda ? ellipsify(profilePda) : "Pending"
							}
							mono
							valueTone="secondary"
						/>
					</Card>
				</Section>
			</Animated.View>

			{/* Feedback */}
			{txError ? (
				<Banner
					tone="error"
					title="Transaction failed"
					description={txError.message}
				/>
			) : null}
			{profileNotice ? (
				<Banner
					tone="success"
					title="Profile synced"
					description={profileNotice}
				/>
			) : null}
			{successTx ? (
				<Banner
					tone="success"
					title="Profile recorded"
					description={`Tx ${ellipsify(successTx)}`}
				/>
			) : null}

			{/* Action */}
			<ActionBar>
				<Button
					title={profileLive ? "Refresh profile" : "Create profile"}
					variant="accent"
					onPress={handleSubmit}
					disabled={busy || !displayName.trim()}
					loading={busy}
				/>
			</ActionBar>
		</Screen>
	);
}

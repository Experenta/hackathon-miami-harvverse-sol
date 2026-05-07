import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
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
	Banner,
	Button,
	Card,
	DetailRow,
	FormField,
	Screen,
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
	const {
		signAndSendWithSigner,
		isPending,
		error: txError,
	} = useTransaction();
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

	return (
		<Screen scrollable>
			{/* Status */}
			<Animated.View entering={FadeIn.duration(150)}>
				<StatusPill
					label={profileLive ? "Identity live" : "Setup pending"}
					tone={profileLive ? "success" : "farmer"}
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
							placeholder="Your farm or name"
							disabled={busy}
						/>
						<FormField
							label="Bio"
							value={bio}
							onChangeText={setBio}
							placeholder="Tell partners about your farm"
							multiline
							numberOfLines={3}
							disabled={busy}
						/>
						<View
							style={{
								flexDirection: "row",
								gap: theme.spacing.sm,
							}}
						>
							<View style={{ flex: 1 }}>
								<FormField
									label="Country"
									value={country}
									onChangeText={setCountry}
									placeholder="Honduras"
									disabled={busy}
								/>
							</View>
							<View style={{ flex: 1 }}>
								<FormField
									label="Region"
									value={region}
									onChangeText={setRegion}
									placeholder="Comayagua"
									disabled={busy}
								/>
							</View>
						</View>
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
								existingProfile?.farmerProfilePda
									? ellipsify(
											existingProfile.farmerProfilePda,
										)
									: "Pending"
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
					title={
						existingProfile ? "Update profile" : "Create profile"
					}
					onPress={handleSubmit}
					disabled={busy || !displayName.trim()}
					loading={busy}
				/>
			</ActionBar>
		</Screen>
	);
}

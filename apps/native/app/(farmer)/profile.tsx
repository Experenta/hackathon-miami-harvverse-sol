import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import {
	buildCreateFarmerProfileTx,
	computeManifestHashHex,
	computeManifestHash,
	findFarmerProfilePda,
} from "@repo/solana-client";
import { useTransaction } from "@/hooks/use-transaction";
import { ellipsify } from "@/utils/ellipsify";

export default function FarmerProfileScreen() {
	const { account } = useMobileWallet();
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

	// Sync form with existing profile when it loads
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
			// Compute metadata hash from profile fields
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

			// Build and sign the on-chain transaction
			const result = await signAndSendWithSigner(async (signer) => {
				const ix = await buildCreateFarmerProfileTx({
					farmer: signer,
					displayNameHash,
					metadataUriHash,
				});
				return [ix];
			});

			// Save profile to Convex
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

	return (
		<SafeAreaView style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={styles.title}>Farmer Profile</Text>
				<Text style={styles.subtitle}>
					Create your on-chain profile so Partners can verify your
					identity.
				</Text>

				{existingProfile?.farmerProfilePda && (
					<View style={styles.infoCard}>
						<Text style={styles.label}>Profile PDA</Text>
						<Text style={styles.value}>
							{ellipsify(existingProfile.farmerProfilePda)}
						</Text>
					</View>
				)}

				<View style={styles.field}>
					<Text style={styles.fieldLabel}>Display Name *</Text>
					<TextInput
						style={styles.input}
						value={displayName}
						onChangeText={setDisplayName}
						placeholder="Your farm or name"
						placeholderTextColor="#9ca3af"
						editable={!busy}
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.fieldLabel}>Bio</Text>
					<TextInput
						style={[styles.input, styles.textArea]}
						value={bio}
						onChangeText={setBio}
						placeholder="Tell partners about your farm"
						placeholderTextColor="#9ca3af"
						multiline
						numberOfLines={3}
						editable={!busy}
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.fieldLabel}>Country</Text>
					<TextInput
						style={styles.input}
						value={country}
						onChangeText={setCountry}
						placeholder="e.g. Honduras"
						placeholderTextColor="#9ca3af"
						editable={!busy}
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.fieldLabel}>Region</Text>
					<TextInput
						style={styles.input}
						value={region}
						onChangeText={setRegion}
						placeholder="e.g. Comayagua"
						placeholderTextColor="#9ca3af"
						editable={!busy}
					/>
				</View>

				<TouchableOpacity
					accessibilityLabel="Sign and create profile"
					accessibilityRole="button"
					disabled={busy || !displayName.trim()}
					onPress={handleSubmit}
					style={[
						styles.submitButton,
						(busy || !displayName.trim()) &&
							styles.submitButtonDisabled,
					]}
				>
					{busy ? (
						<ActivityIndicator color="#ffffff" size="small" />
					) : (
						<Text style={styles.submitButtonText}>
							{existingProfile
								? "Update profile on-chain"
								: "Sign and create profile"}
						</Text>
					)}
				</TouchableOpacity>

				{txError && (
					<Text style={styles.errorText}>{txError.message}</Text>
				)}

				{successTx && (
					<View style={styles.successCard}>
						<Text style={styles.successTitle}>
							Profile created on-chain!
						</Text>
						<Text style={styles.successTx}>
							Tx: {ellipsify(successTx)}
						</Text>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	container: { padding: 16, gap: 14, paddingBottom: 40 },
	title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
	subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
	infoCard: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	label: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
	value: {
		fontSize: 13,
		fontWeight: "500",
		color: "#111827",
		fontFamily: "monospace",
	},
	field: { gap: 4 },
	fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
	input: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#d1d5db",
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		color: "#111827",
	},
	textArea: { minHeight: 72, textAlignVertical: "top" },
	submitButton: {
		backgroundColor: "#059669",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	submitButtonDisabled: { opacity: 0.6 },
	submitButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
	errorText: { color: "#dc2626", fontSize: 13, marginTop: 4 },
	successCard: {
		backgroundColor: "#ecfdf5",
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: "#a7f3d0",
		gap: 4,
	},
	successTitle: { fontSize: 14, fontWeight: "600", color: "#065f46" },
	successTx: { fontSize: 12, color: "#047857", fontFamily: "monospace" },
});

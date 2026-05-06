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
	buildCreatePartnerProfileTx,
	computeManifestHashHex,
	computeManifestHash,
	findPartnerProfilePda,
} from "@repo/solana-client";
import { useTransaction } from "@/hooks/use-transaction";
import { ellipsify } from "@/utils/ellipsify";

export default function PartnerProfileScreen() {
	const { account } = useMobileWallet();
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
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successTx, setSuccessTx] = useState<string | null>(null);

	// Sync form with existing profile when it loads
	useEffect(() => {
		if (existingProfile) {
			setDisplayName(existingProfile.displayName);
			setOrganization(existingProfile.organization ?? "");
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
				organization: organization.trim(),
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
			const [partnerProfilePda] = await findPartnerProfilePda({
				partner: wallet as Address,
			});

			// Build and sign the on-chain transaction
			const result = await signAndSendWithSigner(async (signer) => {
				const ix = await buildCreatePartnerProfileTx({
					partner: signer,
					displayNameHash,
					metadataUriHash,
				});
				return [ix];
			});

			// Save profile to Convex
			await upsertProfile({
				wallet,
				partnerProfilePda: partnerProfilePda.toString(),
				displayName: displayName.trim(),
				organization: organization.trim() || undefined,
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
		organization,
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
				<Text style={styles.title}>Partner Profile</Text>
				<Text style={styles.subtitle}>
					Create your on-chain profile so Farmers can verify your
					identity.
				</Text>

				{existingProfile?.partnerProfilePda && (
					<View style={styles.infoCard}>
						<Text style={styles.label}>Profile PDA</Text>
						<Text style={styles.value}>
							{ellipsify(existingProfile.partnerProfilePda)}
						</Text>
					</View>
				)}

				<View style={styles.field}>
					<Text style={styles.fieldLabel}>Display Name *</Text>
					<TextInput
						style={styles.input}
						value={displayName}
						onChangeText={setDisplayName}
						placeholder="Your name or alias"
						placeholderTextColor="#9ca3af"
						editable={!busy}
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.fieldLabel}>Organization</Text>
					<TextInput
						style={styles.input}
						value={organization}
						onChangeText={setOrganization}
						placeholder="e.g. Harvest Capital LLC"
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
	submitButton: {
		backgroundColor: "#7c3aed",
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

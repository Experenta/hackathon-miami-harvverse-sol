import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	Stack,
	useLocalSearchParams,
	useRouter,
	type Href,
} from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { LotForm, type LotFormData } from "@/features/farmer/lot-form";

export default function EditLotScreen() {
	const { lotCode } = useLocalSearchParams<{ lotCode: string }>();
	const router = useRouter();
	const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
	const updateDraft = useMutation(api.lots.updateDraft);
	const [formData, setFormData] = useState<LotFormData | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	// Populate form when lot data loads
	useEffect(() => {
		if (lot && !formData) {
			setFormData({
				lotCode: lot.lotCode,
				farmName: lot.farmName,
				country: lot.country,
				region: lot.region,
				latitude: String(lot.latitude),
				longitude: String(lot.longitude),
				altitudeMeters: String(lot.altitudeMeters),
				variety: lot.variety,
				areaManzanas: String(lot.areaManzanas),
				ticketUsdcCents: String(lot.ticketUsdcCents),
				farmerShareBps: String(lot.farmerShareBps),
				partnerShareBps: String(lot.partnerShareBps),
			});
		}
	}, [lot, formData]);

	const handleSave = useCallback(async () => {
		if (!formData || !lotCode) return;

		const farmerShareBps = parseInt(formData.farmerShareBps, 10) || 0;
		const partnerShareBps = parseInt(formData.partnerShareBps, 10) || 0;

		if (farmerShareBps + partnerShareBps !== 10000) {
			Alert.alert(
				"Invalid Share Split",
				"Farmer share + Partner share must equal 10000 BPS (100%).",
			);
			return;
		}

		setIsSaving(true);

		try {
			await updateDraft({
				lotCode,
				farmName: formData.farmName.trim(),
				variety: formData.variety.trim(),
				region: formData.region.trim(),
				country: formData.country.trim(),
				latitude: parseFloat(formData.latitude) || 0,
				longitude: parseFloat(formData.longitude) || 0,
				altitudeMeters: parseInt(formData.altitudeMeters, 10) || 0,
				areaManzanas: parseFloat(formData.areaManzanas) || 0,
				ticketUsdcCents: parseInt(formData.ticketUsdcCents, 10) || 0,
				farmerShareBps,
				partnerShareBps,
			});

			Alert.alert("Saved", "Lot draft updated.", [
				{ text: "OK", onPress: () => router.back() },
			]);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to save";
			Alert.alert("Error", message);
		} finally {
			setIsSaving(false);
		}
	}, [formData, lotCode, updateDraft, router]);

	// Loading state
	if (lot === undefined) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#059669" />
					<Text style={styles.loadingText}>Loading lot…</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!lot) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.centered}>
					<Text style={styles.errorText}>
						Lot not found: {lotCode}
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!formData) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#059669" />
				</View>
			</SafeAreaView>
		);
	}

	const isDraft = lot.status === "draft";

	return (
		<SafeAreaView style={styles.screen}>
			<Stack.Screen
				options={{ title: isDraft ? "Edit Lot" : "Lot Details" }}
			/>
			<View style={styles.header}>
				<View style={styles.titleRow}>
					<Text style={styles.title}>
						{isDraft ? "Edit Lot" : "Lot Details"}: {lot.lotCode}
					</Text>
					<View style={styles.statusBadge}>
						<Text style={styles.statusText}>{lot.status}</Text>
					</View>
				</View>
				{!isDraft && (
					<Text style={styles.subtitle}>
						This lot is already {lot.status}. Details are read-only.
					</Text>
				)}
			</View>
			<LotForm
				data={formData}
				onChange={setFormData}
				disabled={isSaving || !isDraft}
				showAutofill={isDraft}
			>
				{isDraft && (
					<TouchableOpacity
						accessibilityLabel="Save changes"
						accessibilityRole="button"
						disabled={isSaving}
						onPress={handleSave}
						style={[
							styles.saveButton,
							isSaving && styles.saveButtonDisabled,
						]}
					>
						{isSaving ? (
							<ActivityIndicator color="#ffffff" size="small" />
						) : (
							<Text style={styles.saveButtonText}>
								Save Changes
							</Text>
						)}
					</TouchableOpacity>
				)}

				<TouchableOpacity
					accessibilityLabel="Proceed to publish"
					accessibilityRole="button"
					onPress={() =>
						router.push(
							`/(farmer)/lots/${lotCode}/publish-review` as Href,
						)
					}
					style={styles.publishNavButton}
				>
					<Text style={styles.publishNavButtonText}>
						{isDraft
							? "Proceed to Publish"
							: "View Publish Review"}
					</Text>
				</TouchableOpacity>
			</LotForm>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		gap: 12,
	},
	loadingText: { marginTop: 8, fontSize: 14, color: "#6b7280" },
	errorText: { fontSize: 15, color: "#dc2626", textAlign: "center" },
	header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
	subtitle: { marginTop: 6, fontSize: 13, color: "#6b7280" },
	statusBadge: {
		backgroundColor: "#d1fae5",
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	statusText: {
		color: "#065f46",
		fontSize: 11,
		fontWeight: "700",
		textTransform: "capitalize",
	},
	saveButton: {
		backgroundColor: "#059669",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	saveButtonDisabled: { opacity: 0.6 },
	saveButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
	publishNavButton: {
		backgroundColor: "#7c3aed",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	publishNavButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
});

import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Alert,
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
import { computeManifestHashHex } from "@repo/solana-client";
import {
	LotForm,
	EMPTY_LOT_FORM,
	type LotFormData,
} from "@/features/farmer/lot-form";
import {
	DEMO_AGRONOMIC_PLAN,
	DEMO_SENSOR_SNAPSHOT,
} from "@/constants/demo-data";

export default function CreateLotScreen() {
	const { account } = useMobileWallet();
	const router = useRouter();
	const createDraft = useMutation(api.lots.createDraft);
	const upsertPlan = useMutation(api.agronomicPlans.upsertPlan);
	const addSnapshot = useMutation(api.sensorSnapshots.addSnapshot);
	const [formData, setFormData] = useState<LotFormData>(EMPTY_LOT_FORM);
	const [isSaving, setIsSaving] = useState(false);
	const [draftSaved, setDraftSaved] = useState(false);
	const [planAutofilled, setPlanAutofilled] = useState(false);
	const [sensorAutofilled, setSensorAutofilled] = useState(false);

	const wallet = account?.address?.toString() ?? "";

	const handleSaveDraft = useCallback(async () => {
		if (!wallet) {
			Alert.alert("Error", "No wallet connected.");
			return;
		}

		const { lotCode, farmName, variety, country, region, ticketUsdcCents } =
			formData;

		if (
			!lotCode.trim() ||
			!farmName.trim() ||
			!variety.trim() ||
			!country.trim() ||
			!region.trim() ||
			!ticketUsdcCents.trim()
		) {
			Alert.alert("Error", "Please fill in all required fields (*).");
			return;
		}

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
			await createDraft({
				lotCode: lotCode.trim(),
				farmerWallet: wallet,
				farmName: farmName.trim(),
				variety: variety.trim(),
				region: region.trim(),
				country: country.trim(),
				latitude: parseFloat(formData.latitude) || 0,
				longitude: parseFloat(formData.longitude) || 0,
				altitudeMeters: parseInt(formData.altitudeMeters, 10) || 0,
				areaManzanas: parseFloat(formData.areaManzanas) || 0,
				ticketUsdcCents: parseInt(ticketUsdcCents, 10),
				farmerShareBps,
				partnerShareBps,
			});

			setDraftSaved(true);
			Alert.alert(
				"Draft Saved",
				"Your lot draft has been saved. You can now autofill plan and sensor data, or proceed to publish.",
			);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to save draft";
			Alert.alert("Error", message);
		} finally {
			setIsSaving(false);
		}
	}, [wallet, formData, createDraft]);

	const handleAutofillPlan = useCallback(async () => {
		const lotCode = formData.lotCode.trim();
		if (!lotCode) {
			Alert.alert("Error", "Save the lot draft first.");
			return;
		}

		try {
			const planHash = await computeManifestHashHex({
				lotCode,
				planId: DEMO_AGRONOMIC_PLAN.planId,
				planJson: DEMO_AGRONOMIC_PLAN.planJson,
			} as Record<string, unknown>);

			await upsertPlan({
				lotCode,
				planId: DEMO_AGRONOMIC_PLAN.planId,
				planJson: DEMO_AGRONOMIC_PLAN.planJson,
				hash: planHash,
			});

			setPlanAutofilled(true);
			Alert.alert("Plan Autofilled", "Demo agronomic plan saved.");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to autofill plan";
			Alert.alert("Error", message);
		}
	}, [formData.lotCode, upsertPlan]);

	const handleAutofillSensor = useCallback(async () => {
		const lotCode = formData.lotCode.trim();
		if (!lotCode) {
			Alert.alert("Error", "Save the lot draft first.");
			return;
		}

		try {
			const payload = { ...DEMO_SENSOR_SNAPSHOT };
			const hash = await computeManifestHashHex(
				payload as unknown as Record<string, unknown>,
			);

			await addSnapshot({
				lotCode,
				source: DEMO_SENSOR_SNAPSHOT.source,
				temperatureC: DEMO_SENSOR_SNAPSHOT.temperatureC,
				humidityPct: DEMO_SENSOR_SNAPSHOT.humidityPct,
				soilPh: DEMO_SENSOR_SNAPSHOT.soilPh,
				soilMoisturePct: DEMO_SENSOR_SNAPSHOT.soilMoisturePct,
				payload,
				hash,
			});

			setSensorAutofilled(true);
			Alert.alert("Sensor Autofilled", "Demo sensor snapshot saved.");
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to autofill sensor";
			Alert.alert("Error", message);
		}
	}, [formData.lotCode, addSnapshot]);

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.header}>
				<Text style={styles.title}>Create New Lot</Text>
			</View>
			<LotForm data={formData} onChange={setFormData} disabled={isSaving}>
				{/* Save draft button */}
				<TouchableOpacity
					accessibilityLabel="Save draft"
					accessibilityRole="button"
					disabled={isSaving || draftSaved}
					onPress={handleSaveDraft}
					style={[
						styles.saveButton,
						(isSaving || draftSaved) && styles.saveButtonDisabled,
					]}
				>
					{isSaving ? (
						<ActivityIndicator color="#ffffff" size="small" />
					) : (
						<Text style={styles.saveButtonText}>
							{draftSaved ? "✓ Draft Saved" : "Save Draft"}
						</Text>
					)}
				</TouchableOpacity>

				{/* Autofill buttons — shown after draft is saved */}
				{draftSaved && (
					<View style={styles.autofillSection}>
						<Text style={styles.autofillSectionTitle}>
							Demo Autofill Helpers
						</Text>

						<TouchableOpacity
							accessibilityLabel="Autofill agronomic plan"
							accessibilityRole="button"
							disabled={planAutofilled}
							onPress={handleAutofillPlan}
							style={[
								styles.demoButton,
								planAutofilled && styles.demoButtonDone,
							]}
						>
							<Text style={styles.demoButtonText}>
								{planAutofilled
									? "✓ Plan autofilled"
									: "🌱 Autofill agronomic plan"}
							</Text>
							<Text style={styles.demoHint}>Demo helper</Text>
						</TouchableOpacity>

						<TouchableOpacity
							accessibilityLabel="Autofill demo sensor snapshot"
							accessibilityRole="button"
							disabled={sensorAutofilled}
							onPress={handleAutofillSensor}
							style={[
								styles.demoButton,
								sensorAutofilled && styles.demoButtonDone,
							]}
						>
							<Text style={styles.demoButtonText}>
								{sensorAutofilled
									? "✓ Sensor autofilled"
									: "📡 Autofill demo sensor snapshot"}
							</Text>
							<Text style={styles.demoHint}>Demo helper</Text>
						</TouchableOpacity>

						{/* Navigate to publish */}
						<TouchableOpacity
							accessibilityLabel="Go to publish review"
							accessibilityRole="button"
							onPress={() =>
								router.push(
									`/(farmer)/lots/${formData.lotCode.trim()}/publish-review` as Href,
								)
							}
							style={styles.publishNavButton}
						>
							<Text style={styles.publishNavButtonText}>
								Proceed to Publish →
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</LotForm>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
	title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
	saveButton: {
		backgroundColor: "#059669",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	saveButtonDisabled: { opacity: 0.6 },
	saveButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
	autofillSection: {
		marginTop: 16,
		gap: 10,
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
		paddingTop: 16,
	},
	autofillSectionTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 4,
	},
	demoButton: {
		backgroundColor: "#eff6ff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#93c5fd",
		padding: 12,
		alignItems: "center",
		gap: 2,
	},
	demoButtonDone: {
		backgroundColor: "#ecfdf5",
		borderColor: "#6ee7b7",
	},
	demoButtonText: { fontSize: 14, fontWeight: "600", color: "#1e40af" },
	demoHint: { fontSize: 11, color: "#6b7280" },
	publishNavButton: {
		backgroundColor: "#7c3aed",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	publishNavButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
});

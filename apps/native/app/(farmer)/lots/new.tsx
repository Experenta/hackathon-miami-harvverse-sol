import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMutation } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { computeManifestHashHex } from "@repo/solana-client";
import { Button, Screen, ScreenHeader, Section, Banner, ActionBar, StatusPill } from "@/components/ui";
import {
	DEMO_AGRONOMIC_PLAN,
	DEMO_SENSOR_SNAPSHOT,
} from "@/constants/demo-data";
import {
	EMPTY_LOT_FORM,
	LotForm,
	type LotFormData,
} from "@/features/farmer/lot-form";
import { useTheme } from "@/theme";

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
	const { theme } = useTheme();

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
				err instanceof Error ? err.message : "Failed to autofill sensor";
			Alert.alert("Error", message);
		}
	}, [formData.lotCode, addSnapshot]);

	return (
		<Screen scrollable>
			<ScreenHeader
				eyebrow="Farmer flow"
				title="Create new lot"
				subtitle="Compose the lot draft first, then enrich it with demo plan and sensor data before publish review."
			/>

			{draftSaved ? (
				<Banner
					tone="success"
					title="Draft saved"
					description="The lot draft is ready for helper autofills or publish review."
				/>
			) : (
				<Banner
					tone="info"
					title="Draft first"
					description="Required fields and share split validation remain unchanged. Save once before running helper actions."
				/>
			)}

			<LotForm
				data={formData}
				onChange={setFormData}
				disabled={isSaving}
			>
				<ActionBar>
					<Button
						title={draftSaved ? "Draft Saved" : "Save Draft"}
						onPress={handleSaveDraft}
						disabled={isSaving || draftSaved}
						loading={isSaving}
					/>
					<Text
						style={[
							theme.typography.caption,
							{ color: theme.colors.text.muted, textAlign: "center" },
						]}
					>
						The save flow and validations are unchanged. This only updates the visual system.
					</Text>
				</ActionBar>

				{draftSaved ? (
					<Section
						title="Demo autofill helpers"
						description="Optional helpers for plan and sensor data after the draft exists."
					>
						<Banner
							tone="accent"
							title="Digital helper actions"
							description="These shortcuts keep the existing demo payloads and hashes."
						>
							<View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
								<StatusPill
									label={planAutofilled ? "Plan ready" : "Plan pending"}
									tone={planAutofilled ? "success" : "accent"}
								/>
								<StatusPill
									label={sensorAutofilled ? "Sensor ready" : "Sensor pending"}
									tone={sensorAutofilled ? "success" : "accent"}
								/>
							</View>
						</Banner>
						<ActionBar variant="subtle">
							<Button
								title={planAutofilled ? "Plan Autofilled" : "Autofill Agronomic Plan"}
								variant="secondary"
								onPress={handleAutofillPlan}
								disabled={planAutofilled}
							/>
							<Button
								title={
									sensorAutofilled
										? "Sensor Autofilled"
										: "Autofill Sensor Snapshot"
								}
								variant="secondary"
								onPress={handleAutofillSensor}
								disabled={sensorAutofilled}
							/>
							<Button
								title="Proceed to Publish"
								variant="accent"
								onPress={() =>
									router.push(
										`/(farmer)/lots/${formData.lotCode.trim()}/publish-review` as Href,
									)
								}
							/>
						</ActionBar>
					</Section>
				) : null}
			</LotForm>
		</Screen>
	);
}

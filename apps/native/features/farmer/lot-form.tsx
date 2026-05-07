import { useCallback } from "react";
import { Text, View } from "react-native";
import {
	ActionBar,
	Badge,
	Banner,
	Button,
	Card,
	DetailRow,
	FormField,
	Section,
	StatusPill,
} from "@/components/ui";
import { ZAFIRO_DEMO_LOT } from "@/constants/demo-data";
import { useTheme } from "@/theme";

export interface LotFormData {
	lotCode: string;
	farmName: string;
	country: string;
	region: string;
	latitude: string;
	longitude: string;
	altitudeMeters: string;
	variety: string;
	areaManzanas: string;
	ticketUsdcCents: string;
	farmerShareBps: string;
	partnerShareBps: string;
}

export const EMPTY_LOT_FORM: LotFormData = {
	lotCode: "",
	farmName: "",
	country: "",
	region: "",
	latitude: "",
	longitude: "",
	altitudeMeters: "",
	variety: "",
	areaManzanas: "",
	ticketUsdcCents: "",
	farmerShareBps: "",
	partnerShareBps: "",
};

interface LotFormProps {
	data: LotFormData;
	onChange: (data: LotFormData) => void;
	disabled?: boolean;
	showAutofill?: boolean;
	children?: React.ReactNode;
}

export function LotForm({
	data,
	onChange,
	disabled,
	showAutofill = true,
	children,
}: LotFormProps) {
	const { theme } = useTheme();
	const ticketValue = parseInt(data.ticketUsdcCents, 10) || 0;
	const farmerShareBps = parseInt(data.farmerShareBps, 10) || 0;
	const partnerShareBps = parseInt(data.partnerShareBps, 10) || 0;
	const shareTotal = farmerShareBps + partnerShareBps;
	const isShareBalanced = shareTotal === 10000;
	const lotIdentity = data.lotCode.trim() || "Draft lot";
	const locationLabel = [data.region.trim(), data.country.trim()]
		.filter(Boolean)
		.join(", ");
	const progressCount = [
		data.lotCode,
		data.farmName,
		data.country,
		data.region,
		data.variety,
		data.ticketUsdcCents,
	]
		.map((value) => value.trim())
		.filter(Boolean).length;

	const update = useCallback(
		(field: keyof LotFormData, value: string) => {
			onChange({ ...data, [field]: value });
		},
		[data, onChange],
	);

	const handleAutofill = useCallback(() => {
		onChange({
			lotCode: ZAFIRO_DEMO_LOT.lotCode,
			farmName: ZAFIRO_DEMO_LOT.farmName,
			country: ZAFIRO_DEMO_LOT.country,
			region: ZAFIRO_DEMO_LOT.region,
			latitude: String(ZAFIRO_DEMO_LOT.latitude),
			longitude: String(ZAFIRO_DEMO_LOT.longitude),
			altitudeMeters: String(ZAFIRO_DEMO_LOT.altitudeMeters),
			variety: ZAFIRO_DEMO_LOT.variety,
			areaManzanas: String(ZAFIRO_DEMO_LOT.areaManzanas),
			ticketUsdcCents: String(ZAFIRO_DEMO_LOT.ticketUsdcCents),
			farmerShareBps: String(ZAFIRO_DEMO_LOT.farmerShareBps),
			partnerShareBps: String(ZAFIRO_DEMO_LOT.partnerShareBps),
		});
	}, [onChange]);

	const content = (
		<View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing["2xl"] }}>
			<Section
				title="Draft overview"
				description="A compact read on identity, location and commercial readiness while you fill the form."
				aside={
					<StatusPill
						label={isShareBalanced ? "Split balanced" : "Split review"}
						tone={isShareBalanced ? "success" : "warning"}
					/>
				}
			>
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						gap: theme.spacing.sm,
					}}
				>
					<Card variant="muted" style={{ flex: 1, minWidth: 180 }}>
						<Text
							style={[
								theme.typography.labelSm,
								{
									color: theme.colors.text.muted,
									letterSpacing: 0.8,
									textTransform: "uppercase",
								},
							]}
						>
							Identity
						</Text>
						<Text
							style={[
								theme.typography.text2,
								{ color: theme.colors.text.primary },
							]}
						>
							{lotIdentity}
						</Text>
						<Text
							style={[
								theme.typography.bodySm,
								{ color: theme.colors.text.secondary },
							]}
						>
							{data.farmName.trim() || "Farm name pending"}
						</Text>
					</Card>
					<Card variant="muted" style={{ flex: 1, minWidth: 180 }}>
						<Text
							style={[
								theme.typography.labelSm,
								{
									color: theme.colors.text.muted,
									letterSpacing: 0.8,
									textTransform: "uppercase",
								},
							]}
						>
							Commercial snapshot
						</Text>
						<Text
							style={[
								theme.typography.text2,
								{ color: theme.colors.text.primary },
							]}
						>
							{formatTicketUsd(ticketValue)}
						</Text>
						<Text
							style={[
								theme.typography.bodySm,
								{ color: theme.colors.text.secondary },
							]}
						>
							{farmerShareBps / 100}% farmer / {partnerShareBps / 100}% partner
						</Text>
					</Card>
				</View>
				<Card variant={isShareBalanced ? "success" : "warning"}>
					<DetailRow
						label="Location"
						value={locationLabel || "Region and country pending"}
						valueTone="secondary"
					/>
					<DetailRow
						label="Completion"
						value={`${progressCount}/6 key fields`}
						valueTone="secondary"
					/>
					<DetailRow
						label="Share total"
						value={`${shareTotal} BPS`}
						helper="Target: 10000 BPS"
						valueTone="secondary"
					/>
				</Card>
			</Section>

			{showAutofill ? (
				<Banner
					tone="accent"
					eyebrow="Demo template"
					title="Start from the Zafiro lot"
					description="Prefill a reference lot to test farmer flows without changing any business rules."
					accessory={<Badge label="Helper" tone="partner" />}
				>
					<ActionBar variant="subtle">
						<Button
							title="Autofill Zafiro demo lot"
							variant="accent"
							onPress={handleAutofill}
							disabled={disabled}
						/>
					</ActionBar>
				</Banner>
			) : null}

			<Section
				title="Lot identity"
				description="Core identifiers that anchor the lot across Convex and Solana."
			>
				<Card variant="muted">
					<FormField
						label="Lot Code"
						required
						value={data.lotCode}
						onChangeText={(v) => update("lotCode", v)}
						placeholder="e.g. HV-HN-ZAF-L02"
						disabled={disabled}
						autoCapitalize="characters"
						hint="Use a stable code. This is the human-facing identifier reused across the flow."
					/>
					<FormField
						label="Farm Name"
						required
						value={data.farmName}
						onChangeText={(v) => update("farmName", v)}
						placeholder="e.g. Zafiro"
						disabled={disabled}
						hint="This is the name partners will see first in the catalog."
					/>
					<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
						<View style={{ flex: 1 }}>
							<FormField
								label="Country"
								required
								value={data.country}
								onChangeText={(v) => update("country", v)}
								placeholder="e.g. Honduras"
								disabled={disabled}
							/>
						</View>
						<View style={{ flex: 1 }}>
							<FormField
								label="Region"
								required
								value={data.region}
								onChangeText={(v) => update("region", v)}
								placeholder="e.g. Comayagua"
								disabled={disabled}
							/>
						</View>
					</View>
				</Card>
			</Section>

			<Section
				title="Geography and crop"
				description="Field coordinates, altitude and cultivar context."
			>
				<Card variant="muted">
					<Banner
						tone="info"
						title="Physical context"
						description="These fields shape the agronomic identity of the lot and help partners interpret origin quality."
					/>
					<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
						<View style={{ flex: 1 }}>
							<FormField
								label="Latitude"
								value={data.latitude}
								onChangeText={(v) => update("latitude", v)}
								placeholder="14.9465"
								keyboardType="numeric"
								disabled={disabled}
							/>
						</View>
						<View style={{ flex: 1 }}>
							<FormField
								label="Longitude"
								value={data.longitude}
								onChangeText={(v) => update("longitude", v)}
								placeholder="-88.0863"
								keyboardType="numeric"
								disabled={disabled}
							/>
						</View>
					</View>
					<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
						<View style={{ flex: 1 }}>
							<FormField
								label="Altitude (m)"
								value={data.altitudeMeters}
								onChangeText={(v) => update("altitudeMeters", v)}
								placeholder="1300"
								keyboardType="numeric"
								disabled={disabled}
								hint="Meters above sea level."
							/>
						</View>
						<View style={{ flex: 1 }}>
							<FormField
								label="Variety"
								required
								value={data.variety}
								onChangeText={(v) => update("variety", v)}
								placeholder="Parainema"
								disabled={disabled}
							/>
						</View>
					</View>
					<FormField
						label="Area (manzanas)"
						value={data.areaManzanas}
						onChangeText={(v) => update("areaManzanas", v)}
						placeholder="1.0"
						keyboardType="numeric"
						disabled={disabled}
						hint="Useful for contextualizing scale against ticket size."
					/>
				</Card>
			</Section>

			<Section
				title="Commercial terms"
				description="Ticket sizing and basis-point split between farmer and partner."
			>
				<Card variant="muted">
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: theme.spacing.xs,
						}}
					>
						<Badge label={formatTicketUsd(ticketValue)} tone="partner" />
						<Badge
							label={isShareBalanced ? "100% allocated" : "Split review needed"}
							tone={isShareBalanced ? "success" : "warning"}
						/>
					</View>
					<FormField
						label="Ticket (USDC cents)"
						required
						value={data.ticketUsdcCents}
						onChangeText={(v) => update("ticketUsdcCents", v)}
						placeholder="342500 = $3,425.00"
						keyboardType="numeric"
						disabled={disabled}
						hint="Stored as integer cents for deterministic on-chain math."
					/>
					<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
						<View style={{ flex: 1 }}>
							<FormField
								label="Farmer Share (BPS)"
								value={data.farmerShareBps}
								onChangeText={(v) => update("farmerShareBps", v)}
								placeholder="6000 = 60%"
								keyboardType="numeric"
								disabled={disabled}
								hint="Producer-side participation."
							/>
						</View>
						<View style={{ flex: 1 }}>
							<FormField
								label="Partner Share (BPS)"
								value={data.partnerShareBps}
								onChangeText={(v) => update("partnerShareBps", v)}
								placeholder="4000 = 40%"
								keyboardType="numeric"
								disabled={disabled}
								hint="Both shares should sum to 10000 BPS."
							/>
						</View>
					</View>
					<Banner
						tone={isShareBalanced ? "success" : "warning"}
						title={
							isShareBalanced
								? "Share split balanced"
								: "Share split needs adjustment"
						}
						description={
							isShareBalanced
								? "The current farmer and partner basis-point split adds up to 10000."
								: `The current total is ${shareTotal} BPS. Adjust the split to reach 10000 BPS.`
						}
					/>
				</Card>
			</Section>

			{children}
		</View>
	);

	return content;
}

function formatTicketUsd(cents: number) {
	return `$${(cents / 100).toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})}`;
}

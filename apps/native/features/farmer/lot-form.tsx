import { useCallback } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { ZAFIRO_DEMO_LOT } from "@/constants/demo-data";

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

	return (
		<ScrollView
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			{showAutofill && (
				<TouchableOpacity
					accessibilityLabel="Autofill Zafiro demo lot"
					accessibilityRole="button"
					onPress={handleAutofill}
					style={styles.autofillButton}
					disabled={disabled}
				>
					<Text style={styles.autofillButtonText}>
						Autofill Zafiro demo lot
					</Text>
					<Text style={styles.autofillHint}>Demo helper</Text>
				</TouchableOpacity>
			)}

			<FormField
				label="Lot Code *"
				value={data.lotCode}
				onChangeText={(v) => update("lotCode", v)}
				placeholder="e.g. HV-HN-ZAF-L02"
				disabled={disabled}
			/>
			<FormField
				label="Farm Name *"
				value={data.farmName}
				onChangeText={(v) => update("farmName", v)}
				placeholder="e.g. Zafiro"
				disabled={disabled}
			/>
			<FormField
				label="Country *"
				value={data.country}
				onChangeText={(v) => update("country", v)}
				placeholder="e.g. Honduras"
				disabled={disabled}
			/>
			<FormField
				label="Region *"
				value={data.region}
				onChangeText={(v) => update("region", v)}
				placeholder="e.g. Comayagua"
				disabled={disabled}
			/>

			<View style={styles.row}>
				<View style={styles.halfField}>
					<FormField
						label="Latitude"
						value={data.latitude}
						onChangeText={(v) => update("latitude", v)}
						placeholder="14.9465"
						keyboardType="numeric"
						disabled={disabled}
					/>
				</View>
				<View style={styles.halfField}>
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

			<View style={styles.row}>
				<View style={styles.halfField}>
					<FormField
						label="Altitude (m)"
						value={data.altitudeMeters}
						onChangeText={(v) => update("altitudeMeters", v)}
						placeholder="1300"
						keyboardType="numeric"
						disabled={disabled}
					/>
				</View>
				<View style={styles.halfField}>
					<FormField
						label="Variety *"
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
			/>

			<FormField
				label="Ticket (USDC cents) *"
				value={data.ticketUsdcCents}
				onChangeText={(v) => update("ticketUsdcCents", v)}
				placeholder="342500 = $3,425.00"
				keyboardType="numeric"
				disabled={disabled}
			/>

			<View style={styles.row}>
				<View style={styles.halfField}>
					<FormField
						label="Farmer Share (BPS)"
						value={data.farmerShareBps}
						onChangeText={(v) => update("farmerShareBps", v)}
						placeholder="6000 = 60%"
						keyboardType="numeric"
						disabled={disabled}
					/>
				</View>
				<View style={styles.halfField}>
					<FormField
						label="Partner Share (BPS)"
						value={data.partnerShareBps}
						onChangeText={(v) => update("partnerShareBps", v)}
						placeholder="4000 = 40%"
						keyboardType="numeric"
						disabled={disabled}
					/>
				</View>
			</View>

			{children}
		</ScrollView>
	);
}

interface FormFieldProps {
	label: string;
	value: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
	keyboardType?: "default" | "numeric";
	disabled?: boolean;
}

function FormField({
	label,
	value,
	onChangeText,
	placeholder,
	keyboardType = "default",
	disabled,
}: FormFieldProps) {
	return (
		<View style={styles.field}>
			<Text style={styles.fieldLabel}>{label}</Text>
			<TextInput
				style={[styles.input, disabled && styles.inputDisabled]}
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9ca3af"
				keyboardType={keyboardType}
				editable={!disabled}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { gap: 12, paddingBottom: 40 },
	autofillButton: {
		backgroundColor: "#fef3c7",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#fbbf24",
		padding: 12,
		alignItems: "center",
		gap: 2,
	},
	autofillButtonText: { fontSize: 14, fontWeight: "600", color: "#92400e" },
	autofillHint: { fontSize: 11, color: "#b45309" },
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
	inputDisabled: {
		backgroundColor: "#f9fafb",
		color: "#374151",
	},
	row: { flexDirection: "row", gap: 10 },
	halfField: { flex: 1 },
});

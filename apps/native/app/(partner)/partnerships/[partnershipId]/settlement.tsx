import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { usePartnerships } from "@/features/partner/use-partnership";
import { ellipsify } from "@/utils/ellipsify";

// Settlement constants for the demo (Zafiro lot)
const DEMO_YIELD_QQ = 6;
const LBS_PER_QQ = 83.3;
const PRICE_PER_LB = 3.5;
const DEMO_COST_CENTS = 149000; // $1,490

export default function SettlementPreviewScreen() {
	const { partnershipId } = useLocalSearchParams<{
		partnershipId: string;
	}>();
	const { partnerships } = usePartnerships();

	// Find the partnership from the list
	const partnership = partnerships.find((p) => p._id === partnershipId);

	// Fetch the lot to get share BPS values
	const lot = useQuery(
		api.lots.getByCode,
		partnership?.lotCode ? { lotCode: partnership.lotCode } : "skip",
	);

	if (!partnership) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.centered}>
					<Text style={styles.errorText}>Partnership not found.</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Use lot share values if available, otherwise default to 60/40
	const farmerShareBps = lot?.farmerShareBps ?? 6000;
	const partnerShareBps = lot?.partnerShareBps ?? 4000;

	return (
		<SafeAreaView style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.title}>Settlement Preview</Text>
				<Text style={styles.subtitle}>
					Projected settlement math for lot {partnership.lotCode}.
				</Text>

				{/* Partnership info */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Partnership Info</Text>
					<DetailRow label="Lot" value={partnership.lotCode} />
					<DetailRow
						label="Farmer"
						value={ellipsify(partnership.farmerWallet)}
					/>
					<DetailRow label="Status" value={partnership.status} />
					{partnership.partnershipPda && (
						<DetailRow
							label="PDA"
							value={ellipsify(partnership.partnershipPda)}
							mono
						/>
					)}
				</View>

				{/* Settlement math */}
				<SettlementMathCard
					farmerShareBps={farmerShareBps}
					partnerShareBps={partnerShareBps}
				/>

				<View style={styles.disclaimerCard}>
					<Text style={styles.disclaimerText}>
						This is a projected settlement based on demo values (6qq
						yield, $3.50/lb, $1,490 cost). Actual settlement will be
						recorded on-chain when the harvest cycle completes.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

function DetailRow({
	label,
	value,
	mono,
}: {
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<View style={styles.detailRow}>
			<Text style={styles.detailLabel}>{label}</Text>
			<Text style={[styles.detailValue, mono && styles.detailValueMono]}>
				{value}
			</Text>
		</View>
	);
}

interface SettlementMathCardProps {
	farmerShareBps: number;
	partnerShareBps: number;
}

function SettlementMathCard({
	farmerShareBps,
	partnerShareBps,
}: SettlementMathCardProps) {
	// Revenue calculation
	const totalLbs = DEMO_YIELD_QQ * LBS_PER_QQ;
	const revenueCents = Math.round(totalLbs * PRICE_PER_LB * 100);
	const costCents = DEMO_COST_CENTS;
	const profitCents = revenueCents - costCents;

	// Share split
	const farmerShareCents = Math.round((profitCents * farmerShareBps) / 10000);
	const partnerShareCents = Math.round(
		(profitCents * partnerShareBps) / 10000,
	);

	const farmerPct = farmerShareBps / 100;
	const partnerPct = partnerShareBps / 100;

	return (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>Settlement Math</Text>

			{/* Revenue */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Revenue</Text>
				<MathRow
					label={`${DEMO_YIELD_QQ}qq × ${LBS_PER_QQ} lb/qq × $${PRICE_PER_LB.toFixed(2)}`}
					value={formatUsd(revenueCents)}
				/>
			</View>

			{/* Cost */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Cost</Text>
				<MathRow
					label="Production + processing"
					value={formatUsd(costCents)}
				/>
			</View>

			{/* Profit */}
			<View style={styles.divider} />
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Profit</Text>
				<MathRow
					label={`${formatUsd(revenueCents)} − ${formatUsd(costCents)}`}
					value={formatUsd(profitCents)}
					highlight
				/>
			</View>

			{/* Share split */}
			<View style={styles.divider} />
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Share Split</Text>
				<MathRow
					label={`Farmer (${farmerPct}%)`}
					value={formatUsd(farmerShareCents)}
				/>
				<MathRow
					label={`Partner (${partnerPct}%)`}
					value={formatUsd(partnerShareCents)}
					highlight
				/>
			</View>
		</View>
	);
}

function MathRow({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string;
	highlight?: boolean;
}) {
	return (
		<View style={styles.mathRow}>
			<Text style={styles.mathLabel}>{label}</Text>
			<Text
				style={[
					styles.mathValue,
					highlight && styles.mathValueHighlight,
				]}
			>
				{value}
			</Text>
		</View>
	);
}

function formatUsd(cents: number): string {
	return `$${(cents / 100).toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})}`;
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	container: { padding: 16, gap: 14, paddingBottom: 40 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	errorText: { fontSize: 15, color: "#dc2626" },
	title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
	subtitle: { fontSize: 14, color: "#6b7280" },
	card: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		gap: 12,
	},
	cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	detailLabel: { fontSize: 13, color: "#6b7280" },
	detailValue: { fontSize: 13, fontWeight: "500", color: "#111827" },
	detailValueMono: { fontFamily: "monospace", fontSize: 12 },
	section: { gap: 6 },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "600",
		color: "#6b7280",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	divider: {
		height: 1,
		backgroundColor: "#e5e7eb",
	},
	mathRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 2,
	},
	mathLabel: { fontSize: 14, color: "#374151" },
	mathValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
	mathValueHighlight: { color: "#7c3aed", fontWeight: "700" },
	disclaimerCard: {
		backgroundColor: "#eff6ff",
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: "#bfdbfe",
	},
	disclaimerText: { fontSize: 12, color: "#1e40af", lineHeight: 18 },
});

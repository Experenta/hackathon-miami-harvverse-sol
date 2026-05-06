import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { usePartnerships } from "@/features/partner/use-partnership";
import { ellipsify } from "@/utils/ellipsify";

export default function PartnershipDetailScreen() {
	const { partnershipId } = useLocalSearchParams<{
		partnershipId: string;
	}>();
	const { partnerships } = usePartnerships();
	const router = useRouter();

	// Find the partnership from the list
	const partnership = partnerships.find((p) => p._id === partnershipId);

	if (!partnership) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.centered}>
					<Text style={styles.errorText}>Partnership not found.</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.title}>Partnership Details</Text>

				<View style={styles.card}>
					<Text style={styles.cardTitle}>Overview</Text>
					<DetailRow label="Lot" value={partnership.lotCode} />
					<DetailRow label="Status" value={partnership.status} />
					<DetailRow
						label="Farmer"
						value={ellipsify(partnership.farmerWallet)}
						mono
					/>
					{partnership.partnershipPda && (
						<DetailRow
							label="Partnership PDA"
							value={ellipsify(partnership.partnershipPda)}
							mono
						/>
					)}
					{partnership.reserveTx && (
						<DetailRow
							label="Reserve Tx"
							value={ellipsify(partnership.reserveTx)}
							mono
						/>
					)}
					{partnership.termsHash && (
						<DetailRow
							label="Terms Hash"
							value={ellipsify(partnership.termsHash, 8)}
							mono
						/>
					)}
				</View>

				<TouchableOpacity
					accessibilityLabel="View settlement preview"
					accessibilityRole="button"
					onPress={() =>
						router.push(
							`/(partner)/partnerships/${partnershipId}/settlement` as Href,
						)
					}
					style={styles.settlementButton}
				>
					<Text style={styles.settlementButtonText}>
						View Settlement Preview
					</Text>
				</TouchableOpacity>
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

function ellipsifyHash(hash: string, len = 8): string {
	if (hash.length <= len * 2 + 2) return hash;
	return hash.slice(0, len) + ".." + hash.slice(-len);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	container: { padding: 16, gap: 14, paddingBottom: 40 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	errorText: { fontSize: 15, color: "#dc2626" },
	title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
	card: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		gap: 8,
	},
	cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	detailLabel: { fontSize: 13, color: "#6b7280" },
	detailValue: { fontSize: 13, fontWeight: "500", color: "#111827" },
	detailValueMono: { fontFamily: "monospace", fontSize: 12 },
	settlementButton: {
		backgroundColor: "#7c3aed",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 4,
	},
	settlementButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
});

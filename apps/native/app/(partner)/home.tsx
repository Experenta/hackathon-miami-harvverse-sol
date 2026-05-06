import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { ellipsify } from "@/utils/ellipsify";
import { useRole } from "@/features/role/use-role";
import { usePartnerships } from "@/features/partner/use-partnership";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import { WalletAddressCard } from "@/components/wallet-address-card";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
	reserved: { bg: "#dbeafe", text: "#1e40af" },
	active: { bg: "#d1fae5", text: "#065f46" },
	settled: { bg: "#f3e8ff", text: "#6b21a8" },
	cancelled: { bg: "#fee2e2", text: "#991b1b" },
};

export default function PartnerHomeScreen() {
	const { account } = useMobileWallet();
	const { rolePda } = useRole();
	const { partnerships, isLoading } = usePartnerships();
	const router = useRouter();

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.container}>
				<Text style={styles.title}>Partner Dashboard</Text>
				<DisconnectWalletButton />

				{account && (
					<WalletAddressCard address={account.address.toString()} />
				)}

				{rolePda && (
					<View style={styles.infoCard}>
						<Text style={styles.label}>Role PDA</Text>
						<Text style={styles.value}>{ellipsify(rolePda)}</Text>
					</View>
				)}

				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>My Partnerships</Text>
					<TouchableOpacity
						accessibilityLabel="Browse lot catalog"
						accessibilityRole="button"
						onPress={() =>
							router.push("/(partner)/catalog" as Href)
						}
						style={styles.catalogButton}
					>
						<Text style={styles.catalogButtonText}>
							Browse Lots
						</Text>
					</TouchableOpacity>
				</View>

				{isLoading ? (
					<Text style={styles.emptyText}>Loading partnerships…</Text>
				) : partnerships.length === 0 ? (
					<Text style={styles.emptyText}>
						No partnerships yet. Browse the lot catalog to reserve
						your first partnership.
					</Text>
				) : (
					<FlatList
						data={partnerships}
						keyExtractor={(item) => item._id}
						renderItem={({ item }) => (
							<PartnershipCard
								lotCode={item.lotCode}
								farmerWallet={item.farmerWallet}
								status={item.status}
								partnershipPda={item.partnershipPda}
								onPress={() =>
									router.push(
										`/(partner)/partnerships/${item._id}/settlement` as Href,
									)
								}
							/>
						)}
						contentContainerStyle={styles.listContent}
						showsVerticalScrollIndicator={false}
					/>
				)}
			</View>
		</SafeAreaView>
	);
}

interface PartnershipCardProps {
	lotCode: string;
	farmerWallet: string;
	status: string;
	partnershipPda?: string;
	onPress: () => void;
}

function PartnershipCard({
	lotCode,
	farmerWallet,
	status,
	partnershipPda,
	onPress,
}: PartnershipCardProps) {
	const colors = STATUS_COLORS[status] ?? STATUS_COLORS.reserved;

	return (
		<TouchableOpacity
			accessibilityLabel={`Partnership for lot ${lotCode}`}
			accessibilityRole="button"
			onPress={onPress}
			style={styles.partnershipCard}
		>
			<View style={styles.cardHeader}>
				<Text style={styles.lotCode}>{lotCode}</Text>
				<View
					style={[styles.statusBadge, { backgroundColor: colors.bg }]}
				>
					<Text style={[styles.statusText, { color: colors.text }]}>
						{status}
					</Text>
				</View>
			</View>
			<View style={styles.cardDetails}>
				<Text style={styles.detailLabel}>Farmer</Text>
				<Text style={styles.detailValue}>
					{ellipsify(farmerWallet)}
				</Text>
			</View>
			{partnershipPda && (
				<View style={styles.cardDetails}>
					<Text style={styles.detailLabel}>Partnership PDA</Text>
					<Text style={styles.detailValueMono}>
						{ellipsify(partnershipPda)}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	container: { flex: 1, padding: 16, gap: 12 },
	title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
	infoCard: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	label: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
	value: { fontSize: 14, fontWeight: "500", color: "#111827" },
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
	},
	sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
	catalogButton: {
		backgroundColor: "#7c3aed",
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	catalogButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
	emptyText: { fontSize: 14, color: "#9ca3af", marginTop: 8 },
	listContent: { gap: 10, paddingBottom: 24 },
	partnershipCard: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		gap: 8,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	lotCode: { fontSize: 14, fontWeight: "700", color: "#111827" },
	statusBadge: {
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	statusText: {
		fontSize: 11,
		fontWeight: "600",
		textTransform: "capitalize",
	},
	cardDetails: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	detailLabel: { fontSize: 12, color: "#6b7280" },
	detailValue: { fontSize: 13, fontWeight: "500", color: "#374151" },
	detailValueMono: {
		fontSize: 12,
		fontWeight: "500",
		color: "#374151",
		fontFamily: "monospace",
	},
});

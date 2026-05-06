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
import { useFarmerLots } from "@/features/farmer/use-farmer-lots";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import { WalletAddressCard } from "@/components/wallet-address-card";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
	draft: { bg: "#fef3c7", text: "#92400e" },
	published: { bg: "#d1fae5", text: "#065f46" },
	reserved: { bg: "#dbeafe", text: "#1e40af" },
	in_cycle: { bg: "#e0e7ff", text: "#3730a3" },
	settled: { bg: "#f3e8ff", text: "#6b21a8" },
	cancelled: { bg: "#fee2e2", text: "#991b1b" },
};

export default function FarmerHomeScreen() {
	const { account } = useMobileWallet();
	const { rolePda } = useRole();
	const { lots, isLoading } = useFarmerLots();
	const router = useRouter();

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.container}>
				<Text style={styles.title}>Farmer Dashboard</Text>
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
					<Text style={styles.sectionTitle}>My Lots</Text>
					<TouchableOpacity
						accessibilityLabel="Create lot"
						accessibilityRole="button"
						onPress={() =>
							router.push("/(farmer)/lots/new" as Href)
						}
						style={styles.createButton}
					>
						<Text style={styles.createButtonText}>
							+ Create lot
						</Text>
					</TouchableOpacity>
				</View>

				{isLoading ? (
					<Text style={styles.emptyText}>Loading lots…</Text>
				) : lots.length === 0 ? (
					<Text style={styles.emptyText}>
						No lots yet. Create your first lot to get started.
					</Text>
				) : (
					<FlatList
						data={lots}
						keyExtractor={(item) => item._id}
						renderItem={({ item }) => (
							<LotCard
								lotCode={item.lotCode}
								farmName={item.farmName}
								variety={item.variety}
								status={item.status}
								ticketUsdcCents={item.ticketUsdcCents}
								onPress={() =>
									router.push(
										`/(farmer)/lots/${item.lotCode}/edit` as Href,
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

interface LotCardProps {
	lotCode: string;
	farmName: string;
	variety: string;
	status: string;
	ticketUsdcCents: number;
	onPress: () => void;
}

function LotCard({
	lotCode,
	farmName,
	variety,
	status,
	ticketUsdcCents,
	onPress,
}: LotCardProps) {
	const colors = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
	const ticketDisplay = `$${(ticketUsdcCents / 100).toLocaleString()}`;

	return (
		<TouchableOpacity
			accessibilityLabel={`Lot ${lotCode}`}
			accessibilityRole="button"
			onPress={onPress}
			style={styles.lotCard}
		>
			<View style={styles.lotCardHeader}>
				<Text style={styles.lotCode}>{lotCode}</Text>
				<View
					style={[styles.statusBadge, { backgroundColor: colors.bg }]}
				>
					<Text style={[styles.statusText, { color: colors.text }]}>
						{status}
					</Text>
				</View>
			</View>
			<Text style={styles.lotFarm}>{farmName}</Text>
			<View style={styles.lotDetails}>
				<Text style={styles.lotDetail}>{variety}</Text>
				<Text style={styles.lotDetail}>{ticketDisplay}</Text>
			</View>
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
	createButton: {
		backgroundColor: "#059669",
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	createButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
	emptyText: { fontSize: 14, color: "#9ca3af", marginTop: 8 },
	listContent: { gap: 10, paddingBottom: 24 },
	lotCard: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		gap: 6,
	},
	lotCardHeader: {
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
	lotFarm: { fontSize: 15, fontWeight: "500", color: "#374151" },
	lotDetails: { flexDirection: "row", gap: 12 },
	lotDetail: { fontSize: 13, color: "#6b7280" },
});

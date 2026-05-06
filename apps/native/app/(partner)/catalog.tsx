import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useLotCatalog } from "@/features/partner/use-lot-catalog";

export default function CatalogScreen() {
	const { lots, isLoading } = useLotCatalog();
	const router = useRouter();

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.container}>
				<Text style={styles.title}>Lot Catalog</Text>
				<Text style={styles.subtitle}>
					Browse published lots available for partnership.
				</Text>

				{isLoading ? (
					<Text style={styles.emptyText}>Loading lots…</Text>
				) : lots.length === 0 ? (
					<Text style={styles.emptyText}>
						No published lots available yet.
					</Text>
				) : (
					<FlatList
						data={lots}
						keyExtractor={(item) => item._id}
						renderItem={({ item }) => (
							<CatalogLotCard
								lotCode={item.lotCode}
								farmName={item.farmName}
								variety={item.variety}
								region={item.region}
								country={item.country}
								ticketUsdcCents={item.ticketUsdcCents}
								onPress={() =>
									router.push(
										`/(partner)/lots/${item.lotCode}` as Href,
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

interface CatalogLotCardProps {
	lotCode: string;
	farmName: string;
	variety: string;
	region: string;
	country: string;
	ticketUsdcCents: number;
	onPress: () => void;
}

function CatalogLotCard({
	lotCode,
	farmName,
	variety,
	region,
	country,
	ticketUsdcCents,
	onPress,
}: CatalogLotCardProps) {
	const ticketDisplay = `$${(ticketUsdcCents / 100).toLocaleString()}`;

	return (
		<TouchableOpacity
			accessibilityLabel={`Lot ${lotCode} - ${farmName}`}
			accessibilityRole="button"
			onPress={onPress}
			style={styles.lotCard}
		>
			<View style={styles.cardHeader}>
				<Text style={styles.lotCode}>{lotCode}</Text>
				<Text style={styles.ticket}>{ticketDisplay}</Text>
			</View>
			<Text style={styles.farmName}>{farmName}</Text>
			<View style={styles.cardDetails}>
				<Text style={styles.detail}>{variety}</Text>
				<Text style={styles.detail}>
					{region}, {country}
				</Text>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	container: { flex: 1, padding: 16, gap: 12 },
	title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
	subtitle: { fontSize: 14, color: "#6b7280" },
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
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	lotCode: { fontSize: 14, fontWeight: "700", color: "#111827" },
	ticket: { fontSize: 14, fontWeight: "700", color: "#7c3aed" },
	farmName: { fontSize: 15, fontWeight: "500", color: "#374151" },
	cardDetails: { flexDirection: "row", gap: 12 },
	detail: { fontSize: 13, color: "#6b7280" },
});

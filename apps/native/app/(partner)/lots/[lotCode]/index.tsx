import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { fetchLotByPda } from "@repo/solana-client";
import { ellipsify } from "@/utils/ellipsify";
import { useNetwork } from "@/features/network/use-network";

type VerificationStatus =
	| "loading"
	| "match"
	| "mismatch"
	| "not_found"
	| "error";

export default function PartnerLotDetailScreen() {
	const { lotCode } = useLocalSearchParams<{ lotCode: string }>();
	const { client } = useMobileWallet();
	const { selectedNetwork } = useNetwork();
	const router = useRouter();

	const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");

	const [verificationStatus, setVerificationStatus] =
		useState<VerificationStatus>("loading");
	const [verificationError, setVerificationError] = useState<string | null>(
		null,
	);

	// Verify on-chain lot PDA
	useEffect(() => {
		if (!lot?.lotPda) {
			if (lot !== undefined) {
				setVerificationStatus("not_found");
			}
			return;
		}

		let isActive = true;
		setVerificationStatus("loading");
		setVerificationError(null);

		fetchLotByPda(client.rpc, lot.lotPda as Address)
			.then((onChainLot) => {
				if (!isActive) return;

				if (!onChainLot || !onChainLot.exists) {
					setVerificationStatus("not_found");
					return;
				}

				// Verify key fields match between Convex and on-chain data
				const onChainData = onChainLot.data;
				const ticketMatch =
					Number(onChainData.ticketUsdcCents) === lot.ticketUsdcCents;
				const farmerShareMatch =
					onChainData.farmerShareBps === lot.farmerShareBps;
				const partnerShareMatch =
					onChainData.partnerShareBps === lot.partnerShareBps;

				if (ticketMatch && farmerShareMatch && partnerShareMatch) {
					setVerificationStatus("match");
				} else {
					setVerificationStatus("mismatch");
				}
			})
			.catch((err) => {
				if (!isActive) return;
				console.error("On-chain verification failed:", err);
				setVerificationStatus("error");
				setVerificationError(
					err instanceof Error ? err.message : "Verification failed",
				);
			});

		return () => {
			isActive = false;
		};
	}, [lot, client.rpc, selectedNetwork.id]);

	// Loading state
	if (lot === undefined || !lotCode) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#7c3aed" />
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

	const ticketDisplay = `$${(lot.ticketUsdcCents / 100).toLocaleString()}`;

	return (
		<SafeAreaView style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.title}>{lot.farmName}</Text>
				<Text style={styles.subtitle}>{lot.lotCode}</Text>

				{/* Lot details */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Lot Details</Text>
					<DetailRow label="Variety" value={lot.variety} />
					<DetailRow
						label="Location"
						value={`${lot.region}, ${lot.country}`}
					/>
					<DetailRow
						label="Coordinates"
						value={`${lot.latitude}, ${lot.longitude}`}
					/>
					<DetailRow
						label="Altitude"
						value={`${lot.altitudeMeters}m`}
					/>
					<DetailRow
						label="Area"
						value={`${lot.areaManzanas} manzanas`}
					/>
					<DetailRow label="Ticket" value={ticketDisplay} />
					<DetailRow
						label="Farmer Share"
						value={`${lot.farmerShareBps / 100}%`}
					/>
					<DetailRow
						label="Partner Share"
						value={`${lot.partnerShareBps / 100}%`}
					/>
				</View>

				{/* On-chain info */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>On-Chain Data</Text>
					{lot.lotPda && (
						<DetailRow
							label="Lot PDA"
							value={ellipsify(lot.lotPda)}
							mono
						/>
					)}
					<DetailRow
						label="Farmer Wallet"
						value={ellipsify(lot.farmerWallet)}
						mono
					/>
				</View>

				{/* Verification status */}
				<VerificationBadge
					status={verificationStatus}
					error={verificationError}
				/>

				{/* Reserve button */}
				<TouchableOpacity
					accessibilityLabel="Reserve partnership"
					accessibilityRole="button"
					disabled={verificationStatus !== "match"}
					onPress={() =>
						router.push(
							`/(partner)/lots/${lotCode}/reserve` as Href,
						)
					}
					style={[
						styles.reserveButton,
						verificationStatus !== "match" &&
							styles.reserveButtonDisabled,
					]}
				>
					<Text style={styles.reserveButtonText}>
						Reserve Partnership
					</Text>
				</TouchableOpacity>

				{verificationStatus !== "match" &&
					verificationStatus !== "loading" && (
						<Text style={styles.hintText}>
							On-chain verification must pass before reserving.
						</Text>
					)}
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

function VerificationBadge({
	status,
	error,
}: {
	status: VerificationStatus;
	error: string | null;
}) {
	const config = {
		loading: {
			bg: "#f3f4f6",
			border: "#e5e7eb",
			text: "Verifying on-chain data…",
			textColor: "#6b7280",
			icon: "⏳",
		},
		match: {
			bg: "#ecfdf5",
			border: "#a7f3d0",
			text: "On-chain data verified ✓",
			textColor: "#065f46",
			icon: "✅",
		},
		mismatch: {
			bg: "#fef2f2",
			border: "#fecaca",
			text: "On-chain data mismatch — proceed with caution",
			textColor: "#991b1b",
			icon: "⚠️",
		},
		not_found: {
			bg: "#fffbeb",
			border: "#fcd34d",
			text: "Lot PDA not found on-chain",
			textColor: "#92400e",
			icon: "❓",
		},
		error: {
			bg: "#fef2f2",
			border: "#fecaca",
			text: error ?? "Verification failed",
			textColor: "#991b1b",
			icon: "❌",
		},
	}[status];

	return (
		<View
			style={[
				styles.verificationCard,
				{ backgroundColor: config.bg, borderColor: config.border },
			]}
		>
			{status === "loading" ? (
				<ActivityIndicator size="small" color="#6b7280" />
			) : (
				<Text style={styles.verificationIcon}>{config.icon}</Text>
			)}
			<Text
				style={[styles.verificationText, { color: config.textColor }]}
			>
				{config.text}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	container: { padding: 16, gap: 14, paddingBottom: 40 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	loadingText: { marginTop: 8, fontSize: 14, color: "#6b7280" },
	errorText: { fontSize: 15, color: "#dc2626" },
	title: { fontSize: 22, fontWeight: "bold", color: "#111827" },
	subtitle: { fontSize: 14, color: "#6b7280" },
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
	verificationCard: {
		borderRadius: 8,
		padding: 14,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	verificationIcon: { fontSize: 16 },
	verificationText: { fontSize: 13, fontWeight: "500", flex: 1 },
	reserveButton: {
		backgroundColor: "#7c3aed",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 4,
	},
	reserveButtonDisabled: { opacity: 0.5 },
	reserveButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
	hintText: {
		fontSize: 12,
		color: "#9ca3af",
		textAlign: "center",
	},
});

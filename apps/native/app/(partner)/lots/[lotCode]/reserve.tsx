import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
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
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { fetchPartnerProfileByWallet } from "@repo/solana-client";
import { useTransaction } from "@/hooks/use-transaction";
import { ellipsify } from "@/utils/ellipsify";
import { useNetwork } from "@/features/network/use-network";
import {
	computeReserveData,
	buildReserveInstruction,
	type ReserveFlowResult,
} from "@/features/partner/reserve-flow";

export default function ReservePartnershipScreen() {
	const { lotCode } = useLocalSearchParams<{ lotCode: string }>();
	const { account, client } = useMobileWallet();
	const { selectedNetwork } = useNetwork();
	const router = useRouter();
	const {
		signAndSendWithSigner,
		isPending,
		error: txError,
	} = useTransaction();

	const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
	const createPendingReservation = useMutation(
		api.partnerships.createPendingReservation,
	);
	const recordReservationTx = useMutation(
		api.partnerships.recordReservationTx,
	);

	const [reserveData, setReserveData] = useState<ReserveFlowResult | null>(
		null,
	);
	const [isComputing, setIsComputing] = useState(false);
	const [reservedTx, setReservedTx] = useState<string | null>(null);
	const [hasPartnerProfile, setHasPartnerProfile] = useState<boolean | null>(
		null,
	);
	const [profileCheckError, setProfileCheckError] = useState<string | null>(
		null,
	);

	const wallet = account?.address?.toString() ?? "";

	// Check partner profile exists on-chain
	useEffect(() => {
		if (!wallet) {
			setHasPartnerProfile(null);
			setProfileCheckError(null);
			return;
		}

		let isActive = true;
		setHasPartnerProfile(null);
		setProfileCheckError(null);

		fetchPartnerProfileByWallet(client.rpc, wallet as Address)
			.then((profile) => {
				if (isActive) setHasPartnerProfile(Boolean(profile));
			})
			.catch((err) => {
				if (!isActive) return;
				console.error("Failed to fetch partner profile:", err);
				setHasPartnerProfile(false);
				setProfileCheckError(
					err instanceof Error
						? err.message
						: "Unable to verify partner profile.",
				);
			});

		return () => {
			isActive = false;
		};
	}, [client.rpc, wallet, selectedNetwork.id]);

	// Compute terms hash when lot data is available
	useEffect(() => {
		if (!lot || !lot.lotPda || !wallet) return;
		if (reserveData) return; // already computed

		const compute = async () => {
			setIsComputing(true);
			try {
				const result = await computeReserveData({
					lotPda: lot.lotPda!,
					farmerWallet: lot.farmerWallet,
					partnerWallet: wallet,
					ticketUsdcCents: lot.ticketUsdcCents,
					farmerShareBps: lot.farmerShareBps,
					partnerShareBps: lot.partnerShareBps,
					metadataHash: lot.metadataHash,
					planHash: lot.planHash,
				});
				setReserveData(result);
			} catch (err) {
				console.error("Failed to compute reserve data:", err);
			} finally {
				setIsComputing(false);
			}
		};

		compute();
	}, [lot, wallet, reserveData]);

	const handleReserve = useCallback(async () => {
		if (!reserveData || !lot || !lot.lotPda) return;
		if (!hasPartnerProfile) {
			Alert.alert(
				"Partner Profile Required",
				"Create your on-chain partner profile before reserving a partnership.",
			);
			return;
		}

		try {
			const result = await signAndSendWithSigner(async (signer) => {
				return buildReserveInstruction(
					signer,
					lot.lotPda! as Address,
					reserveData.termsHash,
				);
			});

			// Create pending reservation in Convex
			const partnershipId = await createPendingReservation({
				lotCode: lot.lotCode,
				lotPda: lot.lotPda,
				farmerWallet: lot.farmerWallet,
				partnerWallet: wallet,
				termsHash: reserveData.termsHashHex,
			});

			// Record the transaction
			await recordReservationTx({
				partnershipId,
				partnershipPda: reserveData.partnershipPda.toString(),
				tx: result.signature,
			});

			setReservedTx(result.signature);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Reservation failed";
			Alert.alert("Transaction Failed", message);
		}
	}, [
		reserveData,
		lot,
		wallet,
		hasPartnerProfile,
		signAndSendWithSigner,
		createPendingReservation,
		recordReservationTx,
	]);

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

	// Success state
	if (reservedTx) {
		return (
			<SafeAreaView style={styles.screen}>
				<ScrollView contentContainerStyle={styles.container}>
					<View style={styles.successCard}>
						<Text style={styles.successTitle}>
							🎉 Partnership Reserved!
						</Text>
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Lot</Text>
							<Text style={styles.detailValue}>
								{lot.lotCode}
							</Text>
						</View>
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>
								Partnership PDA
							</Text>
							<Text style={styles.detailValueMono}>
								{reserveData
									? ellipsify(
											reserveData.partnershipPda.toString(),
										)
									: "—"}
							</Text>
						</View>
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Transaction</Text>
							<Text style={styles.detailValueMono}>
								{ellipsify(reservedTx)}
							</Text>
						</View>
					</View>
					<TouchableOpacity
						accessibilityLabel="Back to dashboard"
						accessibilityRole="button"
						onPress={() =>
							router.replace("/(partner)/home" as Href)
						}
						style={styles.backButton}
					>
						<Text style={styles.backButtonText}>
							← Back to Dashboard
						</Text>
					</TouchableOpacity>
				</ScrollView>
			</SafeAreaView>
		);
	}

	const ticketDisplay = `$${(lot.ticketUsdcCents / 100).toLocaleString()}`;
	const isProfileReady = hasPartnerProfile === true;

	return (
		<SafeAreaView style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.title}>Reserve Partnership</Text>
				<Text style={styles.subtitle}>
					Review the terms before signing the reservation transaction.
				</Text>

				{/* Terms summary */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Partnership Terms</Text>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Lot</Text>
						<Text style={styles.detailValue}>{lot.lotCode}</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Farm</Text>
						<Text style={styles.detailValue}>{lot.farmName}</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Ticket</Text>
						<Text style={styles.detailValue}>{ticketDisplay}</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Farmer Share</Text>
						<Text style={styles.detailValue}>
							{lot.farmerShareBps / 100}%
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Partner Share</Text>
						<Text style={styles.detailValue}>
							{lot.partnerShareBps / 100}%
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Farmer Wallet</Text>
						<Text style={styles.detailValueMono}>
							{ellipsify(lot.farmerWallet)}
						</Text>
					</View>
					{lot.lotPda && (
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Lot PDA</Text>
							<Text style={styles.detailValueMono}>
								{ellipsify(lot.lotPda)}
							</Text>
						</View>
					)}
				</View>

				{/* Terms hash */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Terms Hash</Text>
					{isComputing ? (
						<ActivityIndicator size="small" color="#6b7280" />
					) : reserveData ? (
						<>
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Hash</Text>
								<Text style={styles.detailValueMono}>
									{ellipsify(reserveData.termsHashHex, 8)}
								</Text>
							</View>
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>
									Partnership PDA
								</Text>
								<Text style={styles.detailValueMono}>
									{ellipsify(
										reserveData.partnershipPda.toString(),
									)}
								</Text>
							</View>
						</>
					) : (
						<Text style={styles.hashError}>
							Failed to compute terms hash
						</Text>
					)}
				</View>

				{/* Profile check */}
				{hasPartnerProfile === null ? (
					<View style={styles.noticeCard}>
						<ActivityIndicator size="small" color="#6b7280" />
						<Text style={styles.noticeText}>
							Checking on-chain partner profile…
						</Text>
					</View>
				) : hasPartnerProfile === false ? (
					<View style={styles.warningCard}>
						<Text style={styles.warningTitle}>
							Partner profile required
						</Text>
						<Text style={styles.warningText}>
							This wallet does not have the PartnerProfile PDA
							required by reserve_partnership.
						</Text>
						{profileCheckError && (
							<Text style={styles.warningDetail}>
								{profileCheckError}
							</Text>
						)}
						<TouchableOpacity
							accessibilityLabel="Create partner profile"
							accessibilityRole="button"
							onPress={() =>
								router.push("/(partner)/profile" as Href)
							}
							style={styles.profileButton}
						>
							<Text style={styles.profileButtonText}>
								Create Partner Profile
							</Text>
						</TouchableOpacity>
					</View>
				) : null}

				{/* Reserve button */}
				<TouchableOpacity
					accessibilityLabel="Sign and reserve partnership"
					accessibilityRole="button"
					disabled={
						isPending ||
						!reserveData ||
						isComputing ||
						!isProfileReady
					}
					onPress={handleReserve}
					style={[
						styles.reserveButton,
						(isPending ||
							!reserveData ||
							isComputing ||
							!isProfileReady) &&
							styles.reserveButtonDisabled,
					]}
				>
					{isPending ? (
						<ActivityIndicator color="#ffffff" size="small" />
					) : (
						<Text style={styles.reserveButtonText}>
							Sign and Reserve Partnership
						</Text>
					)}
				</TouchableOpacity>

				{txError && (
					<Text style={styles.txErrorText}>{txError.message}</Text>
				)}
			</ScrollView>
		</SafeAreaView>
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
	detailValueMono: {
		fontSize: 12,
		fontWeight: "500",
		color: "#111827",
		fontFamily: "monospace",
	},
	hashError: { fontSize: 13, color: "#dc2626" },
	noticeCard: {
		backgroundColor: "#ffffff",
		borderRadius: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	noticeText: { fontSize: 13, color: "#6b7280" },
	warningCard: {
		backgroundColor: "#fffbeb",
		borderRadius: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: "#fcd34d",
		gap: 8,
	},
	warningTitle: { fontSize: 15, fontWeight: "700", color: "#92400e" },
	warningText: { fontSize: 13, color: "#92400e" },
	warningDetail: { fontSize: 12, color: "#b45309", fontFamily: "monospace" },
	profileButton: {
		backgroundColor: "#92400e",
		borderRadius: 8,
		paddingVertical: 10,
		alignItems: "center",
		marginTop: 4,
	},
	profileButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
	reserveButton: {
		backgroundColor: "#7c3aed",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	reserveButtonDisabled: { opacity: 0.6 },
	reserveButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
	txErrorText: { color: "#dc2626", fontSize: 13, marginTop: 4 },
	successCard: {
		backgroundColor: "#ecfdf5",
		borderRadius: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: "#a7f3d0",
		gap: 10,
	},
	successTitle: { fontSize: 18, fontWeight: "bold", color: "#065f46" },
	backButton: {
		backgroundColor: "#f3f4f6",
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#d1d5db",
	},
	backButtonText: { fontSize: 14, fontWeight: "600", color: "#374151" },
});

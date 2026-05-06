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
import { fetchFarmerProfileByWallet } from "@repo/solana-client";
import { useTransaction } from "@/hooks/use-transaction";
import { ellipsify } from "@/utils/ellipsify";
import {
	computePublishHashes,
	buildPublishInstructions,
	type LotPublishData,
	type PublishFlowResult,
} from "@/features/farmer/publish-flow";
import { useNetwork } from "@/features/network/use-network";

export default function PublishReviewScreen() {
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
	const plan = useQuery(
		api.agronomicPlans.getByLot,
		lotCode ? { lotCode } : "skip",
	);
	const media = useQuery(
		api.lotMedia.listByLot,
		lotCode ? { lotCode } : "skip",
	);
	const sensors = useQuery(
		api.sensorSnapshots.listByLot,
		lotCode ? { lotCode } : "skip",
	);

	const recordOnChainLot = useMutation(api.lots.recordOnChainLot);
	const markPublished = useMutation(api.lots.markPublished);

	const [hashes, setHashes] = useState<PublishFlowResult | null>(null);
	const [isComputing, setIsComputing] = useState(false);
	const [publishedTx, setPublishedTx] = useState<string | null>(null);
	const [hasFarmerProfile, setHasFarmerProfile] = useState<boolean | null>(
		null,
	);
	const [profileCheckError, setProfileCheckError] = useState<string | null>(
		null,
	);

	const wallet = account?.address?.toString() ?? "";

	useEffect(() => {
		if (!wallet) {
			setHasFarmerProfile(null);
			setProfileCheckError(null);
			return;
		}

		let isActive = true;
		setHasFarmerProfile(null);
		setProfileCheckError(null);

		fetchFarmerProfileByWallet(client.rpc, wallet as Address)
			.then((profile) => {
				if (isActive) setHasFarmerProfile(Boolean(profile));
			})
			.catch((err) => {
				if (!isActive) return;
				console.error("Failed to fetch farmer profile:", err);
				setHasFarmerProfile(false);
				setProfileCheckError(
					err instanceof Error
						? err.message
						: "Unable to verify farmer profile.",
				);
			});

		return () => {
			isActive = false;
		};
	}, [client.rpc, wallet, selectedNetwork.id]);

	// Compute hashes when all data is loaded
	useEffect(() => {
		if (!lot || !lotCode || !wallet) return;
		if (hashes) return; // already computed

		const compute = async () => {
			setIsComputing(true);
			try {
				const lotData: LotPublishData = {
					lotCode: lot.lotCode,
					farmName: lot.farmName,
					farmerWallet: wallet,
					country: lot.country,
					region: lot.region,
					latitude: lot.latitude,
					longitude: lot.longitude,
					altitudeMeters: lot.altitudeMeters,
					variety: lot.variety,
					areaManzanas: lot.areaManzanas,
					ticketUsdcCents: lot.ticketUsdcCents,
					farmerShareBps: lot.farmerShareBps,
					partnerShareBps: lot.partnerShareBps,
				};

				const mediaItems = (media ?? []).map((m) => ({
					storageId: m.storageId,
					kind: m.kind,
					hash: m.hash,
				}));

				const sensorSnapshots = (sensors ?? []).map((s) => ({
					source: s.source,
					temperatureC: s.temperatureC ?? undefined,
					humidityPct: s.humidityPct ?? undefined,
					soilPh: s.soilPh ?? undefined,
					soilMoisturePct: s.soilMoisturePct ?? undefined,
					hash: s.hash,
				}));

				const result = await computePublishHashes(
					lotData,
					plan
						? { planId: plan.planId, planJson: plan.planJson }
						: null,
					mediaItems,
					sensorSnapshots,
				);

				setHashes(result);
			} catch (err) {
				console.error("Failed to compute hashes:", err);
			} finally {
				setIsComputing(false);
			}
		};

		compute();
	}, [lot, plan, media, sensors, lotCode, wallet, hashes]);

	const handlePublish = useCallback(async () => {
		if (!hashes || !lot) return;
		if (!hasFarmerProfile) {
			Alert.alert(
				"Farmer Profile Required",
				"Create your on-chain farmer profile before publishing a lot.",
			);
			return;
		}

		try {
			const result = await signAndSendWithSigner(async (signer) => {
				const instructions = await buildPublishInstructions(
					signer,
					hashes.lotPda,
					hashes.lotIdHash,
					hashes.metadataHash,
					hashes.planHash,
					hashes.mediaManifestHash,
					hashes.sensorManifestHash,
					lot.ticketUsdcCents,
					lot.farmerShareBps,
					lot.partnerShareBps,
				);
				return instructions;
			});

			// Record on-chain lot PDA
			await recordOnChainLot({
				lotCode: lot.lotCode,
				lotPda: hashes.lotPda.toString(),
				tx: result.signature,
			});

			// Mark as published with hashes
			await markPublished({
				lotCode: lot.lotCode,
				tx: result.signature,
				metadataHash: hashes.metadataHashHex,
				planHash: hashes.planHashHex,
				mediaManifestHash: hashes.mediaManifestHashHex,
				sensorManifestHash: hashes.sensorManifestHashHex,
			});

			setPublishedTx(result.signature);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Publish failed";
			Alert.alert("Transaction Failed", message);
		}
	}, [
		hashes,
		lot,
		hasFarmerProfile,
		signAndSendWithSigner,
		recordOnChainLot,
		markPublished,
	]);

	// Loading state
	if (lot === undefined || !lotCode) {
		return (
			<SafeAreaView style={styles.screen}>
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#059669" />
					<Text style={styles.loadingText}>Loading lot data…</Text>
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

	// Already published
	if (publishedTx) {
		return (
			<SafeAreaView style={styles.screen}>
				<ScrollView contentContainerStyle={styles.container}>
					<View style={styles.successCard}>
						<Text style={styles.successTitle}>
							🎉 Lot Published On-Chain!
						</Text>
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Lot Code</Text>
							<Text style={styles.detailValue}>
								{lot.lotCode}
							</Text>
						</View>
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Lot PDA</Text>
							<Text style={styles.detailValueMono}>
								{hashes
									? ellipsify(hashes.lotPda.toString())
									: "—"}
							</Text>
						</View>
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Transaction</Text>
							<Text style={styles.detailValueMono}>
								{ellipsify(publishedTx)}
							</Text>
						</View>
					</View>
					<TouchableOpacity
						accessibilityLabel="Back to dashboard"
						accessibilityRole="button"
						onPress={() => router.back()}
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
	const isProfileReady = hasFarmerProfile === true;

	return (
		<SafeAreaView style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.title}>Publish Review</Text>
				<Text style={styles.subtitle}>
					Review your lot details before publishing on-chain.
				</Text>

				{/* Lot summary */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Lot Summary</Text>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Network</Text>
						<Text style={styles.detailValue}>
							{selectedNetwork.label}
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Code</Text>
						<Text style={styles.detailValue}>{lot.lotCode}</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Farm</Text>
						<Text style={styles.detailValue}>{lot.farmName}</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Variety</Text>
						<Text style={styles.detailValue}>{lot.variety}</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Location</Text>
						<Text style={styles.detailValue}>
							{lot.region}, {lot.country}
						</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Ticket</Text>
						<Text style={styles.detailValue}>{ticketDisplay}</Text>
					</View>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Split</Text>
						<Text style={styles.detailValue}>
							Farmer {lot.farmerShareBps / 100}% / Partner{" "}
							{lot.partnerShareBps / 100}%
						</Text>
					</View>
				</View>

				{/* Hash preview */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Manifest Hashes</Text>
					{isComputing ? (
						<ActivityIndicator size="small" color="#6b7280" />
					) : hashes ? (
						<>
							<HashRow
								label="Metadata"
								hash={hashes.metadataHashHex}
							/>
							<HashRow label="Plan" hash={hashes.planHashHex} />
							<HashRow
								label="Media"
								hash={hashes.mediaManifestHashHex}
							/>
							<HashRow
								label="Sensor"
								hash={hashes.sensorManifestHashHex}
							/>
							<View style={styles.detailRow}>
								<Text style={styles.detailLabel}>Lot PDA</Text>
								<Text style={styles.detailValueMono}>
									{ellipsify(hashes.lotPda.toString())}
								</Text>
							</View>
						</>
					) : (
						<Text style={styles.hashError}>
							Failed to compute hashes
						</Text>
					)}
				</View>

				{hasFarmerProfile === null ? (
					<View style={styles.noticeCard}>
						<ActivityIndicator size="small" color="#6b7280" />
						<Text style={styles.noticeText}>
							Checking on-chain farmer profile…
						</Text>
					</View>
				) : hasFarmerProfile === false ? (
					<View style={styles.warningCard}>
						<Text style={styles.warningTitle}>
							Farmer profile required
						</Text>
						<Text style={styles.warningText}>
							This wallet does not have the FarmerProfile PDA
							required by create_lot.
						</Text>
						{profileCheckError && (
							<Text style={styles.warningDetail}>
								{profileCheckError}
							</Text>
						)}
						<TouchableOpacity
							accessibilityLabel="Create farmer profile"
							accessibilityRole="button"
							onPress={() =>
								router.push("/(farmer)/profile" as Href)
							}
							style={styles.profileButton}
						>
							<Text style={styles.profileButtonText}>
								Create Farmer Profile
							</Text>
						</TouchableOpacity>
					</View>
				) : null}

				{/* Publish button */}
				<TouchableOpacity
					accessibilityLabel="Sign and publish lot"
					accessibilityRole="button"
					disabled={
						isPending || !hashes || isComputing || !isProfileReady
					}
					onPress={handlePublish}
					style={[
						styles.publishButton,
						(isPending ||
							!hashes ||
							isComputing ||
							!isProfileReady) &&
							styles.publishButtonDisabled,
					]}
				>
					{isPending ? (
						<ActivityIndicator color="#ffffff" size="small" />
					) : (
						<Text style={styles.publishButtonText}>
							Sign and Publish On-Chain
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

function HashRow({ label, hash }: { label: string; hash: string }) {
	return (
		<View style={styles.detailRow}>
			<Text style={styles.detailLabel}>{label}</Text>
			<Text style={styles.detailValueMono}>{ellipsify(hash, 8)}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f9fafb" },
	container: { padding: 16, gap: 14, paddingBottom: 40 },
	centered: { flex: 1, justifyContent: "center", alignItems: "center" },
	loadingText: { marginTop: 8, fontSize: 14, color: "#6b7280" },
	errorText: { fontSize: 15, color: "#dc2626" },
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
	publishButton: {
		backgroundColor: "#7c3aed",
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	publishButtonDisabled: { opacity: 0.6 },
	publishButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
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

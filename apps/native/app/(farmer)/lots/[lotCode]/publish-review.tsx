import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { fetchFarmerProfileByWallet } from "@repo/solana-client";
import {
	ActionBar,
	Badge,
	Banner,
	Button,
	Card,
	CollapsibleSection,
	DetailRow,
	MetricCard,
	Screen,
	ScreenHeader,
	Section,
	StatusPill,
	TxStatus,
} from "@/components/ui";
import { AiChatPanel } from "@/features/agent/ai-chat-panel";
import {
	buildPublishInstructions,
	computePublishHashes,
	type LotPublishData,
	type PublishFlowResult,
} from "@/features/farmer/publish-flow";
import { useNetwork } from "@/features/network/use-network";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function PublishReviewScreen() {
	const { lotCode } = useLocalSearchParams<{ lotCode: string }>();
	const { account, client } = useMobileWallet();
	const { selectedNetwork } = useNetwork();
	const router = useRouter();
	const { theme } = useTheme();
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
		if (!wallet || lot?.status !== "draft") {
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
	}, [client.rpc, wallet, selectedNetwork.id, lot?.status]);

	useEffect(() => {
		if (!lot || !lotCode || !wallet) return;
		if (hashes) return;

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
		if (lot.status !== "draft") {
			Alert.alert(
				"Publish Unavailable",
				`This lot is already ${formatLotStatus(lot.status)} and cannot be published again.`,
			);
			return;
		}
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

			await recordOnChainLot({
				lotCode: lot.lotCode,
				lotPda: hashes.lotPda.toString(),
				tx: result.signature,
			});

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

	if (lot === undefined || !lotCode) {
		return (
			<Screen
				contentContainerStyle={{
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<ActivityIndicator
					color={theme.colors.action.primary.background}
					size="large"
				/>
				<Text
					style={[
						theme.typography.bodyMd,
						{ color: theme.colors.text.secondary },
					]}
				>
					Loading lot data...
				</Text>
			</Screen>
		);
	}

	if (!lot) {
		return (
			<Screen
				contentContainerStyle={{
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Banner
					tone="error"
					title="Lot not found"
					description={`No lot was found for ${lotCode}.`}
				/>
			</Screen>
		);
	}

	const ticketDisplay = `$${(lot.ticketUsdcCents / 100).toLocaleString()}`;
	const isDraft = lot.status === "draft";
	const isProfileReady = hasFarmerProfile === true;
	const canPublish = isDraft && isProfileReady;
	const formattedStatus = formatLotStatus(lot.status);

	if (publishedTx) {
		return (
			<Screen
				scrollable
				contentContainerStyle={{ gap: theme.spacing.lg }}
			>
				<Animated.View entering={FadeInDown.duration(250)}>
					<ScreenHeader
						showBack
						eyebrow="Published"
						title="Lot is on-chain"
					/>
				</Animated.View>

				<Animated.View entering={FadeIn.delay(50).duration(200)}>
					<TxStatus
						state="confirmed"
						signature={ellipsify(publishedTx)}
					/>
				</Animated.View>

				<Animated.View entering={FadeInUp.delay(75).duration(250)}>
					<Card variant="success">
						<DetailRow label="Lot code" value={lot.lotCode} />
						<DetailRow
							label="Lot PDA"
							value={
								hashes
									? ellipsify(hashes.lotPda.toString())
									: "-"
							}
							mono
							valueTone="secondary"
						/>
						<DetailRow
							label="Transaction"
							value={ellipsify(publishedTx)}
							mono
							valueTone="secondary"
						/>
					</Card>
				</Animated.View>

				<ActionBar>
					<Button
						title="Back to Dashboard"
						variant="secondary"
						onPress={() => router.back()}
					/>
				</ActionBar>
			</Screen>
		);
	}

	return (
		<Screen scrollable contentContainerStyle={{ gap: theme.spacing.lg }}>
			{/* Header */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow={lot.lotCode}
					title={isDraft ? "Publish review" : "Published record"}
					trailing={
						<Badge
							label={formattedStatus}
							tone={isDraft ? "brand" : "success"}
						/>
					}
				/>
			</Animated.View>

			{/* Status — minimal */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: theme.spacing.sm,
					}}
				>
					<StatusPill label={selectedNetwork.label} tone="accent" />
					{isDraft && hasFarmerProfile !== null ? (
						<StatusPill
							label={
								isProfileReady
									? "Profile ready"
									: "Profile needed"
							}
							tone={isProfileReady ? "success" : "warning"}
						/>
					) : null}
				</View>
			</Animated.View>

			{!isDraft ? (
				<Banner
					tone="info"
					title="Read-only"
					description={`This lot is ${formattedStatus}. Publishing is locked.`}
				/>
			) : null}

			{/* Key terms — 2 cards */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
					<MetricCard
						label="Ticket"
						value={ticketDisplay}
						helper={lot.farmName}
						eyebrow="Value"
						tone="farmer"
						style={{ flex: 1 }}
					/>
					<MetricCard
						label="Split"
						value={`${lot.farmerShareBps / 100}/${lot.partnerShareBps / 100}`}
						helper="Farmer / Partner %"
						eyebrow="Revenue"
						tone="success"
						style={{ flex: 1 }}
					/>
				</View>
			</Animated.View>

			{/* Lot details — compact card */}
			<Animated.View entering={FadeInUp.delay(90).duration(250)}>
				<Card variant="muted">
					<DetailRow label="Lot code" value={lot.lotCode} />
					<DetailRow label="Farm" value={lot.farmName} />
					<DetailRow label="Variety" value={lot.variety} />
					<DetailRow
						label="Location"
						value={`${lot.region}, ${lot.country}`}
					/>
					<DetailRow label="Area" value={`${lot.areaManzanas} mz`} />
				</Card>
			</Animated.View>

			{/* Digital manifests — collapsed since most users don't need to inspect hashes */}
			<Animated.View entering={FadeInUp.delay(100).duration(250)}>
				<CollapsibleSection
					title="Digital manifests"
					subtitle="Derived hashes and PDA"
					aside={
						isComputing ? (
							<ActivityIndicator size="small" />
						) : hashes ? (
							<Badge label="Computed" tone="success" />
						) : (
							<Badge label="Failed" tone="warning" />
						)
					}
				>
					{hashes ? (
						<Card variant="muted">
							<DetailRow
								label="Metadata"
								value={ellipsify(hashes.metadataHashHex, 8)}
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Plan"
								value={ellipsify(hashes.planHashHex, 8)}
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Media"
								value={ellipsify(
									hashes.mediaManifestHashHex,
									8,
								)}
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Sensor"
								value={ellipsify(
									hashes.sensorManifestHashHex,
									8,
								)}
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Lot PDA"
								value={ellipsify(hashes.lotPda.toString())}
								mono
								valueTone="secondary"
							/>
						</Card>
					) : !isComputing ? (
						<Banner
							tone="error"
							title="Hash computation failed"
							description="Could not derive the required manifests."
						/>
					) : null}
				</CollapsibleSection>
			</Animated.View>

			{/* AI assistant */}
			{wallet ? (
				<Animated.View entering={FadeInUp.delay(110).duration(200)}>
					<AiChatPanel
						wallet={wallet}
						role="farmer"
						lotCode={lot.lotCode}
						description="Ask about readiness before signing."
					/>
				</Animated.View>
			) : null}

			{/* Profile readiness */}
			{isDraft ? (
				<Animated.View entering={FadeInUp.delay(120).duration(250)}>
					{hasFarmerProfile === null ? (
						<Banner
							tone="info"
							title="Checking farmer profile"
							description="Verifying wallet has the required FarmerProfile PDA."
							accessory={<ActivityIndicator size="small" />}
						/>
					) : hasFarmerProfile === false ? (
						<Banner
							tone="warning"
							title="Farmer profile required"
							description="Create your on-chain profile before publishing."
						>
							<Button
								title="Create Farmer Profile"
								variant="accent"
								onPress={() =>
									router.push("/(farmer)/profile" as Href)
								}
							/>
						</Banner>
					) : null}
				</Animated.View>
			) : null}

			{/* Action */}
			<ActionBar>
				{isDraft ? (
					<Button
						title="Sign and Publish"
						onPress={handlePublish}
						disabled={
							isPending || !hashes || isComputing || !canPublish
						}
						loading={isPending}
					/>
				) : (
					<Button
						title="Back to Lot"
						variant="secondary"
						onPress={() => router.back()}
					/>
				)}
			</ActionBar>

			{isPending ? <TxStatus state="pending" /> : null}
			{txError ? (
				<TxStatus state="failed" errorMessage={txError.message} />
			) : null}
		</Screen>
	);
}

function formatLotStatus(status: string) {
	return status.replace(/_/g, " ");
}

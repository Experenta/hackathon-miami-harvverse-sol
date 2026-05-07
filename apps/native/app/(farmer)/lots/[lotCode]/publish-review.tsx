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
	const farmerShare = `${lot.farmerShareBps / 100}%`;
	const partnerShare = `${lot.partnerShareBps / 100}%`;
	const isDraft = lot.status === "draft";
	const isProfileReady = hasFarmerProfile === true;
	const canPublish = isDraft && isProfileReady;
	const formattedStatus = formatLotStatus(lot.status);

	if (publishedTx) {
		return (
			<Screen scrollable>
				<Animated.View entering={FadeInDown.duration(250)}>
					<ScreenHeader
						showBack
						eyebrow="Asset published"
						title="Lot is now on-chain"
						subtitle="The asset package was signed, recorded, and linked to its on-chain lot PDA."
					/>
				</Animated.View>

				<Animated.View entering={FadeIn.delay(50).duration(200)}>
					<TxStatus
						state="confirmed"
						signature={ellipsify(publishedTx)}
					/>
				</Animated.View>

				<Animated.View entering={FadeInUp.delay(75).duration(250)}>
					<Section
						title="On-chain record"
						aside={<Badge label="Recorded" tone="success" />}
					>
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
					</Section>
				</Animated.View>

				<Animated.View entering={FadeInUp.delay(50).duration(200)}>
					<ActionBar>
						<Button
							title="Back to Dashboard"
							variant="secondary"
							onPress={() => router.back()}
						/>
					</ActionBar>
				</Animated.View>
			</Screen>
		);
	}

	return (
		<Screen scrollable>
			{/* Hero */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow="Asset review"
					title={isDraft ? "Publish review" : "Published record"}
					subtitle={
						isDraft
							? "Review the lot package before converting this asset into an on-chain record."
							: `This lot is ${formattedStatus} and can no longer create a new on-chain record.`
					}
				/>
			</Animated.View>

			{/* Status pills */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						gap: theme.spacing.sm,
					}}
				>
					<StatusPill label={selectedNetwork.label} tone="accent" />
					<StatusPill
						label={formattedStatus}
						tone={isDraft ? "farmer" : "success"}
					/>
					{isDraft ? (
						<StatusPill
							label={
								isProfileReady
									? "Profile ready"
									: "Profile check"
							}
							tone={isProfileReady ? "success" : "warning"}
						/>
					) : null}
					<Badge label="Farmer flow" tone="brand" />
				</View>
			</Animated.View>

			{!isDraft ? (
				<Animated.View entering={FadeIn.delay(75).duration(200)}>
					<Banner
						tone="info"
						title="Publishing locked"
						description={`Only draft lots can be published. This lot is already ${formattedStatus}, so the review is read-only.`}
					/>
				</Animated.View>
			) : null}

			{/* Asset snapshot */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<Section
					title="Asset snapshot"
					description="Financial and share terms that will feed the publish instruction."
				>
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: theme.spacing.sm,
						}}
					>
						<MetricCard
							label="Ticket value"
							value={ticketDisplay}
							helper={`${lot.areaManzanas} manzanas`}
							eyebrow="Primary lot"
							tone="farmer"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							label="Farmer share"
							value={farmerShare}
							helper="Revenue participation"
							tone="success"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							label="Partner share"
							value={partnerShare}
							helper="Reserved for partner economics"
							tone="partner"
							style={{ minWidth: 160 }}
						/>
					</View>
				</Section>
			</Animated.View>

			{/* Lot asset details */}
			<Animated.View entering={FadeInUp.delay(50).duration(250)}>
				<Section
					title="Lot asset"
					description="Human-readable fields stay primary before signing."
					aside={<Badge label={lot.variety} tone="neutral" />}
				>
					<Card variant="selected">
						<DetailRow label="Lot code" value={lot.lotCode} />
						<DetailRow label="Farm" value={lot.farmName} />
						<DetailRow label="Variety" value={lot.variety} />
						<DetailRow
							label="Location"
							value={`${lot.region}, ${lot.country}`}
						/>
						<DetailRow
							label="Coordinates"
							value={`${lot.latitude}, ${lot.longitude}`}
							valueTone="secondary"
						/>
					</Card>
				</Section>
			</Animated.View>

			{/* Digital manifests */}
			<Animated.View entering={FadeInUp.delay(250).duration(250)}>
				<Section
					title="Digital manifests"
					description="Hashes, PDA, and derived identifiers."
					aside={<Badge label="Derived" tone="info" />}
				>
					{isComputing ? (
						<Banner
							tone="info"
							title="Computing publish manifests"
							description="Metadata, plan, media, and sensor manifests are being derived."
							accessory={<ActivityIndicator size="small" />}
						/>
					) : hashes ? (
						<Card variant="muted">
							<DetailRow
								label="Metadata hash"
								value={ellipsify(hashes.metadataHashHex, 8)}
								helper="Lot metadata manifest"
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Plan hash"
								value={ellipsify(hashes.planHashHex, 8)}
								helper="Agronomic plan payload"
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Media hash"
								value={ellipsify(
									hashes.mediaManifestHashHex,
									8,
								)}
								helper="Media manifest"
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Sensor hash"
								value={ellipsify(
									hashes.sensorManifestHashHex,
									8,
								)}
								helper="Sensor manifest"
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
					) : (
						<Banner
							tone="error"
							title="Failed to compute manifests"
							description="The publish review could not derive the required hashes."
						/>
					)}
				</Section>
			</Animated.View>

			{wallet ? (
				<Animated.View entering={FadeInUp.delay(120).duration(250)}>
					<AiChatPanel
						wallet={wallet}
						role="farmer"
						lotCode={lot.lotCode}
						description="Ask about readiness, hashes, and lot details before signing."
					/>
				</Animated.View>
			) : null}

			{/* Publish readiness */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<Section title="Publish readiness">
					{!isDraft ? (
						<Banner
							tone="success"
							title="Already published"
							description="This lot has already left draft status, so no additional publish transaction is available."
						/>
					) : hasFarmerProfile === null ? (
						<Banner
							tone="info"
							title="Checking farmer profile"
							description="Verifying that the connected wallet already owns the required FarmerProfile PDA."
							accessory={<ActivityIndicator size="small" />}
						/>
					) : hasFarmerProfile === false ? (
						<Banner
							tone="warning"
							title="Farmer profile required"
							description="This wallet does not have the FarmerProfile PDA required by create_lot."
						>
							{profileCheckError ? (
								<DetailRow
									label="Check detail"
									value={ellipsify(profileCheckError, 24)}
									mono
									valueTone="secondary"
								/>
							) : null}
							<Button
								title="Create Farmer Profile"
								variant="accent"
								onPress={() =>
									router.push("/(farmer)/profile" as Href)
								}
							/>
						</Banner>
					) : (
						<Banner
							tone="success"
							title="Farmer profile verified"
							description="The wallet is eligible to sign the publish transaction."
						/>
					)}
				</Section>
			</Animated.View>

			{/* Action */}
			<Animated.View entering={FadeInUp.delay(350).duration(200)}>
				<ActionBar>
					{isDraft ? (
						<Button
							title="Sign and Publish On-Chain"
							onPress={handlePublish}
							disabled={
								isPending ||
								!hashes ||
								isComputing ||
								!canPublish
							}
							loading={isPending}
						/>
					) : (
						<Button
							title="Back to Lot Details"
							variant="secondary"
							onPress={() => router.back()}
						/>
					)}
				</ActionBar>
			</Animated.View>

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

import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
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
import { fetchLotByPda, LotStatus } from "@repo/solana-client";
import {
	ActionBar,
	Badge,
	Banner,
	Button,
	Card,
	DetailRow,
	ListItemCard,
	MetricCard,
	Screen,
	ScreenHeader,
	Section,
	StatusPill,
} from "@/components/ui";
import { AiChatPanel } from "@/features/agent/ai-chat-panel";
import { useNetwork } from "@/features/network/use-network";
import {
	formatLotStatusLabel,
	getReserveBlockedReason,
	isReservableLotStatus,
	mapOnChainLotStatusToApp,
} from "@/features/partner/lot-status";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

type VerificationStatus =
	| "loading"
	| "match"
	| "mismatch"
	| "not_found"
	| "error";

export default function PartnerLotDetailScreen() {
	const { lotCode } = useLocalSearchParams<{ lotCode: string }>();
	const { account, client } = useMobileWallet();
	const { selectedNetwork } = useNetwork();
	const { theme } = useTheme();
	const router = useRouter();
	const wallet = account?.address?.toString() ?? "";

	const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
	const syncStatusFromChain = useMutation(api.lots.syncStatusFromChain);

	const [verificationStatus, setVerificationStatus] =
		useState<VerificationStatus>("loading");
	const [verificationError, setVerificationError] = useState<string | null>(
		null,
	);
	const [liveLotStatus, setLiveLotStatus] = useState<LotStatus | null>(null);

	useEffect(() => {
		if (!lot?.lotPda) {
			if (lot !== undefined) {
				setVerificationStatus("not_found");
				setLiveLotStatus(null);
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
					setLiveLotStatus(null);
					return;
				}

				const onChainData = onChainLot.data;
				const nextStatus = onChainData.status;
				setLiveLotStatus(nextStatus);

				const mirroredStatus = mapOnChainLotStatusToApp(nextStatus);
				if (lot.status !== mirroredStatus) {
					void syncStatusFromChain({
						lotCode: lot.lotCode,
						status: mirroredStatus,
					}).catch((err) => {
						console.error(
							"Failed to sync lot status from chain:",
							err,
						);
					});
				}

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
				setLiveLotStatus(null);
				setVerificationError(
					err instanceof Error ? err.message : "Verification failed",
				);
			});

		return () => {
			isActive = false;
		};
	}, [lot, client.rpc, selectedNetwork.id, syncStatusFromChain]);

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
					Loading lot...
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
	const verificationMeta = getVerificationMeta(
		verificationStatus,
		verificationError,
	);
	const liveStatusLabel =
		liveLotStatus === null
			? null
			: formatLotStatusLabel(mapOnChainLotStatusToApp(liveLotStatus));
	const convexStatusLabel = formatLotStatusLabel(lot.status);
	const canReserve =
		verificationStatus === "match" && isReservableLotStatus(liveLotStatus);
	const reserveBlockedMessage =
		verificationStatus !== "match"
			? "On-chain verification must pass before reserving."
			: getReserveBlockedReason(liveLotStatus);
	const isStatusOutOfSync =
		liveLotStatus !== null &&
		mapOnChainLotStatusToApp(liveLotStatus) !== lot.status;

	return (
		<Screen scrollable>
			{/* Hero */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow="Verified asset"
					title={lot.farmName}
					subtitle={`Lot ${lot.lotCode} — verifiable agricultural asset ready for partnership.`}
					trailing={<Badge label={lot.variety} tone="partner" />}
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
					<StatusPill
						label={verificationMeta.pillLabel}
						tone={verificationMeta.pillTone}
					/>
					<StatusPill label={selectedNetwork.label} tone="accent" />
					<StatusPill label={convexStatusLabel} tone="info" />
					{liveStatusLabel ? (
						<StatusPill
							label={`Live: ${liveStatusLabel}`}
							tone={
								isReservableLotStatus(liveLotStatus)
									? "success"
									: "warning"
							}
						/>
					) : null}
				</View>
			</Animated.View>

			{/* Asset snapshot metrics */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<Section
					title="Asset snapshot"
					description="Key commercial terms and geography surface first."
				>
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: theme.spacing.sm,
						}}
					>
						<MetricCard
							tone="partner"
							eyebrow="Ticket"
							label="Opportunity size"
							value={ticketDisplay}
							helper={lot.farmName}
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							tone="success"
							eyebrow="Farmer"
							label="Farmer share"
							value={`${lot.farmerShareBps / 100}%`}
							helper="Producer allocation"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							tone="info"
							eyebrow="Partner"
							label="Partner share"
							value={`${lot.partnerShareBps / 100}%`}
							helper="Investor participation"
							style={{ minWidth: 160 }}
						/>
					</View>
				</Section>
			</Animated.View>

			{/* Asset identity card */}
			<Animated.View entering={FadeInUp.delay(50).duration(250)}>
				<Section
					title="Asset identity"
					description="The lot reads as a trackable asset with human and cryptographic anchors."
				>
					<ListItemCard
						disabled
						tone="partner"
						eyebrow={lot.lotCode}
						title={lot.farmName}
						subtitle={`${lot.variety} asset from ${lot.region}, ${lot.country}`}
						status={{
							label: verificationMeta.cardStatusLabel,
							tone: verificationMeta.pillTone,
						}}
						highlight={{
							label: "Area",
							value: `${trimNumber(lot.areaManzanas)} manzanas`,
						}}
						badges={[
							{ label: lot.variety, tone: "partner" },
							{ label: `${lot.altitudeMeters}m`, tone: "info" },
						]}
						details={[
							{
								label: "Location",
								value: `${lot.region}, ${lot.country}`,
							},
							{
								label: "Coordinates",
								value: `${lot.latitude}, ${lot.longitude}`,
							},
						]}
					/>
				</Section>
			</Animated.View>

			{/* Verification record */}
			<Animated.View entering={FadeInUp.delay(250).duration(250)}>
				<Section
					title="Verification record"
					description="Supporting data confirms whether the mirrored lot matches its on-chain representation."
					aside={<Badge label="On-chain check" tone="info" />}
				>
					{isStatusOutOfSync ? (
						<Banner
							tone="warning"
							title="Lot state changed on-chain"
							description={`Convex shows ${convexStatusLabel}, but the live account is ${liveStatusLabel}. Reservation uses the on-chain state.`}
						/>
					) : null}
					<Banner
						tone={verificationMeta.bannerTone}
						title={verificationMeta.title}
						description={verificationMeta.description}
						eyebrow="Asset verification"
						accessory={
							verificationStatus === "loading" ? (
								<ActivityIndicator size="small" />
							) : undefined
						}
					/>
					<Card variant={verificationMeta.cardVariant}>
						<DetailRow
							label="Lot PDA"
							value={
								lot.lotPda
									? ellipsify(lot.lotPda)
									: "Not recorded"
							}
							mono
							valueTone="secondary"
						/>
						<DetailRow
							label="Farmer wallet"
							value={ellipsify(lot.farmerWallet)}
							mono
							valueTone="secondary"
						/>
						<DetailRow
							label="Verification"
							value={verificationMeta.detailValue}
							valueTone="secondary"
						/>
						<DetailRow
							label="Live status"
							value={liveStatusLabel ?? "Unknown"}
							valueTone="secondary"
						/>
					</Card>
				</Section>
			</Animated.View>

			{/* AI assistant */}
			{wallet ? (
				<Animated.View entering={FadeInUp.delay(90).duration(200)}>
					<AiChatPanel
						wallet={wallet}
						role="partner"
						lotCode={lot.lotCode}
						description="Ask about this lot before reserving."
					/>
				</Animated.View>
			) : null}

			{/* Action */}
			<Animated.View entering={FadeInUp.delay(75).duration(200)}>
				<ActionBar>
					<Button
						title="Reserve Partnership"
						variant="accent"
						disabled={!canReserve}
						onPress={() =>
							router.push(
								`/(partner)/lots/${lotCode}/reserve` as Href,
							)
						}
					/>
					{!canReserve && verificationStatus !== "loading" ? (
						<Text
							style={[
								theme.typography.caption,
								{
									color: theme.colors.text.muted,
									textAlign: "center",
								},
							]}
						>
							{reserveBlockedMessage}
						</Text>
					) : null}
				</ActionBar>
			</Animated.View>
		</Screen>
	);
}

function getVerificationMeta(status: VerificationStatus, error: string | null) {
	switch (status) {
		case "match":
			return {
				title: "On-chain data verified",
				description:
					"Ticket and revenue split fields match the on-chain asset record.",
				detailValue: "Match",
				pillLabel: "Verified",
				cardStatusLabel: "Asset verified",
				pillTone: "success" as const,
				bannerTone: "success" as const,
				cardVariant: "success" as const,
			};
		case "mismatch":
			return {
				title: "On-chain data mismatch",
				description:
					"At least one mirrored lot field differs from the on-chain asset record.",
				detailValue: "Mismatch",
				pillLabel: "Mismatch",
				cardStatusLabel: "Review required",
				pillTone: "warning" as const,
				bannerTone: "warning" as const,
				cardVariant: "warning" as const,
			};
		case "not_found":
			return {
				title: "Lot PDA not found on-chain",
				description:
					"The app could not locate a live on-chain asset record for this lot PDA.",
				detailValue: "Not found",
				pillLabel: "Missing proof",
				cardStatusLabel: "Proof missing",
				pillTone: "warning" as const,
				bannerTone: "warning" as const,
				cardVariant: "warning" as const,
			};
		case "error":
			return {
				title: "Verification failed",
				description: error ?? "The on-chain verification check failed.",
				detailValue: "Error",
				pillLabel: "Check failed",
				cardStatusLabel: "Check failed",
				pillTone: "error" as const,
				bannerTone: "error" as const,
				cardVariant: "default" as const,
			};
		case "loading":
		default:
			return {
				title: "Verifying on-chain asset",
				description:
					"The lot PDA is being checked against its live on-chain representation.",
				detailValue: "In progress",
				pillLabel: "Verifying",
				cardStatusLabel: "Verification running",
				pillTone: "info" as const,
				bannerTone: "info" as const,
				cardVariant: "info" as const,
			};
	}
}

function trimNumber(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

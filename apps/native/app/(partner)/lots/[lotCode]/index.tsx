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
	CollapsibleSection,
	DetailRow,
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
		<Screen scrollable contentContainerStyle={{ gap: theme.spacing.lg }}>
			{/* Hero */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow={lot.lotCode}
					title={lot.farmName}
					trailing={<Badge label={lot.variety} tone="partner" />}
				/>
			</Animated.View>

			{/* Status row — only the most critical pills */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: theme.spacing.sm,
					}}
				>
					<StatusPill
						label={verificationMeta.pillLabel}
						tone={verificationMeta.pillTone}
					/>
					{liveStatusLabel ? (
						<StatusPill
							label={liveStatusLabel}
							tone={
								isReservableLotStatus(liveLotStatus)
									? "success"
									: "warning"
							}
						/>
					) : (
						<StatusPill label={convexStatusLabel} tone="info" />
					)}
				</View>
			</Animated.View>

			{/* Primary metrics — ticket + split */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
					<MetricCard
						tone="partner"
						eyebrow="Ticket"
						label="Opportunity"
						value={ticketDisplay}
						helper={`${lot.region}, ${lot.country}`}
						style={{ flex: 1 }}
					/>
					<MetricCard
						tone="success"
						eyebrow="Split"
						label="Revenue share"
						value={`${lot.farmerShareBps / 100}/${lot.partnerShareBps / 100}`}
						helper="Farmer / Partner %"
						style={{ flex: 1 }}
					/>
				</View>
			</Animated.View>

			{/* Sync warning if needed */}
			{isStatusOutOfSync ? (
				<Banner
					tone="warning"
					title="Status out of sync"
					description={`Database shows ${convexStatusLabel}, live chain shows ${liveStatusLabel}.`}
				/>
			) : null}

			{/* Verification banner — concise */}
			<Animated.View entering={FadeInUp.delay(50).duration(250)}>
				<Banner
					tone={verificationMeta.bannerTone}
					title={verificationMeta.title}
					description={verificationMeta.description}
					accessory={
						verificationStatus === "loading" ? (
							<ActivityIndicator size="small" />
						) : undefined
					}
				/>
			</Animated.View>

			{/* Asset details — collapsed */}
			<Animated.View entering={FadeInUp.delay(90).duration(250)}>
				<CollapsibleSection
					title="Asset details"
					subtitle={`${lot.variety} · ${trimNumber(lot.areaManzanas)} mz · ${lot.altitudeMeters}m`}
				>
					<Card variant="muted">
						<DetailRow label="Farm" value={lot.farmName} />
						<DetailRow
							label="Location"
							value={`${lot.region}, ${lot.country}`}
						/>
						<DetailRow
							label="Coordinates"
							value={`${lot.latitude}, ${lot.longitude}`}
							valueTone="secondary"
						/>
						<DetailRow
							label="Area"
							value={`${trimNumber(lot.areaManzanas)} manzanas`}
						/>
						<DetailRow
							label="Altitude"
							value={`${lot.altitudeMeters}m`}
						/>
					</Card>
				</CollapsibleSection>
			</Animated.View>

			{/* On-chain references — collapsed */}
			<Animated.View entering={FadeInUp.delay(100).duration(250)}>
				<CollapsibleSection
					title="On-chain references"
					aside={<Badge label={selectedNetwork.label} tone="info" />}
				>
					<Card variant="muted">
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
					</Card>
				</CollapsibleSection>
			</Animated.View>

			{/* AI assistant */}
			{wallet ? (
				<Animated.View entering={FadeInUp.delay(110).duration(200)}>
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
				title: "On-chain verified",
				description:
					"Ticket and revenue split match the on-chain record.",
				detailValue: "Match",
				pillLabel: "Verified",
				cardStatusLabel: "Asset verified",
				pillTone: "success" as const,
				bannerTone: "success" as const,
				cardVariant: "success" as const,
			};
		case "mismatch":
			return {
				title: "Data mismatch",
				description:
					"At least one field differs from the on-chain record.",
				detailValue: "Mismatch",
				pillLabel: "Mismatch",
				cardStatusLabel: "Review required",
				pillTone: "warning" as const,
				bannerTone: "warning" as const,
				cardVariant: "warning" as const,
			};
		case "not_found":
			return {
				title: "Not found on-chain",
				description: "No live on-chain record found for this lot PDA.",
				detailValue: "Not found",
				pillLabel: "Missing",
				cardStatusLabel: "Proof missing",
				pillTone: "warning" as const,
				bannerTone: "warning" as const,
				cardVariant: "warning" as const,
			};
		case "error":
			return {
				title: "Verification failed",
				description: error ?? "The on-chain check failed.",
				detailValue: "Error",
				pillLabel: "Error",
				cardStatusLabel: "Check failed",
				pillTone: "error" as const,
				bannerTone: "error" as const,
				cardVariant: "default" as const,
			};
		case "loading":
		default:
			return {
				title: "Verifying asset",
				description:
					"Checking the lot PDA against its on-chain representation.",
				detailValue: "In progress",
				pillLabel: "Verifying",
				cardStatusLabel: "Checking",
				pillTone: "info" as const,
				bannerTone: "info" as const,
				cardVariant: "info" as const,
			};
	}
}

function trimNumber(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

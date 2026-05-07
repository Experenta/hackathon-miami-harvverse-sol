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
import {
	fetchLotByPda,
	fetchPartnerProfileByWallet,
	LotStatus,
} from "@repo/solana-client";
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
import { useNetwork } from "@/features/network/use-network";
import {
	formatLotStatusLabel,
	getReserveBlockedReason,
	isReservableLotStatus,
	mapOnChainLotStatusToApp,
} from "@/features/partner/lot-status";
import {
	buildReserveInstruction,
	computeReserveData,
	type ReserveFlowResult,
} from "@/features/partner/reserve-flow";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function ReservePartnershipScreen() {
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
	const createPendingReservation = useMutation(
		api.partnerships.createPendingReservation,
	);
	const recordReservationTx = useMutation(
		api.partnerships.recordReservationTx,
	);
	const syncStatusFromChain = useMutation(api.lots.syncStatusFromChain);

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
	const [liveLotStatus, setLiveLotStatus] = useState<LotStatus | null>(null);
	const [lotStatusError, setLotStatusError] = useState<string | null>(null);
	const [isRefreshingLotStatus, setIsRefreshingLotStatus] = useState(false);

	const wallet = account?.address?.toString() ?? "";

	const refreshLotStatus = useCallback(async () => {
		if (!lot?.lotPda) {
			setLiveLotStatus(null);
			return null;
		}

		setIsRefreshingLotStatus(true);
		setLotStatusError(null);

		try {
			const onChainLot = await fetchLotByPda(
				client.rpc,
				lot.lotPda as Address,
			);
			if (!onChainLot || !onChainLot.exists) {
				setLiveLotStatus(null);
				return null;
			}

			const nextStatus = onChainLot.data.status;
			setLiveLotStatus(nextStatus);

			const mirroredStatus = mapOnChainLotStatusToApp(nextStatus);
			if (lot.status !== mirroredStatus) {
				await syncStatusFromChain({
					lotCode: lot.lotCode,
					status: mirroredStatus,
				});
			}

			return nextStatus;
		} catch (err) {
			console.error("Failed to refresh lot status:", err);
			setLiveLotStatus(null);
			setLotStatusError(
				err instanceof Error
					? err.message
					: "Unable to verify the on-chain lot status.",
			);
			return null;
		} finally {
			setIsRefreshingLotStatus(false);
		}
	}, [client.rpc, lot, syncStatusFromChain]);

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

	useEffect(() => {
		if (!lot?.lotPda) {
			setLiveLotStatus(null);
			setLotStatusError(null);
			return;
		}

		void refreshLotStatus();
	}, [lot?.lotPda, refreshLotStatus, selectedNetwork.id]);

	useEffect(() => {
		if (!lot || !lot.lotPda || !wallet) return;
		if (reserveData) return;

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

		const latestStatus = await refreshLotStatus();
		if (!isReservableLotStatus(latestStatus)) {
			Alert.alert(
				"Reservation unavailable",
				getReserveBlockedReason(latestStatus),
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

			const partnershipId = await createPendingReservation({
				lotCode: lot.lotCode,
				lotPda: lot.lotPda,
				farmerWallet: lot.farmerWallet,
				partnerWallet: wallet,
				termsHash: reserveData.termsHashHex,
			});

			await recordReservationTx({
				partnershipId,
				partnershipPda: reserveData.partnershipPda.toString(),
				tx: result.signature,
			});
			await syncStatusFromChain({
				lotCode: lot.lotCode,
				status: mapOnChainLotStatusToApp(LotStatus.Reserved),
			});

			setLiveLotStatus(LotStatus.Reserved);
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
		refreshLotStatus,
		syncStatusFromChain,
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
	const isProfileReady = hasPartnerProfile === true;
	const liveStatusLabel =
		liveLotStatus === null
			? null
			: formatLotStatusLabel(mapOnChainLotStatusToApp(liveLotStatus));
	const convexStatusLabel = formatLotStatusLabel(lot.status);
	const isStatusOutOfSync =
		liveLotStatus !== null &&
		mapOnChainLotStatusToApp(liveLotStatus) !== lot.status;
	const canReserve =
		!!reserveData &&
		!isComputing &&
		!isPending &&
		!isRefreshingLotStatus &&
		isProfileReady &&
		isReservableLotStatus(liveLotStatus);

	if (reservedTx) {
		return (
			<Screen scrollable>
				<Animated.View entering={FadeInDown.duration(250)}>
					<ScreenHeader
						showBack
						eyebrow="Opportunity reserved"
						title="Reservation submitted"
						subtitle="The partnership reservation was signed and linked to its pending on-chain record."
					/>
				</Animated.View>

				<Animated.View entering={FadeIn.delay(50).duration(200)}>
					<TxStatus
						state="confirmed"
						signature={ellipsify(reservedTx)}
					/>
				</Animated.View>

				<Animated.View entering={FadeInUp.delay(75).duration(250)}>
					<Section
						title="Reservation record"
						description="Core identifiers are kept visible while PDA and transaction references stay secondary."
						aside={<Badge label="Pending" tone="partner" />}
					>
						<Card variant="accent">
							<DetailRow label="Lot" value={lot.lotCode} />
							<DetailRow
								label="Partnership PDA"
								value={
									reserveData
										? ellipsify(
												reserveData.partnershipPda.toString(),
											)
										: "-"
								}
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Transaction"
								value={ellipsify(reservedTx)}
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
							onPress={() =>
								router.replace("/(partner)/home" as Href)
							}
						/>
					</ActionBar>
				</Animated.View>
			</Screen>
		);
	}

	return (
		<Screen scrollable>
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow="Opportunity confirmation"
					title="Reserve partnership"
					subtitle="Confirm the opportunity terms before signing the reservation transaction."
				/>
			</Animated.View>

			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<Section
					description="This keeps the current reserve instruction, mutations, and navigation intact."
					aside={<Badge label="Partner flow" tone="partner" />}
				>
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: theme.spacing.sm,
						}}
					>
						<StatusPill
							label={selectedNetwork.label}
							tone="accent"
						/>
						<StatusPill
							label={
								isProfileReady
									? "Profile ready"
									: "Profile check"
							}
							tone={isProfileReady ? "success" : "warning"}
						/>
						<StatusPill
							label={`Lot: ${liveStatusLabel ?? convexStatusLabel}`}
							tone={
								isReservableLotStatus(liveLotStatus)
									? "success"
									: "warning"
							}
						/>
					</View>
				</Section>
			</Animated.View>

			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<Section
					title="Opportunity economics"
					description="Primary financial terms for the partnership decision."
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
							helper={lot.farmName}
							eyebrow="Primary lot"
							tone="partner"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							label="Farmer share"
							value={`${lot.farmerShareBps / 100}%`}
							helper="Producer allocation"
							tone="success"
							style={{ minWidth: 160 }}
						/>
						<MetricCard
							label="Partner share"
							value={`${lot.partnerShareBps / 100}%`}
							helper="Your participation"
							tone="info"
							style={{ minWidth: 160 }}
						/>
					</View>
				</Section>
			</Animated.View>

			<Animated.View entering={FadeInUp.delay(50).duration(250)}>
				<Section
					title="Reservation context"
					description="Human-readable fields remain primary before the digital commitment is signed."
					aside={<Badge label={lot.lotCode} tone="neutral" />}
				>
					{isStatusOutOfSync ? (
						<Banner
							tone="warning"
							title="Lot state changed on-chain"
							description={`Convex still shows ${convexStatusLabel}, but the live account is ${liveStatusLabel}. The reservation flow follows the live status.`}
						/>
					) : null}
					<Card variant="accent">
						<DetailRow label="Farm" value={lot.farmName} />
						<DetailRow label="Lot" value={lot.lotCode} />
						<DetailRow
							label="Live lot status"
							value={liveStatusLabel ?? "Checking chain"}
							valueTone="secondary"
						/>
						<DetailRow
							label="Farmer wallet"
							value={ellipsify(lot.farmerWallet)}
							mono
							valueTone="secondary"
						/>
						{lot.lotPda ? (
							<DetailRow
								label="Lot PDA"
								value={ellipsify(lot.lotPda)}
								mono
								valueTone="secondary"
							/>
						) : null}
					</Card>
				</Section>
			</Animated.View>

			<Animated.View entering={FadeInUp.delay(250).duration(250)}>
				<Section
					title="Digital commitment"
					description="Derived hashes and PDAs are shown as secondary transaction references."
					aside={<Badge label="Derived" tone="info" />}
				>
					{isComputing ? (
						<Banner
							tone="info"
							title="Computing reservation terms"
							description="The terms hash and partnership PDA are being derived from the existing lot data."
							accessory={<ActivityIndicator size="small" />}
						/>
					) : reserveData ? (
						<Card variant="muted">
							<DetailRow
								label="Terms hash"
								value={ellipsify(reserveData.termsHashHex, 8)}
								helper="Reservation commitment"
								mono
								valueTone="secondary"
							/>
							<DetailRow
								label="Partnership PDA"
								value={ellipsify(
									reserveData.partnershipPda.toString(),
								)}
								mono
								valueTone="secondary"
							/>
						</Card>
					) : (
						<Banner
							tone="error"
							title="Failed to compute reservation terms"
							description="The reserve review could not derive the required terms hash."
						/>
					)}
				</Section>
			</Animated.View>

			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<Section title="Reservation readiness">
					{isRefreshingLotStatus ? (
						<Banner
							tone="info"
							title="Refreshing live lot status"
							description="The app is checking the current on-chain status before enabling reserve."
							accessory={<ActivityIndicator size="small" />}
						/>
					) : null}
					{!isRefreshingLotStatus &&
					!isReservableLotStatus(liveLotStatus) ? (
						<Banner
							tone="warning"
							title="Lot cannot be reserved"
							description={getReserveBlockedReason(liveLotStatus)}
						>
							{lotStatusError ? (
								<DetailRow
									label="Check detail"
									value={ellipsify(lotStatusError, 24)}
									mono
									valueTone="secondary"
								/>
							) : null}
						</Banner>
					) : null}
					{hasPartnerProfile === null ? (
						<Banner
							tone="info"
							title="Checking partner profile"
							description="Verifying that the connected wallet already owns the required PartnerProfile PDA."
							accessory={<ActivityIndicator size="small" />}
						/>
					) : hasPartnerProfile === false ? (
						<Banner
							tone="warning"
							title="Partner profile required"
							description="This wallet does not have the PartnerProfile PDA required by reserve_partnership."
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
								title="Create Partner Profile"
								variant="accent"
								onPress={() =>
									router.push("/(partner)/profile" as Href)
								}
							/>
						</Banner>
					) : (
						<Banner
							tone="success"
							title="Partner profile verified"
							description="The wallet is eligible to sign the reservation transaction."
						/>
					)}
				</Section>
			</Animated.View>

			<Animated.View entering={FadeInUp.delay(350).duration(200)}>
				<ActionBar>
					<Button
						title="Sign and Reserve Partnership"
						onPress={handleReserve}
						disabled={!canReserve}
						loading={isPending}
					/>
					{!canReserve ? (
						<Text
							style={[
								theme.typography.caption,
								{
									color: theme.colors.text.muted,
									textAlign: "center",
								},
							]}
						>
							{!isProfileReady
								? "Create and verify the PartnerProfile before reserving."
								: getReserveBlockedReason(liveLotStatus)}
						</Text>
					) : null}
				</ActionBar>
			</Animated.View>

			{isPending ? <TxStatus state="pending" /> : null}
			{txError ? (
				<TxStatus state="failed" errorMessage={txError.message} />
			) : null}
		</Screen>
	);
}

import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
} from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import type { Address } from "@solana/kit";
import { useMutation, useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import type { Id } from "@havverse/backend/convex/_generated/dataModel";
import {
	buildRecordMilestoneTx,
	buildReleaseKickoffFundsTx,
	buildReleaseMilestoneFundsTx,
	computeManifestHash,
	deriveMilestonePda,
	formatMockUsdcBaseUnits,
	ZAFIRO_RELEASE_LABELS,
} from "@repo/solana-client";
import {
	ActionBar,
	Badge,
	Banner,
	Button,
	Card,
	CollapsibleSection,
	DetailRow,
	FormField,
	MetricCard,
	Screen,
	ScreenHeader,
	Section,
	StatusPill,
	TxStatus,
} from "@/components/ui";
import { useNetwork } from "@/features/network/use-network";
import { usePartnershipEscrowBalances } from "@/features/partner/use-mock-usdc";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

const MILESTONE_LABELS = [
	"M1 setup",
	"M2 inputs",
	"M3 field work",
	"M4 crop care",
	"M5 harvest prep",
	"M6 closeout",
] as const;

export default function FarmerPartnershipScreen() {
	const { partnershipId } = useLocalSearchParams<{
		partnershipId: string;
	}>();
	const partnershipConvexId =
		typeof partnershipId === "string"
			? (partnershipId as Id<"partnerships">)
			: null;
	const { account } = useMobileWallet();
	const { selectedNetwork } = useNetwork();
	const { theme } = useTheme();
	const {
		signAndSendWithSigner,
		isPending,
		error: txError,
	} = useTransaction();

	const partnership = useQuery(
		api.partnerships.getById,
		partnershipConvexId ? { partnershipId: partnershipConvexId } : "skip",
	);
	const lot = useQuery(
		api.lots.getByCode,
		partnership?.lotCode ? { lotCode: partnership.lotCode } : "skip",
	);
	const milestoneProofs = useQuery(
		api.milestoneProofs.listByPartnership,
		partnershipConvexId ? { partnershipId: partnershipConvexId } : "skip",
	);
	const fundReleases = useQuery(
		api.fundReleases.listByPartnership,
		partnershipConvexId ? { partnershipId: partnershipConvexId } : "skip",
	);
	const recordProof = useMutation(api.milestoneProofs.recordMockProof);
	const recordRelease = useMutation(api.fundReleases.recordRelease);
	const updateEscrowSnapshot = useMutation(
		api.partnerships.updateEscrowSnapshot,
	);
	const recordBalanceSnapshot = useMutation(
		api.mockUsdcBalanceSnapshots.recordSnapshot,
	);

	const wallet = account?.address?.toString() ?? "";
	const escrow = usePartnershipEscrowBalances({
		partnershipPda: partnership?.partnershipPda,
		partnerWallet: partnership?.partnerWallet,
		farmerWallet: partnership?.farmerWallet,
	});

	const [selectedMilestone, setSelectedMilestone] = useState(2);
	const [caption, setCaption] = useState(
		"Inputs received and field prep verified.",
	);
	const [gpsText, setGpsText] = useState("Zafiro plot, Comayagua, Honduras");
	const [receiptText, setReceiptText] = useState(
		"Seedlings, compost, and labor receipt captured for demo proof.",
	);
	const [iotText, setIotText] = useState(
		"soil moisture 34%, canopy temp 26C",
	);
	const [activeTxLabel, setActiveTxLabel] = useState<string | null>(null);
	const [lastProofTx, setLastProofTx] = useState<string | null>(null);
	const [lastReleaseTx, setLastReleaseTx] = useState<string | null>(null);

	const proofs = useMemo(() => milestoneProofs ?? [], [milestoneProofs]);
	const releases = useMemo(() => fundReleases ?? [], [fundReleases]);
	const releaseAmounts = useMemo(
		() =>
			escrow.data?.releaseAmounts ??
			partnership?.releaseScheduleBaseUnits?.map((amount) =>
				BigInt(amount),
			) ??
			[],
		[escrow.data?.releaseAmounts, partnership?.releaseScheduleBaseUnits],
	);
	const releasedBaseUnits =
		escrow.data?.releasedAmountBaseUnits ??
		BigInt(partnership?.releasedAmountBaseUnits ?? 0);
	const reserveBaseUnits =
		escrow.data?.reserveAmountBaseUnits ??
		BigInt(partnership?.reserveAmountBaseUnits ?? 0);
	const vaultBalanceBaseUnits =
		escrow.data?.vaultBalance.amountBaseUnits ?? reserveBaseUnits;
	const depositedBaseUnits =
		escrow.data?.depositedAmountBaseUnits ??
		BigInt(partnership?.depositedAmountBaseUnits ?? 0);

	const nextUnlockLabel = useMemo(() => {
		const nextRelease = releaseAmounts.findIndex(
			(_, index) =>
				!isReleaseComplete(
					index,
					escrow.data?.releasedBitmap,
					releases,
				),
		);
		if (nextRelease < 0) return "All releases complete";
		if (nextRelease === 0) return "Kickoff release";
		return `${ZAFIRO_RELEASE_LABELS[nextRelease]} after M${nextRelease + 1}`;
	}, [escrow.data?.releasedBitmap, releaseAmounts, releases]);

	const refreshAndMirrorEscrow = useCallback(
		async (sourceTx?: string) => {
			if (!partnershipConvexId) return;
			const next = await escrow.refresh();
			if (!next) return;

			await updateEscrowSnapshot({
				partnershipId: partnershipConvexId,
				releasedAmountBaseUnits: Number(next.releasedAmountBaseUnits),
				reserveAmountBaseUnits: Number(next.reserveAmountBaseUnits),
			});

			await Promise.all([
				recordBalanceSnapshot({
					tokenAccount: next.vaultTokenAccount.toString(),
					mint: next.mint.toString(),
					role: "vault",
					balanceBaseUnits: Number(next.vaultBalance.amountBaseUnits),
					balanceUiAmount: next.vaultBalance.uiAmount,
					sourceTx,
				}),
				recordBalanceSnapshot({
					wallet: partnership?.farmerWallet,
					tokenAccount: next.farmerTokenAccount.toString(),
					mint: next.mint.toString(),
					role: "farmer",
					balanceBaseUnits: Number(
						next.farmerBalance.amountBaseUnits,
					),
					balanceUiAmount: next.farmerBalance.uiAmount,
					sourceTx,
				}),
			]);
		},
		[
			escrow,
			partnership?.farmerWallet,
			partnershipConvexId,
			recordBalanceSnapshot,
			updateEscrowSnapshot,
		],
	);

	const handleRecordProof = useCallback(async () => {
		if (
			!partnership ||
			!partnershipConvexId ||
			!partnership.partnershipPda
		) {
			return;
		}
		if (!caption.trim()) {
			Alert.alert("Proof caption required", "Add a short proof caption.");
			return;
		}
		if (wallet !== partnership.farmerWallet) {
			Alert.alert(
				"Farmer wallet required",
				"Connect the farmer wallet for this partnership before recording proof.",
			);
			return;
		}

		const payload = {
			type: "harvverse_mock_milestone_proof",
			partnershipPda: partnership.partnershipPda,
			lotCode: partnership.lotCode,
			milestoneIndex: selectedMilestone,
			caption: caption.trim(),
			gpsText: gpsText.trim(),
			receiptText: receiptText.trim(),
			iotPayload: parseIotPayload(iotText),
			recordedByWallet: wallet,
			recordedAt: Date.now(),
		};
		const proofHash = await computeManifestHash(payload);
		const proofHashHex = bytesToHex(proofHash);

		setActiveTxLabel(`Recording M${selectedMilestone} proof`);
		try {
			const result = await signAndSendWithSigner(async (signer) => [
				await buildRecordMilestoneTx({
					recorder: signer,
					partnershipPda: partnership.partnershipPda as Address,
					milestoneIndex: selectedMilestone,
					proofHash,
				}),
			]);

			await recordProof({
				partnershipId: partnershipConvexId,
				partnershipPda: partnership.partnershipPda,
				lotCode: partnership.lotCode,
				milestoneIndex: selectedMilestone,
				proofHash: proofHashHex,
				proofTx: result.signature,
				recordedByWallet: wallet,
				status: "recorded",
				title: `${MILESTONE_LABELS[selectedMilestone - 1]} proof`,
				caption: caption.trim(),
				receiptText: receiptText.trim(),
				gpsText: gpsText.trim(),
				iotPayload: parseIotPayload(iotText),
			});
			setLastProofTx(result.signature);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Milestone proof failed";
			Alert.alert("Transaction Failed", message);
		} finally {
			setActiveTxLabel(null);
		}
	}, [
		partnership,
		partnershipConvexId,
		caption,
		wallet,
		selectedMilestone,
		gpsText,
		receiptText,
		iotText,
		signAndSendWithSigner,
		recordProof,
	]);

	const handleReleaseFunds = useCallback(
		async (releaseIndex: number) => {
			if (
				!partnership ||
				!partnershipConvexId ||
				!partnership.partnershipPda ||
				!lot?.lotPda ||
				!escrow.data
			) {
				return;
			}
			if (wallet !== partnership.farmerWallet) {
				Alert.alert(
					"Farmer wallet required",
					"Connect the farmer wallet for this partnership before releasing funds.",
				);
				return;
			}

			const releaseAmount =
				escrow.data.releaseAmounts[releaseIndex] ?? 0n;
			if (releaseIndex > 0) {
				const requiredMilestoneIndex = releaseIndex + 1;
				const hasRequiredProof = proofs.some(
					(proof) =>
						proof.milestoneIndex === requiredMilestoneIndex &&
						proof.status === "recorded",
				);
				if (!hasRequiredProof) {
					Alert.alert(
						"Proof required",
						`Record M${requiredMilestoneIndex} proof before releasing ${ZAFIRO_RELEASE_LABELS[releaseIndex]}.`,
					);
					return;
				}
			}

			setActiveTxLabel(
				`Releasing ${ZAFIRO_RELEASE_LABELS[releaseIndex]}`,
			);
			try {
				const result = await signAndSendWithSigner(async (signer) => {
					if (releaseIndex === 0) {
						return buildReleaseKickoffFundsTx({
							signer,
							partnershipPda:
								partnership.partnershipPda as Address,
							lotPda: lot.lotPda as Address,
							farmer: partnership.farmerWallet as Address,
							vaultTokenAccount: escrow.data!.vaultTokenAccount,
							farmerMockUsdcAta: escrow.data!.farmerTokenAccount,
							mockUsdcMint: escrow.data!.mint,
						});
					}

					const [requiredMilestoneReceipt] = await deriveMilestonePda(
						partnership.partnershipPda as Address,
						releaseIndex + 1,
					);
					return buildReleaseMilestoneFundsTx({
						signer,
						partnershipPda: partnership.partnershipPda as Address,
						farmer: partnership.farmerWallet as Address,
						requiredMilestoneReceipt,
						vaultTokenAccount: escrow.data!.vaultTokenAccount,
						farmerMockUsdcAta: escrow.data!.farmerTokenAccount,
						mockUsdcMint: escrow.data!.mint,
						releaseIndex,
					});
				});

				await recordRelease({
					partnershipId: partnershipConvexId,
					partnershipPda: partnership.partnershipPda,
					releaseIndex,
					amountBaseUnits: Number(releaseAmount),
					releaseTx: result.signature,
					recipientWallet: partnership.farmerWallet,
				});
				await refreshAndMirrorEscrow(result.signature);
				setLastReleaseTx(result.signature);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Fund release failed";
				Alert.alert("Transaction Failed", message);
			} finally {
				setActiveTxLabel(null);
			}
		},
		[
			partnership,
			partnershipConvexId,
			lot?.lotPda,
			escrow.data,
			wallet,
			signAndSendWithSigner,
			recordRelease,
			refreshAndMirrorEscrow,
			proofs,
		],
	);

	if (partnership === undefined || !partnershipConvexId) {
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
					Loading partnership...
				</Text>
			</Screen>
		);
	}

	if (!partnership) {
		return (
			<Screen
				contentContainerStyle={{
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Banner
					tone="error"
					title="Partnership not found"
					description="No funded partnership was found for this farmer screen."
				/>
			</Screen>
		);
	}

	const isFarmerWallet = wallet === partnership.farmerWallet;
	const releaseCount = releaseAmounts.length;
	const completedReleases = Array.from({ length: releaseCount }).filter(
		(_, i) => isReleaseComplete(i, escrow.data?.releasedBitmap, releases),
	).length;

	return (
		<Screen scrollable contentContainerStyle={{ gap: theme.spacing.lg }}>
			{/* Header — compact, no verbose subtitle */}
			<Animated.View entering={FadeInDown.duration(250)}>
				<ScreenHeader
					showBack
					eyebrow="Milestone escrow"
					title={`Lot ${partnership.lotCode}`}
					trailing={<Badge label="Farmer" tone="brand" />}
				/>
			</Animated.View>

			{/* Minimal status row */}
			<Animated.View entering={FadeIn.delay(50).duration(200)}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: theme.spacing.sm,
					}}
				>
					<StatusPill
						label={partnership.status}
						tone={
							partnership.status === "active" ? "success" : "info"
						}
					/>
					<StatusPill
						label={isFarmerWallet ? "Connected" : "Wrong wallet"}
						tone={isFarmerWallet ? "success" : "warning"}
					/>
				</View>
			</Animated.View>

			{/* Primary metrics — 2 cards, the most important info */}
			<Animated.View entering={FadeInUp.delay(75).duration(250)}>
				<View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
					<MetricCard
						label="Vault balance"
						value={formatMockUsdcBaseUnits(vaultBalanceBaseUnits)}
						helper={nextUnlockLabel}
						eyebrow="Live"
						tone="farmer"
						style={{ flex: 1 }}
					/>
					<MetricCard
						label="Released"
						value={formatMockUsdcBaseUnits(releasedBaseUnits)}
						helper={`${completedReleases}/${releaseCount} tranches`}
						eyebrow="Paid"
						tone="success"
						style={{ flex: 1 }}
					/>
				</View>
			</Animated.View>

			{/* Secondary metrics — collapsed by default */}
			<Animated.View entering={FadeInUp.delay(90).duration(250)}>
				<CollapsibleSection
					title="Escrow details"
					subtitle="Deposit and reserve breakdown"
				>
					<View
						style={{ flexDirection: "row", gap: theme.spacing.sm }}
					>
						<MetricCard
							label="Deposited"
							value={formatMockUsdcBaseUnits(depositedBaseUnits)}
							eyebrow="Ticket"
							tone="info"
							style={{ flex: 1 }}
						/>
						<MetricCard
							label="Reserve"
							value={formatMockUsdcBaseUnits(reserveBaseUnits)}
							eyebrow="Held"
							tone="default"
							style={{ flex: 1 }}
						/>
					</View>
					<Card variant="muted">
						<DetailRow
							label="Partnership PDA"
							value={ellipsify(partnership.partnershipPda ?? "")}
							mono
							valueTone="secondary"
						/>
						<DetailRow
							label="mockUSDC mint"
							value={ellipsify(
								escrow.data?.mint.toString() ??
									partnership.mockUsdcMint ??
									"",
							)}
							mono
							valueTone="secondary"
						/>
						<DetailRow
							label="Vault account"
							value={ellipsify(
								escrow.data?.vaultTokenAccount.toString() ??
									partnership.escrowVault ??
									"",
							)}
							mono
							valueTone="secondary"
						/>
						{escrow.data ? (
							<DetailRow
								label="Farmer account"
								value={ellipsify(
									escrow.data.farmerTokenAccount.toString(),
								)}
								mono
								valueTone="secondary"
							/>
						) : null}
					</Card>
				</CollapsibleSection>
			</Animated.View>

			{/* Fund releases — streamlined cards */}
			<Animated.View entering={FadeInUp.delay(100).duration(250)}>
				<Section title="Fund releases">
					<View style={{ gap: theme.spacing.sm }}>
						{Array.from({ length: releaseCount }).map(
							(_, releaseIndex) => {
								const alreadyReleased = isReleaseComplete(
									releaseIndex,
									escrow.data?.releasedBitmap,
									releases,
								);
								const requiredMilestone =
									releaseIndex === 0
										? null
										: releaseIndex + 1;
								const proofReady =
									requiredMilestone === null ||
									proofs.some(
										(proof) =>
											proof.milestoneIndex ===
												requiredMilestone &&
											proof.status === "recorded",
									);
								const disabled =
									!isFarmerWallet ||
									!escrow.data ||
									isPending ||
									alreadyReleased ||
									!proofReady;

								return (
									<View
										key={
											ZAFIRO_RELEASE_LABELS[releaseIndex]
										}
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: theme.spacing.md,
											backgroundColor: alreadyReleased
												? theme.colors.feedback.success
														.background
												: theme.colors.surface.default,
											borderWidth: theme.borderWidth.thin,
											borderColor: alreadyReleased
												? theme.colors.feedback.success
														.border
												: theme.colors.border.default,
											borderRadius: theme.radius.md,
											padding: theme.spacing.md,
										}}
									>
										{/* Progress indicator */}
										<View
											style={{
												width: 8,
												height: 8,
												borderRadius: 4,
												backgroundColor: alreadyReleased
													? theme.colors.feedback
															.success.accent
													: proofReady
														? theme.colors.feedback
																.info.accent
														: theme.colors.border
																.strong,
											}}
										/>
										{/* Label + amount */}
										<View style={{ flex: 1, gap: 2 }}>
											<Text
												style={[
													theme.typography.labelMd,
													{
														color: alreadyReleased
															? theme.colors
																	.feedback
																	.success
																	.foreground
															: theme.colors.text
																	.primary,
													},
												]}
											>
												{
													ZAFIRO_RELEASE_LABELS[
														releaseIndex
													]
												}
											</Text>
											<Text
												style={[
													theme.typography.caption,
													{
														color: theme.colors.text
															.muted,
													},
												]}
											>
												{formatMockUsdcBaseUnits(
													releaseAmounts[
														releaseIndex
													] ?? 0n,
												)}
												{requiredMilestone
													? ` · needs M${requiredMilestone}`
													: ""}
											</Text>
										</View>
										{/* Action */}
										{!alreadyReleased ? (
											<Button
												title="Release"
												variant={
													proofReady
														? "accent"
														: "secondary"
												}
												fullWidth={false}
												onPress={() =>
													void handleReleaseFunds(
														releaseIndex,
													)
												}
												disabled={disabled}
												loading={
													isPending &&
													activeTxLabel ===
														`Releasing ${ZAFIRO_RELEASE_LABELS[releaseIndex]}`
												}
											/>
										) : (
											<Badge
												label="Done"
												tone="success"
											/>
										)}
									</View>
								);
							},
						)}
					</View>
				</Section>
			</Animated.View>

			{/* Milestone proof — compact form */}
			<Animated.View entering={FadeInUp.delay(120).duration(250)}>
				<Section
					title="Record proof"
					aside={
						<Badge label={`M${selectedMilestone}`} tone="brand" />
					}
				>
					{/* Milestone selector — compact pill row */}
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: theme.spacing.xs,
						}}
					>
						{MILESTONE_LABELS.map((label, index) => {
							const milestoneIndex = index + 1;
							const proof = proofs.find(
								(item) =>
									item.milestoneIndex === milestoneIndex,
							);
							const isSelected =
								milestoneIndex === selectedMilestone;

							return (
								<Button
									key={label}
									title={
										proof
											? `M${milestoneIndex} ✓`
											: `M${milestoneIndex}`
									}
									variant={
										isSelected ? "primary" : "secondary"
									}
									fullWidth={false}
									onPress={() =>
										setSelectedMilestone(milestoneIndex)
									}
									accessibilityHint={
										proof ? "Proof recorded" : label
									}
								/>
							);
						})}
					</View>

					{/* Show existing proof hash if recorded */}
					{proofs.find(
						(proof) => proof.milestoneIndex === selectedMilestone,
					) ? (
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: theme.spacing.xs,
								paddingVertical: theme.spacing.xs,
							}}
						>
							<View
								style={{
									width: 6,
									height: 6,
									borderRadius: 3,
									backgroundColor:
										theme.colors.feedback.success.accent,
								}}
							/>
							<Text
								style={[
									theme.typography.caption,
									{ color: theme.colors.text.muted },
								]}
							>
								Proof:{" "}
								{ellipsify(
									proofs.find(
										(proof) =>
											proof.milestoneIndex ===
											selectedMilestone,
									)?.proofHash ?? "",
									8,
								)}
							</Text>
						</View>
					) : null}

					<FormField
						label="Caption"
						value={caption}
						onChangeText={setCaption}
						multiline
						required
						hint="Short field observation for the proof hash."
					/>
					<FormField
						label="GPS or location"
						value={gpsText}
						onChangeText={setGpsText}
					/>
					<FormField
						label="Receipt notes"
						value={receiptText}
						onChangeText={setReceiptText}
						multiline
					/>
					<FormField
						label="IoT payload"
						value={iotText}
						onChangeText={setIotText}
						hint="JSON or plain text."
					/>
					<Button
						title={`Record M${selectedMilestone} proof`}
						onPress={handleRecordProof}
						disabled={!isFarmerWallet || isPending}
						loading={
							isPending &&
							activeTxLabel ===
								`Recording M${selectedMilestone} proof`
						}
					/>
				</Section>
			</Animated.View>

			{/* Transaction history — collapsed */}
			<Animated.View entering={FadeInUp.delay(140).duration(250)}>
				<CollapsibleSection title="Transaction history">
					<Card variant="muted">
						<DetailRow
							label="Funding tx"
							value={
								partnership.fundingTx
									? ellipsify(partnership.fundingTx)
									: "Pending"
							}
							mono
							valueTone="secondary"
						/>
						<DetailRow
							label="Last proof tx"
							value={
								lastProofTx ? ellipsify(lastProofTx) : "None"
							}
							mono
							valueTone="secondary"
						/>
						<DetailRow
							label="Last release tx"
							value={
								lastReleaseTx
									? ellipsify(lastReleaseTx)
									: "None"
							}
							mono
							valueTone="secondary"
						/>
					</Card>
				</CollapsibleSection>
			</Animated.View>

			{/* Sticky action */}
			<ActionBar>
				<Button
					title="Refresh balances"
					variant="secondary"
					onPress={() => void refreshAndMirrorEscrow()}
					disabled={!escrow.data || isPending}
				/>
			</ActionBar>

			{isPending ? (
				<TxStatus
					state="pending"
					signature={activeTxLabel ?? undefined}
				/>
			) : null}
			{txError ? (
				<TxStatus state="failed" errorMessage={txError.message} />
			) : null}
		</Screen>
	);
}

function isReleaseComplete(
	releaseIndex: number,
	releasedBitmap: number | undefined,
	releases: readonly { releaseIndex: number }[],
) {
	return (
		Boolean(
			releasedBitmap && (releasedBitmap & (1 << releaseIndex)) !== 0,
		) || releases.some((release) => release.releaseIndex === releaseIndex)
	);
}

function parseIotPayload(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return { text: trimmed };
	}
}

function bytesToHex(bytes: Uint8Array) {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

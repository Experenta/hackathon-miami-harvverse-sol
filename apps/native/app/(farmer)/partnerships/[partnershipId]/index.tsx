import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
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
  mockUsdcBaseUnitsToNumber,
  ZAFIRO_RELEASE_LABELS,
} from "@repo/solana-client";
import {
  ActionBar,
  BackButton,
  Badge,
  Banner,
  Button,
  Card,
  CollapsibleSection,
  DetailRow,
  FormField,
  Screen,
  Section,
  StatusPill,
  TxStatus,
} from "@/components/ui";
import { usePartnershipEscrowBalances } from "@/features/partner/use-mock-usdc";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme, type AppTheme } from "@/theme";
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
  const { theme } = useTheme();
  const { signAndSendWithSigner, isPending, error: txError } = useTransaction();

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
  const [iotText, setIotText] = useState("soil moisture 34%, canopy temp 26C");
  const [activeTxLabel, setActiveTxLabel] = useState<string | null>(null);
  const [lastProofTx, setLastProofTx] = useState<string | null>(null);
  const [lastReleaseTx, setLastReleaseTx] = useState<string | null>(null);

  const proofs = useMemo(() => milestoneProofs ?? [], [milestoneProofs]);
  const releases = useMemo(() => fundReleases ?? [], [fundReleases]);
  const releaseAmounts = useMemo(
    () =>
      escrow.data?.releaseAmounts ??
      partnership?.releaseScheduleBaseUnits?.map((amount) => BigInt(amount)) ??
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
  const totalScheduleBaseUnits = useMemo(
    () => releaseAmounts.reduce((acc, value) => acc + value, 0n),
    [releaseAmounts],
  );
  const releasedFraction = useMemo(() => {
    const total = mockUsdcBaseUnitsToNumber(totalScheduleBaseUnits);
    if (total <= 0) return 0;
    return mockUsdcBaseUnitsToNumber(releasedBaseUnits) / total;
  }, [releasedBaseUnits, totalScheduleBaseUnits]);

  const selectedMilestoneRecordedProof = useMemo(
    () =>
      proofs.find(
        (proof) =>
          proof.milestoneIndex === selectedMilestone &&
          proof.status === "recorded",
      ),
    [proofs, selectedMilestone],
  );

  const nextReleaseIndex = useMemo(() => {
    const index = releaseAmounts.findIndex(
      (_, i) => !isReleaseComplete(i, escrow.data?.releasedBitmap, releases),
    );
    return index;
  }, [escrow.data?.releasedBitmap, releaseAmounts, releases]);

  const nextUnlockSummary = useMemo(() => {
    if (nextReleaseIndex < 0) return "All releases complete";
    if (nextReleaseIndex === 0) return "Kickoff release ready";
    return `${ZAFIRO_RELEASE_LABELS[nextReleaseIndex]} release · needs M${nextReleaseIndex + 1} proof`;
  }, [nextReleaseIndex]);

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
          balanceBaseUnits: Number(next.farmerBalance.amountBaseUnits),
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
    if (!partnership || !partnershipConvexId || !partnership.partnershipPda) {
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
    if (selectedMilestoneRecordedProof) {
      Alert.alert(
        "Proof already recorded",
        `M${selectedMilestone} already has an on-chain proof receipt.`,
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
    selectedMilestoneRecordedProof,
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

      const releaseAmount = escrow.data.releaseAmounts[releaseIndex] ?? 0n;
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

      setActiveTxLabel(`Releasing ${ZAFIRO_RELEASE_LABELS[releaseIndex]}`);
      try {
        const result = await signAndSendWithSigner(async (signer) => {
          if (releaseIndex === 0) {
            return buildReleaseKickoffFundsTx({
              signer,
              partnershipPda: partnership.partnershipPda as Address,
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

  const vaultFormatted = splitFormattedAmount(
    formatMockUsdcBaseUnits(vaultBalanceBaseUnits),
  );
  const releasedFormatted = splitFormattedAmount(
    formatMockUsdcBaseUnits(releasedBaseUnits),
  );
  const totalFormatted = splitFormattedAmount(
    formatMockUsdcBaseUnits(totalScheduleBaseUnits),
  );

  return (
    <Screen scrollable contentContainerStyle={{ gap: theme.spacing.lg }}>
      {/* Top bar — back + role badge */}
      <Animated.View entering={FadeInDown.duration(220)}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BackButton label="Back" />
          <Badge label="Farmer" tone="brand" />
        </View>
      </Animated.View>

      {/* Hero card — focal balance + status + progress */}
      <Animated.View entering={FadeIn.delay(40).duration(220)}>
        <HeroEscrowCard
          theme={theme}
          lotCode={partnership.lotCode}
          status={partnership.status}
          isConnected={isFarmerWallet}
          vaultValue={vaultFormatted.value}
          vaultSuffix={vaultFormatted.suffix}
          nextUnlockSummary={nextUnlockSummary}
          releasedDisplay={`${releasedFormatted.value} of ${totalFormatted.value}`}
          tranchesCompleted={completedReleases}
          tranchesTotal={releaseCount}
          fraction={releasedFraction}
        />
      </Animated.View>

      {/* Fund releases — vertical timeline */}
      <Animated.View entering={FadeInUp.delay(80).duration(240)}>
        <Section
          title="Fund releases"
          description="Each tranche unlocks once its milestone proof is on-chain."
        >
          <Card style={{ paddingVertical: theme.spacing.md }}>
            {Array.from({ length: releaseCount }).map((_, releaseIndex) => {
              const alreadyReleased = isReleaseComplete(
                releaseIndex,
                escrow.data?.releasedBitmap,
                releases,
              );
              const requiredMilestone =
                releaseIndex === 0 ? null : releaseIndex + 1;
              const proofReady =
                requiredMilestone === null ||
                proofs.some(
                  (proof) =>
                    proof.milestoneIndex === requiredMilestone &&
                    proof.status === "recorded",
                );
              const isNextActionable =
                !alreadyReleased && releaseIndex === nextReleaseIndex;
              const disabled =
                !isFarmerWallet ||
                !escrow.data ||
                isPending ||
                alreadyReleased ||
                !proofReady;
              const isLast = releaseIndex === releaseCount - 1;

              return (
                <ReleaseTimelineRow
                  key={`${ZAFIRO_RELEASE_LABELS[releaseIndex]}-${releaseIndex}`}
                  theme={theme}
                  isLast={isLast}
                  done={alreadyReleased}
                  proofReady={proofReady}
                  isNext={isNextActionable}
                  label={ZAFIRO_RELEASE_LABELS[releaseIndex]}
                  amount={formatMockUsdcBaseUnits(
                    releaseAmounts[releaseIndex] ?? 0n,
                  )}
                  requiredMilestone={requiredMilestone}
                  disabled={disabled}
                  loading={
                    isPending &&
                    activeTxLabel ===
                      `Releasing ${ZAFIRO_RELEASE_LABELS[releaseIndex]}`
                  }
                  onPress={() => void handleReleaseFunds(releaseIndex)}
                />
              );
            })}
          </Card>
        </Section>
      </Animated.View>

      {/* Record proof */}
      <Animated.View entering={FadeInUp.delay(110).duration(240)}>
        <Section
          title="Record proof"
          description="Capture a field proof to anchor the next milestone on-chain."
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: theme.spacing.xs,
              paddingRight: theme.spacing.lg,
            }}
          >
            {MILESTONE_LABELS.map((label, index) => {
              const milestoneIndex = index + 1;
              const hasRecordedProof = proofs.some(
                (item) =>
                  item.milestoneIndex === milestoneIndex &&
                  item.status === "recorded",
              );
              const isSelected = milestoneIndex === selectedMilestone;
              return (
                <MilestonePill
                  key={label}
                  theme={theme}
                  index={milestoneIndex}
                  selected={isSelected}
                  recorded={hasRecordedProof}
                  hint={label}
                  onPress={() => setSelectedMilestone(milestoneIndex)}
                />
              );
            })}
          </ScrollView>

          {/* Selected milestone summary */}
          <Card variant={selectedMilestoneRecordedProof ? "success" : "muted"}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[
                    theme.typography.labelSm,
                    {
                      color: selectedMilestoneRecordedProof
                        ? theme.colors.feedback.success.foreground
                        : theme.colors.text.muted,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    },
                  ]}
                >
                  {selectedMilestoneRecordedProof
                    ? "Proof recorded"
                    : "Awaiting proof"}
                </Text>
                <Text
                  style={[
                    theme.typography.labelMd,
                    {
                      color: selectedMilestoneRecordedProof
                        ? theme.colors.feedback.success.foreground
                        : theme.colors.text.primary,
                    },
                  ]}
                >
                  {MILESTONE_LABELS[selectedMilestone - 1]}
                </Text>
                {selectedMilestoneRecordedProof ? (
                  <Text
                    style={[
                      theme.typography.mono,
                      {
                        color: theme.colors.feedback.success.foreground,
                        marginTop: 4,
                      },
                    ]}
                  >
                    {ellipsify(selectedMilestoneRecordedProof.proofHash, 10)}
                  </Text>
                ) : (
                  <Text
                    style={[
                      theme.typography.bodySm,
                      {
                        color: theme.colors.text.secondary,
                        marginTop: 2,
                      },
                    ]}
                  >
                    Capture an observation hash to unlock the next tranche.
                  </Text>
                )}
              </View>
              <Badge
                label={`M${selectedMilestone}`}
                tone={selectedMilestoneRecordedProof ? "success" : "brand"}
              />
            </View>
          </Card>

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
            title={
              selectedMilestoneRecordedProof
                ? `M${selectedMilestone} proof recorded`
                : `Record M${selectedMilestone} proof`
            }
            onPress={handleRecordProof}
            disabled={
              !isFarmerWallet ||
              isPending ||
              Boolean(selectedMilestoneRecordedProof)
            }
            loading={
              isPending &&
              activeTxLabel === `Recording M${selectedMilestone} proof`
            }
          />
        </Section>
      </Animated.View>

      {/* Escrow details — collapsed */}
      <Animated.View entering={FadeInUp.delay(140).duration(240)}>
        <CollapsibleSection
          title="Escrow details"
          subtitle="Reserve, deposit, and on-chain accounts"
        >
          <Card variant="muted">
            <DetailRow
              label="Deposited"
              value={formatMockUsdcBaseUnits(depositedBaseUnits)}
            />
            <DetailRow
              label="Reserve"
              value={formatMockUsdcBaseUnits(reserveBaseUnits)}
              valueTone="secondary"
            />
            <DetailRow
              label="Released"
              value={formatMockUsdcBaseUnits(releasedBaseUnits)}
              valueTone="secondary"
            />
          </Card>
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
                escrow.data?.mint.toString() ?? partnership.mockUsdcMint ?? "",
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
                value={ellipsify(escrow.data.farmerTokenAccount.toString())}
                mono
                valueTone="secondary"
              />
            ) : null}
          </Card>
        </CollapsibleSection>
      </Animated.View>

      {/* Transaction history — collapsed */}
      <Animated.View entering={FadeInUp.delay(160).duration(240)}>
        <CollapsibleSection
          title="Transaction history"
          subtitle="Funding, proofs, and releases"
        >
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
              value={lastProofTx ? ellipsify(lastProofTx) : "None"}
              mono
              valueTone="secondary"
            />
            <DetailRow
              label="Last release tx"
              value={lastReleaseTx ? ellipsify(lastReleaseTx) : "None"}
              mono
              valueTone="secondary"
            />
          </Card>
        </CollapsibleSection>
      </Animated.View>

      {/* Sticky-ish refresh */}
      <ActionBar variant="subtle">
        <Button
          title="Refresh balances"
          variant="secondary"
          onPress={() => void refreshAndMirrorEscrow()}
          disabled={!escrow.data || isPending}
        />
      </ActionBar>

      {isPending ? (
        <TxStatus state="pending" signature={activeTxLabel ?? undefined} />
      ) : null}
      {txError ? (
        <TxStatus state="failed" errorMessage={txError.message} />
      ) : null}
    </Screen>
  );
}

// --- Inline components -------------------------------------------------------

interface HeroEscrowCardProps {
  theme: AppTheme;
  lotCode: string;
  status: string;
  isConnected: boolean;
  vaultValue: string;
  vaultSuffix: string;
  nextUnlockSummary: string;
  releasedDisplay: string;
  tranchesCompleted: number;
  tranchesTotal: number;
  fraction: number;
}

function HeroEscrowCard({
  theme,
  lotCode,
  status,
  isConnected,
  vaultValue,
  vaultSuffix,
  nextUnlockSummary,
  releasedDisplay,
  tranchesCompleted,
  tranchesTotal,
  fraction,
}: HeroEscrowCardProps) {
  return (
    <Card
      style={{
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        borderColor: theme.colors.role.farmer.border,
      }}
    >
      {/* Eyebrow + lot code */}
      <View style={{ gap: 6 }}>
        <Text
          style={[
            theme.typography.labelSm,
            {
              color: theme.colors.text.brand,
              letterSpacing: 1.4,
              textTransform: "uppercase",
            },
          ]}
        >
          Milestone escrow
        </Text>
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: theme.colors.surface.subtle,
            borderColor: theme.colors.border.default,
            borderWidth: theme.borderWidth.thin,
            borderRadius: theme.radius.sm,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: 6,
          }}
        >
          <Text
            numberOfLines={1}
            style={[
              theme.typography.mono,
              {
                fontSize: 13,
                lineHeight: 18,
                color: theme.colors.text.primary,
                letterSpacing: 0.4,
              },
            ]}
          >
            {lotCode}
          </Text>
        </View>
      </View>

      {/* Status row */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing.xs,
        }}
      >
        <StatusPill
          label={status}
          tone={status === "active" ? "success" : "info"}
        />
        <StatusPill
          label={isConnected ? "Wallet connected" : "Wrong wallet"}
          tone={isConnected ? "success" : "warning"}
        />
      </View>

      {/* Hero balance */}
      <View style={{ gap: 4, marginTop: theme.spacing.xs }}>
        <Text
          style={[
            theme.typography.labelSm,
            {
              color: theme.colors.text.muted,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            },
          ]}
        >
          Vault balance
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: theme.spacing.xs,
            flexWrap: "nowrap",
          }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{
              fontFamily: theme.typography.fontFamily.resolvedBrand,
              fontSize: 44,
              lineHeight: 50,
              fontWeight: "700",
              color: theme.colors.feedback.success.accent,
              flexShrink: 1,
            }}
          >
            {vaultValue}
          </Text>
          <Text
            style={[
              theme.typography.labelMd,
              { color: theme.colors.text.muted },
            ]}
          >
            {vaultSuffix}
          </Text>
        </View>
        <Text
          style={[
            theme.typography.bodySm,
            { color: theme.colors.text.secondary },
          ]}
        >
          Next: {nextUnlockSummary}
        </Text>
      </View>

      {/* Progress */}
      <View style={{ gap: 8, marginTop: theme.spacing.xs }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.muted },
            ]}
          >
            Released {releasedDisplay}
          </Text>
          <Text
            style={[
              theme.typography.labelSm,
              {
                color: theme.colors.text.brand,
                letterSpacing: 0.6,
              },
            ]}
          >
            {tranchesCompleted}/{tranchesTotal} tranches
          </Text>
        </View>
        <ProgressBar
          fraction={fraction}
          color={theme.colors.feedback.success.accent}
          track={theme.colors.surface.subtle}
        />
      </View>
    </Card>
  );
}

interface ProgressBarProps {
  fraction: number;
  color: string;
  track: string;
  style?: StyleProp<ViewStyle>;
}

function ProgressBar({ fraction, color, track, style }: ProgressBarProps) {
  const safe = Math.max(0, Math.min(1, fraction || 0));
  return (
    <View
      style={[
        {
          height: 6,
          backgroundColor: track,
          borderRadius: 999,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${safe * 100}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

interface ReleaseTimelineRowProps {
  theme: AppTheme;
  isLast: boolean;
  done: boolean;
  proofReady: boolean;
  isNext: boolean;
  label: string;
  amount: string;
  requiredMilestone: number | null;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}

function ReleaseTimelineRow({
  theme,
  isLast,
  done,
  proofReady,
  isNext,
  label,
  amount,
  requiredMilestone,
  disabled,
  loading,
  onPress,
}: ReleaseTimelineRowProps) {
  const dotColor = done
    ? theme.colors.feedback.success.accent
    : isNext
      ? theme.colors.text.brand
      : proofReady
        ? theme.colors.feedback.info.accent
        : theme.colors.border.strong;
  const labelColor = done
    ? theme.colors.text.secondary
    : theme.colors.text.primary;
  const amountColor = done
    ? theme.colors.text.secondary
    : theme.colors.text.primary;
  const subText = done
    ? "Released to farmer wallet"
    : requiredMilestone
      ? proofReady
        ? `M${requiredMilestone} proof on-chain · ready to release`
        : `Locked until M${requiredMilestone} proof`
      : "Available at funding";

  return (
    <View
      style={{
        flexDirection: "row",
        gap: theme.spacing.md,
        alignItems: "stretch",
      }}
    >
      {/* Connector + dot */}
      <View style={{ width: 18, alignItems: "center" }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: dotColor,
            marginTop: 4,
            borderWidth: done ? 0 : 2,
            borderColor: done ? "transparent" : theme.colors.surface.default,
            ...(isNext && !done
              ? {
                  shadowColor: dotColor,
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 4,
                }
              : null),
          }}
        />
        {!isLast ? (
          <View
            style={{
              flex: 1,
              width: 2,
              marginTop: 4,
              backgroundColor: done
                ? theme.colors.feedback.success.border
                : theme.colors.border.subtle,
            }}
          />
        ) : null}
      </View>

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingBottom: isLast ? 0 : theme.spacing.md,
          gap: 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          <Text
            style={[
              theme.typography.labelMd,
              { color: labelColor, fontWeight: isNext ? "700" : "600" },
            ]}
          >
            {label}
          </Text>
          <Text
            style={[
              theme.typography.labelMd,
              { color: amountColor, fontVariant: ["tabular-nums"] },
            ]}
          >
            {amount}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          <Text
            style={[
              theme.typography.caption,
              {
                color: done
                  ? theme.colors.feedback.success.foreground
                  : theme.colors.text.muted,
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {subText}
          </Text>
          {done ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: theme.colors.feedback.success.background,
                borderColor: theme.colors.feedback.success.border,
                borderWidth: theme.borderWidth.thin,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: theme.colors.feedback.success.accent,
                  fontSize: 12,
                  lineHeight: 14,
                  fontWeight: "700",
                }}
              >
                ✓
              </Text>
              <Text
                style={[
                  theme.typography.labelSm,
                  {
                    color: theme.colors.feedback.success.foreground,
                    letterSpacing: 0.6,
                  },
                ]}
              >
                RELEASED
              </Text>
            </View>
          ) : isNext ? (
            <ChipButton
              theme={theme}
              title={loading ? "Releasing…" : "Release"}
              tone="primary"
              disabled={disabled}
              loading={loading}
              onPress={onPress}
            />
          ) : (
            <View
              style={{
                backgroundColor: theme.colors.surface.subtle,
                borderColor: theme.colors.border.default,
                borderWidth: theme.borderWidth.thin,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 4,
              }}
            >
              <Text
                style={[
                  theme.typography.labelSm,
                  {
                    color: theme.colors.text.muted,
                    letterSpacing: 0.6,
                  },
                ]}
              >
                LOCKED
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

interface ChipButtonProps {
  theme: AppTheme;
  title: string;
  tone: "primary" | "neutral";
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

function ChipButton({
  theme,
  title,
  tone,
  disabled,
  loading,
  onPress,
}: ChipButtonProps) {
  const palette =
    tone === "primary"
      ? {
          background: theme.colors.action.primary.background,
          foreground: theme.colors.action.primary.foreground,
          border: theme.colors.action.primary.borderColor,
        }
      : {
          background: theme.colors.surface.default,
          foreground: theme.colors.text.secondary,
          border: theme.colors.border.default,
        };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: palette.background,
        borderColor: palette.border,
        borderWidth: theme.borderWidth.thin,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        minHeight: 32,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} size="small" />
      ) : null}
      <Text
        style={[
          theme.typography.labelSm,
          {
            color: palette.foreground,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

interface MilestonePillProps {
  theme: AppTheme;
  index: number;
  selected: boolean;
  recorded: boolean;
  hint: string;
  onPress: () => void;
}

function MilestonePill({
  theme,
  index,
  selected,
  recorded,
  hint,
  onPress,
}: MilestonePillProps) {
  const background = selected
    ? recorded
      ? theme.colors.feedback.success.background
      : theme.colors.role.farmer.background
    : theme.colors.surface.default;
  const border = selected
    ? recorded
      ? theme.colors.feedback.success.border
      : theme.colors.role.farmer.border
    : theme.colors.border.default;
  const foreground = selected
    ? recorded
      ? theme.colors.feedback.success.foreground
      : theme.colors.text.brand
    : theme.colors.text.secondary;
  const dotColor = recorded
    ? theme.colors.feedback.success.accent
    : selected
      ? theme.colors.text.brand
      : theme.colors.border.strong;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Milestone ${index}${recorded ? ", recorded" : ""}`}
      accessibilityHint={hint}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: background,
        borderColor: border,
        borderWidth: selected
          ? theme.borderWidth.strong
          : theme.borderWidth.thin,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 8,
        minWidth: 68,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          backgroundColor: dotColor,
        }}
      />
      <Text
        style={[
          theme.typography.labelSm,
          {
            color: foreground,
            letterSpacing: 0.6,
          },
        ]}
      >
        M{index}
        {recorded ? " ✓" : ""}
      </Text>
    </TouchableOpacity>
  );
}

// --- helpers -----------------------------------------------------------------

function isReleaseComplete(
  releaseIndex: number,
  releasedBitmap: number | undefined,
  releases: readonly { releaseIndex: number }[],
) {
  return (
    Boolean(releasedBitmap && (releasedBitmap & (1 << releaseIndex)) !== 0) ||
    releases.some((release) => release.releaseIndex === releaseIndex)
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

function splitFormattedAmount(formatted: string) {
  const lastSpace = formatted.lastIndexOf(" ");
  if (lastSpace === -1) return { value: formatted, suffix: "" };
  return {
    value: formatted.slice(0, lastSpace),
    suffix: formatted.slice(lastSpace + 1),
  };
}

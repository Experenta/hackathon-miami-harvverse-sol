import { useCallback, useEffect, useMemo, useState } from "react";
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
  buildClaimMockUsdcTx,
  fetchLotByPda,
  fetchPartnerProfileByWallet,
  formatMockUsdcBaseUnits,
  LotStatus,
  mockUsdcBaseUnitsToNumber,
  usdcCentsToMockUsdcBaseUnits,
  ZAFIRO_RELEASE_LABELS,
} from "@repo/solana-client";
import {
  ActionBar,
  Badge,
  Banner,
  Button,
  Card,
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
import {
  useMockUsdcWalletBalance,
  usePartnershipEscrowBalances,
} from "@/features/partner/use-mock-usdc";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";
import { ellipsify } from "@/utils/ellipsify";

export default function ReservePartnershipScreen() {
  const { lotCode } = useLocalSearchParams<{ lotCode: string }>();
  const { account, client } = useMobileWallet();
  const { selectedNetwork } = useNetwork();
  const router = useRouter();
  const { theme } = useTheme();
  const { signAndSendWithSigner, isPending, error: txError } = useTransaction();

  const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
  const createFundedReservation = useMutation(
    api.partnerships.createFundedReservation,
  );
  const recordBalanceSnapshot = useMutation(
    api.mockUsdcBalanceSnapshots.recordSnapshot,
  );
  const syncStatusFromChain = useMutation(api.lots.syncStatusFromChain);

  const [reserveData, setReserveData] = useState<ReserveFlowResult | null>(
    null,
  );
  const [isComputing, setIsComputing] = useState(false);
  const [reservedTx, setReservedTx] = useState<string | null>(null);
  const [faucetTx, setFaucetTx] = useState<string | null>(null);
  const [ticketConfirmation, setTicketConfirmation] = useState("3425.00");
  const [activeTxKind, setActiveTxKind] = useState<"faucet" | "reserve" | null>(
    null,
  );
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
  const walletMockUsdc = useMockUsdcWalletBalance(wallet);
  const escrowBalances = usePartnershipEscrowBalances({
    partnershipPda: reserveData?.partnershipPda.toString(),
    partnerWallet: wallet,
    farmerWallet: lot?.farmerWallet,
  });

  const refreshLotStatus = useCallback(async () => {
    if (!lot?.lotPda) {
      setLiveLotStatus(null);
      return null;
    }

    setIsRefreshingLotStatus(true);
    setLotStatusError(null);

    try {
      const onChainLot = await fetchLotByPda(client.rpc, lot.lotPda as Address);
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

  const ticketBaseUnits = useMemo(
    () => usdcCentsToMockUsdcBaseUnits(lot?.ticketUsdcCents ?? 0),
    [lot?.ticketUsdcCents],
  );
  const ticketInputCents = useMemo(
    () => parseTicketCents(ticketConfirmation),
    [ticketConfirmation],
  );
  const ticketMatches = Boolean(
    lot && ticketInputCents === lot.ticketUsdcCents,
  );
  const partnerBalanceBaseUnits =
    walletMockUsdc.data?.balance.amountBaseUnits ?? 0n;
  const partnerHasFunds = partnerBalanceBaseUnits >= ticketBaseUnits;
  const paymentConfigExists = walletMockUsdc.data?.paymentConfigExists === true;
  const releaseTotalBaseUnits = useMemo(
    () => sumBigints(reserveData?.releaseAmounts ?? []),
    [reserveData?.releaseAmounts],
  );
  const heldReserveBaseUnits =
    ticketBaseUnits > releaseTotalBaseUnits
      ? ticketBaseUnits - releaseTotalBaseUnits
      : 0n;

  const recordSnapshot = useCallback(
    async (input: {
      wallet?: string;
      tokenAccount: string;
      mint: string;
      role: "partner" | "farmer" | "vault" | "other";
      balanceBaseUnits: bigint;
      balanceUiAmount: number;
      sourceTx?: string;
    }) => {
      try {
        await recordBalanceSnapshot({
          wallet: input.wallet,
          tokenAccount: input.tokenAccount,
          mint: input.mint,
          role: input.role,
          balanceBaseUnits: Number(input.balanceBaseUnits),
          balanceUiAmount: input.balanceUiAmount,
          sourceTx: input.sourceTx,
        });
      } catch (err) {
        console.warn("Failed to record mockUSDC balance snapshot:", err);
      }
    },
    [recordBalanceSnapshot],
  );

  const handleClaimMockUsdc = useCallback(async () => {
    const currentBalance =
      walletMockUsdc.data ?? (await walletMockUsdc.refresh());
    const mint = currentBalance?.mint;
    if (!mint) {
      Alert.alert(
        "mockUSDC unavailable",
        "The payment config is not ready on this cluster.",
      );
      return;
    }

    setActiveTxKind("faucet");
    try {
      const result = await signAndSendWithSigner((signer) =>
        buildClaimMockUsdcTx({
          claimant: signer,
          mockUsdcMint: mint,
        }),
      );
      setFaucetTx(result.signature);
      const nextBalance = await walletMockUsdc.refresh();
      if (nextBalance) {
        await recordSnapshot({
          wallet,
          tokenAccount: nextBalance.tokenAccount.toString(),
          mint: nextBalance.mint.toString(),
          role: "partner",
          balanceBaseUnits: nextBalance.balance.amountBaseUnits,
          balanceUiAmount: nextBalance.balance.uiAmount,
          sourceTx: result.signature,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Faucet failed";
      Alert.alert("Transaction Failed", message);
    } finally {
      setActiveTxKind(null);
    }
  }, [signAndSendWithSigner, recordSnapshot, wallet, walletMockUsdc]);

  const handleReserve = useCallback(async () => {
    if (!reserveData || !lot || !lot.lotPda) return;
    if (!hasPartnerProfile) {
      Alert.alert(
        "Partner Profile Required",
        "Create your on-chain partner profile before reserving a partnership.",
      );
      return;
    }
    if (!paymentConfigExists) {
      Alert.alert(
        "mockUSDC not initialized",
        "Initialize the demo payment config for this cluster before funding reservations.",
      );
      return;
    }
    if (!ticketMatches) {
      Alert.alert(
        "Ticket value mismatch",
        `Enter exactly ${formatTicketInput(lot.ticketUsdcCents)} to fund this lot.`,
      );
      return;
    }

    const latestBalance = await walletMockUsdc.refresh();
    if (
      !latestBalance ||
      latestBalance.balance.amountBaseUnits < ticketBaseUnits
    ) {
      Alert.alert(
        "Insufficient mockUSDC",
        "Use the demo faucet before funding this reservation.",
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

    setActiveTxKind("reserve");
    try {
      const result = await signAndSendWithSigner((signer) =>
        buildReserveInstruction(
          signer,
          lot.lotPda! as Address,
          reserveData.termsHash,
          lot.ticketUsdcCents,
          reserveData.mockUsdcMint,
          reserveData.partnerMockUsdcAta,
          reserveData.releaseAmounts,
        ),
      );

      await createFundedReservation({
        lotCode: lot.lotCode,
        lotPda: lot.lotPda,
        farmerWallet: lot.farmerWallet,
        partnerWallet: wallet,
        termsHash: reserveData.termsHashHex,
        partnershipPda: reserveData.partnershipPda.toString(),
        ticketUsdcCents: lot.ticketUsdcCents,
        mockUsdcMint: reserveData.mockUsdcMint.toString(),
        escrowVault: reserveData.vaultTokenAccount.toString(),
        escrowPda: reserveData.partnershipEscrowPda.toString(),
        fundingTx: result.signature,
        depositedAmountBaseUnits: Number(ticketBaseUnits),
        releasedAmountBaseUnits: 0,
        reserveAmountBaseUnits: Number(heldReserveBaseUnits),
        releaseScheduleBaseUnits: reserveData.releaseAmounts.map((amount) =>
          Number(amount),
        ),
      });
      await syncStatusFromChain({
        lotCode: lot.lotCode,
        status: mapOnChainLotStatusToApp(LotStatus.InCycle),
      });

      setLiveLotStatus(LotStatus.InCycle);
      setReservedTx(result.signature);

      const [nextWalletBalance, nextEscrowBalance] = await Promise.all([
        walletMockUsdc.refresh(),
        escrowBalances.refresh(),
      ]);
      if (nextWalletBalance) {
        await recordSnapshot({
          wallet,
          tokenAccount: nextWalletBalance.tokenAccount.toString(),
          mint: nextWalletBalance.mint.toString(),
          role: "partner",
          balanceBaseUnits: nextWalletBalance.balance.amountBaseUnits,
          balanceUiAmount: nextWalletBalance.balance.uiAmount,
          sourceTx: result.signature,
        });
      }
      if (nextEscrowBalance) {
        await recordSnapshot({
          tokenAccount: nextEscrowBalance.vaultTokenAccount.toString(),
          mint: nextEscrowBalance.mint.toString(),
          role: "vault",
          balanceBaseUnits: nextEscrowBalance.vaultBalance.amountBaseUnits,
          balanceUiAmount: nextEscrowBalance.vaultBalance.uiAmount,
          sourceTx: result.signature,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reservation failed";
      Alert.alert("Transaction Failed", message);
    } finally {
      setActiveTxKind(null);
    }
  }, [
    reserveData,
    lot,
    wallet,
    hasPartnerProfile,
    paymentConfigExists,
    ticketMatches,
    walletMockUsdc,
    ticketBaseUnits,
    refreshLotStatus,
    signAndSendWithSigner,
    createFundedReservation,
    syncStatusFromChain,
    heldReserveBaseUnits,
    escrowBalances,
    recordSnapshot,
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

  const ticketDisplay = formatUsdCents(lot.ticketUsdcCents);
  const isProfileReady = hasPartnerProfile === true;
  const liveStatusLabel =
    liveLotStatus === null
      ? null
      : formatLotStatusLabel(mapOnChainLotStatusToApp(liveLotStatus));
  const convexStatusLabel = formatLotStatusLabel(lot.status);
  const isStatusOutOfSync =
    liveLotStatus !== null &&
    mapOnChainLotStatusToApp(liveLotStatus) !== lot.status;
  const reserveBlockedReason = !isProfileReady
    ? "Create and verify the PartnerProfile before reserving."
    : !paymentConfigExists
      ? "mockUSDC is not initialized on this cluster."
      : !ticketMatches
        ? `Enter exactly ${formatTicketInput(lot.ticketUsdcCents)}.`
        : !partnerHasFunds
          ? "Use the demo faucet before funding this ticket."
          : getReserveBlockedReason(liveLotStatus);
  const canReserve =
    !!reserveData &&
    !isComputing &&
    !isPending &&
    !isRefreshingLotStatus &&
    isProfileReady &&
    paymentConfigExists &&
    ticketMatches &&
    partnerHasFunds &&
    isReservableLotStatus(liveLotStatus);

  if (reservedTx) {
    return (
      <Screen scrollable>
        <Animated.View entering={FadeInDown.duration(250)}>
          <ScreenHeader
            showBack
            eyebrow="Escrow funded"
            title="Partnership active"
            subtitle="The ticket moved into the program vault and the funded partnership is mirrored for mobile milestone tracking."
          />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(50).duration(200)}>
          <TxStatus state="confirmed" signature={ellipsify(reservedTx)} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(75).duration(250)}>
          <Section
            title="Funding record"
            description="Live token balances come from Solana RPC. Convex stores the transaction references and proof timeline."
            aside={<Badge label="Active" tone="success" />}
          >
            <Card variant="success">
              <DetailRow label="Lot" value={lot.lotCode} />
              <DetailRow label="Ticket funded" value={ticketDisplay} />
              <DetailRow
                label="Escrow vault"
                value={ellipsify(
                  reserveData?.vaultTokenAccount.toString() ?? "",
                )}
                mono
                valueTone="secondary"
              />
              <DetailRow
                label="Funding tx"
                value={ellipsify(reservedTx)}
                mono
                valueTone="secondary"
              />
              {escrowBalances.data ? (
                <>
                  <DetailRow
                    label="Vault balance"
                    value={formatMockUsdcBaseUnits(
                      escrowBalances.data.vaultBalance.amountBaseUnits,
                    )}
                  />
                  <DetailRow
                    label="Held reserve"
                    value={formatMockUsdcBaseUnits(
                      escrowBalances.data.reserveAmountBaseUnits,
                    )}
                    helper="Not Partner profit"
                  />
                </>
              ) : null}
            </Card>
          </Section>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(50).duration(200)}>
          <ActionBar>
            <Button
              title="Back to Dashboard"
              variant="secondary"
              onPress={() => router.replace("/(partner)/home" as Href)}
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
          eyebrow="Escrow funding"
          title="Fund partnership"
          subtitle="Confirm the ticket, mint demo mockUSDC if needed, and fund the vault before the partnership becomes active."
        />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(50).duration(200)}>
        <Section
          description="mockUSDC is demo-only, cluster-scoped, and has no cash value."
          aside={<Badge label="Partner flow" tone="partner" />}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: theme.spacing.sm,
            }}
          >
            <StatusPill label={selectedNetwork.label} tone="accent" />
            <StatusPill
              label={paymentConfigExists ? "mockUSDC ready" : "mockUSDC setup"}
              tone={paymentConfigExists ? "success" : "warning"}
            />
            <StatusPill
              label={isProfileReady ? "Profile ready" : "Profile check"}
              tone={isProfileReady ? "success" : "warning"}
            />
            <StatusPill
              label={`Lot: ${liveStatusLabel ?? convexStatusLabel}`}
              tone={
                isReservableLotStatus(liveLotStatus) ? "success" : "warning"
              }
            />
          </View>
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(75).duration(250)}>
        <Section
          title="Opportunity economics"
          description="The app funds the full ticket first. Scheduled releases move only the planned operating tranches."
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
              helper={formatMockUsdcBaseUnits(ticketBaseUnits)}
              eyebrow="Required"
              tone="partner"
              style={{ minWidth: 160 }}
            />
            <MetricCard
              label="Planned releases"
              value={formatMockUsdcBaseUnits(releaseTotalBaseUnits)}
              helper="Milestones + service"
              tone="success"
              style={{ minWidth: 160 }}
            />
            <MetricCard
              label="Held reserve"
              value={formatMockUsdcBaseUnits(heldReserveBaseUnits)}
              helper="Contingency and working capital"
              tone="info"
              style={{ minWidth: 160 }}
            />
          </View>
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(50).duration(250)}>
        <Section
          title="mockUSDC wallet"
          description="The faucet creates your token account if needed and mints 5,000 demo mockUSDC per claim."
          aside={<Badge label="Demo token" tone="warning" />}
        >
          {walletMockUsdc.error ? (
            <Banner
              tone="warning"
              title="Balance check failed"
              description={walletMockUsdc.error.message}
            />
          ) : null}
          <Card variant="info">
            <DetailRow
              label="Partner balance"
              value={
                walletMockUsdc.isLoading
                  ? "Refreshing"
                  : formatMockUsdcBaseUnits(partnerBalanceBaseUnits)
              }
              helper={`${mockUsdcBaseUnitsToNumber(
                partnerBalanceBaseUnits,
              ).toLocaleString()} UI amount`}
            />
            {walletMockUsdc.data ? (
              <>
                <DetailRow
                  label="Partner ATA"
                  value={ellipsify(walletMockUsdc.data.tokenAccount.toString())}
                  mono
                  valueTone="secondary"
                />
                <DetailRow
                  label="mockUSDC mint"
                  value={ellipsify(walletMockUsdc.data.mint.toString())}
                  mono
                  valueTone="secondary"
                />
              </>
            ) : null}
            {faucetTx ? (
              <DetailRow
                label="Last faucet tx"
                value={ellipsify(faucetTx)}
                mono
                valueTone="secondary"
              />
            ) : null}
          </Card>
          <Button
            title="Get mockUSDC"
            variant="accent"
            onPress={handleClaimMockUsdc}
            loading={isPending && activeTxKind === "faucet"}
            disabled={isPending || !wallet}
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(50).duration(250)}>
        <Section
          title="Reservation context"
          description="Human-readable fields stay primary before the funded commitment is signed."
          aside={<Badge label={lot.lotCode} tone="neutral" />}
        >
          {isStatusOutOfSync ? (
            <Banner
              tone="warning"
              title="Lot state changed on-chain"
              description={`Convex still shows ${convexStatusLabel}, but the live account is ${liveStatusLabel}. The reserve flow follows the live status.`}
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

      <Animated.View entering={FadeInUp.delay(150).duration(250)}>
        <Section
          title="Ticket confirmation"
          description="The program rejects any value that does not exactly match the lot ticket."
        >
          <FormField
            label="Ticket value"
            value={ticketConfirmation}
            onChangeText={setTicketConfirmation}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
            required
            hint={`Required: ${formatTicketInput(lot.ticketUsdcCents)}`}
            error={
              ticketConfirmation.length > 0 && !ticketMatches
                ? `Enter exactly ${formatTicketInput(lot.ticketUsdcCents)}.`
                : undefined
            }
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(250).duration(250)}>
        <Section
          title="Escrow mechanics"
          description="The vault is an associated token account owned by the Harvverse PDA authority."
          aside={<Badge label="Derived" tone="info" />}
        >
          {isComputing ? (
            <Banner
              tone="info"
              title="Computing escrow addresses"
              description="The terms hash, partnership PDA, and vault ATA are being derived from the lot data."
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
                value={ellipsify(reserveData.partnershipPda.toString())}
                mono
                valueTone="secondary"
              />
              <DetailRow
                label="Escrow PDA"
                value={ellipsify(reserveData.partnershipEscrowPda.toString())}
                mono
                valueTone="secondary"
              />
              <DetailRow
                label="Vault authority"
                value={ellipsify(reserveData.vaultAuthority.toString())}
                mono
                valueTone="secondary"
              />
              <DetailRow
                label="Vault token account"
                value={ellipsify(reserveData.vaultTokenAccount.toString())}
                mono
                valueTone="secondary"
              />
            </Card>
          ) : (
            <Banner
              tone="error"
              title="Failed to compute escrow terms"
              description="The reserve review could not derive the required terms hash and vault addresses."
            />
          )}
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(75).duration(250)}>
        <Section
          title="Release schedule"
          description="Only the operating tranches move to the farmer. The remaining reserve stays labeled separately."
        >
          <View style={{ gap: theme.spacing.sm }}>
            {(reserveData?.releaseAmounts ?? []).map((amount, index) => (
              <Card
                key={`${ZAFIRO_RELEASE_LABELS[index]}-${index}`}
                variant={index === 0 ? "success" : "default"}
                style={{
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                }}
              >
                <DetailRow
                  label={ZAFIRO_RELEASE_LABELS[index] ?? `R${index}`}
                  value={formatMockUsdcBaseUnits(amount)}
                  helper={
                    index === 0
                      ? "Kickoff release after funding"
                      : `Unlocked by M${index + 1} proof`
                  }
                />
              </Card>
            ))}
          </View>
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(75).duration(250)}>
        <Section title="Funding readiness">
          {isRefreshingLotStatus ? (
            <Banner
              tone="info"
              title="Refreshing live lot status"
              description="The app is checking the current on-chain status before enabling funding."
              accessory={<ActivityIndicator size="small" />}
            />
          ) : null}
          {!isRefreshingLotStatus && !isReservableLotStatus(liveLotStatus) ? (
            <Banner
              tone="warning"
              title="Lot cannot be funded"
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
              description="Verifying that the connected wallet owns the required PartnerProfile PDA."
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
                onPress={() => router.push("/(partner)/profile" as Href)}
              />
            </Banner>
          ) : (
            <Banner
              tone="success"
              title="Partner profile verified"
              description="The wallet is eligible to sign the funded reservation transaction."
            />
          )}
          {paymentConfigExists ? null : (
            <Banner
              tone="warning"
              title="mockUSDC setup required"
              description="Run the cluster mockUSDC setup script before using the mobile escrow demo."
            />
          )}
          {partnerHasFunds ? null : (
            <Banner
              tone="warning"
              title="Insufficient demo balance"
              description={`Funding requires ${formatMockUsdcBaseUnits(ticketBaseUnits)}.`}
            />
          )}
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(250)}>
        <Section
          title="Transaction summary"
          description="Review the exact accounts the wallet will sign for."
        >
          <Card variant="info">
            <DetailRow label="Cluster" value={selectedNetwork.label} />
            <DetailRow
              label="Fee payer"
              value={wallet ? ellipsify(wallet) : "Wallet required"}
              mono
              valueTone="secondary"
            />
            <DetailRow label="Lot" value={lot.lotCode} />
            <DetailRow label="Ticket" value={ticketDisplay} />
            <DetailRow
              label="Token mint"
              value={ellipsify(
                reserveData?.mockUsdcMint.toString() ??
                  walletMockUsdc.data?.mint.toString() ??
                  "",
              )}
              mono
              valueTone="secondary"
            />
            <DetailRow
              label="Partner token account"
              value={ellipsify(
                reserveData?.partnerMockUsdcAta.toString() ??
                  walletMockUsdc.data?.tokenAccount.toString() ??
                  "",
              )}
              mono
              valueTone="secondary"
            />
            <DetailRow
              label="Escrow vault"
              value={ellipsify(reserveData?.vaultTokenAccount.toString() ?? "")}
              mono
              valueTone="secondary"
            />
          </Card>
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(350).duration(200)}>
        <ActionBar>
          <Button
            title="Sign, fund, and reserve"
            onPress={handleReserve}
            disabled={!canReserve}
            loading={isPending && activeTxKind === "reserve"}
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
              {reserveBlockedReason}
            </Text>
          ) : null}
        </ActionBar>
      </Animated.View>

      {isPending ? (
        <TxStatus
          state="pending"
          signature={
            activeTxKind === "faucet"
              ? "Requesting faucet mint"
              : "Funding escrow"
          }
        />
      ) : null}
      {txError ? (
        <TxStatus state="failed" errorMessage={txError.message} />
      ) : null}
    </Screen>
  );
}

function formatUsdCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTicketInput(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

function parseTicketCents(value: string) {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function sumBigints(values: readonly (number | bigint)[]): bigint {
  return values.reduce<bigint>((total, value) => total + BigInt(value), 0n);
}

"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  fetchMaybeProgramConfig,
  fetchMaybeUserRole,
  fetchMaybeFarmerProfile,
  fetchMaybePartnerProfile,
  fetchMaybeLot,
  fetchMaybePartnership,
  fetchMaybeSettlementReceipt,
  getCreateFarmerProfileInstructionAsync,
  getCreateLotInstructionAsync,
  getCreatePartnerProfileInstructionAsync,
  getInitializeConfigInstructionAsync,
  getPublishLotInstructionAsync,
  getRecordMilestoneInstruction,
  getRecordSettlementInstructionAsync,
  getRegisterRoleInstructionAsync,
  getReservePartnershipInstructionAsync,
  HARVVERSE_PROGRAM_ID,
  LotStatus,
  RoleKind,
  ZAFIRO_FARMER_SHARE_BPS,
  ZAFIRO_LOT_CODE,
  ZAFIRO_PARTNER_SHARE_BPS,
  ZAFIRO_TICKET_USDC_CENTS,
  computeTermsHash,
  deriveConfigPda,
  deriveFarmerProfilePda,
  deriveLotPda,
  deriveMilestoneReceiptPda,
  derivePartnerProfilePda,
  derivePartnershipPda,
  deriveSettlementReceiptPda,
  deriveUserRolePda,
  parseTransactionError,
} from "@repo/solana-client";
import type { Address } from "@solana/kit";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { useWallet } from "../lib/wallet/context";
import { useSolanaClient } from "../lib/solana-client-context";
import { useCluster } from "./cluster-context";

type TxLogEntry = {
  label: string;
  signature: string;
  at: number;
};

async function sha256String(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return new Uint8Array(digest);
}

function bytesToHexShort(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < Math.min(bytes.length, 4); i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return `${hex}…`;
}

const lotStatusLabel = (status: number): string => LotStatus[status] ?? "?";
const roleLabel = (role: number): string => RoleKind[role] ?? "?";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? "Sending…" : children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="cursor-pointer rounded-lg border border-border-low px-3 py-1.5 text-sm font-medium transition hover:bg-cream disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? "…" : children}
    </button>
  );
}

function KeyVal({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span className="text-xs uppercase text-muted">{k}</span>
      <span className="break-all font-mono">{v}</span>
    </div>
  );
}

export function HarvverseDemo() {
  const { signer, status, wallet } = useWallet();
  const { send, isSending } = useSendTransaction();
  const { getExplorerUrl } = useCluster();
  const solanaClient = useSolanaClient();
  const walletAddress = wallet?.account.address as Address | undefined;

  const [txLog, setTxLog] = useState<TxLogEntry[]>([]);

  // Section 1: config
  const [configState, setConfigState] = useState<{
    pda?: Address;
    authority?: string;
    treasury?: string;
    enabled?: boolean;
    exists?: boolean;
  } | null>(null);
  const [busyConfig, setBusyConfig] = useState(false);

  // Section 2: role
  const [roleState, setRoleState] = useState<{
    pda?: Address;
    role?: number;
    exists?: boolean;
  } | null>(null);
  const [busyRole, setBusyRole] = useState<"Farmer" | "Partner" | "fetch" | null>(
    null,
  );

  // Section 3: farmer profile
  const [displayName, setDisplayName] = useState("Carlos Mendoza");
  const [farmerProfileState, setFarmerProfileState] = useState<{
    pda?: Address;
    exists?: boolean;
  } | null>(null);
  const [busyFarmerProfile, setBusyFarmerProfile] = useState(false);

  // Section 4: lot
  const [lotCode, setLotCode] = useState<string>(ZAFIRO_LOT_CODE);
  const [farmName, setFarmName] = useState<string>("Finca Zafiro");
  const [ticket, setTicket] = useState<number>(ZAFIRO_TICKET_USDC_CENTS);
  const [farmerBps, setFarmerBps] = useState<number>(ZAFIRO_FARMER_SHARE_BPS);
  const [partnerBps, setPartnerBps] = useState<number>(ZAFIRO_PARTNER_SHARE_BPS);
  const [lotState, setLotState] = useState<{
    pda?: Address;
    status?: number;
    exists?: boolean;
  } | null>(null);
  const [busyLot, setBusyLot] = useState<"create" | "publish" | "fetch" | null>(
    null,
  );

  // Section 5: partner / partnership
  const [partnerProfileState, setPartnerProfileState] = useState<{
    pda?: Address;
    exists?: boolean;
  } | null>(null);
  const [partnershipState, setPartnershipState] = useState<{
    pda?: Address;
    status?: number;
    exists?: boolean;
  } | null>(null);
  const [busyPartner, setBusyPartner] = useState<
    "profile" | "reserve" | null
  >(null);

  // Section 6: milestones / settlement
  const [busyMilestones, setBusyMilestones] = useState(false);
  const [milestonesDone, setMilestonesDone] = useState(0);
  const [busySettlement, setBusySettlement] = useState(false);
  const [settlementState, setSettlementState] = useState<{
    pda?: Address;
    exists?: boolean;
  } | null>(null);

  const appendTx = useCallback((label: string, signature: string) => {
    setTxLog((prev) => [
      { label, signature, at: Date.now() },
      ...prev,
    ]);
  }, []);

  const runTx = useCallback(
    async (
      label: string,
      build: () => Promise<Awaited<ReturnType<typeof send>> | null>,
    ): Promise<string | null> => {
      try {
        const sig = await build();
        if (sig) {
          appendTx(label, sig);
          toast.success(`${label} confirmed`, {
            description: (
              <a
                href={getExplorerUrl(`/tx/${sig}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View transaction
              </a>
            ),
          });
        }
        return sig;
      } catch (err) {
        console.error(`${label} failed:`, err);
        toast.error(parseTransactionError(err));
        return null;
      }
    },
    [appendTx, getExplorerUrl],
  );

  // ---------- SECTION 1 ----------
  const fetchConfig = useCallback(async () => {
    setBusyConfig(true);
    try {
      const pda = await deriveConfigPda();
      const account = await fetchMaybeProgramConfig(solanaClient.rpc, pda);
      if (!account.exists) {
        setConfigState({ pda, exists: false });
        toast.message("Config not initialized yet", {
          description: "Run scripts/init-config.ts to bootstrap.",
        });
        return;
      }
      setConfigState({
        pda,
        exists: true,
        authority: account.data.authority,
        treasury: account.data.treasury,
        enabled: account.data.roleRegistrationEnabled,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch config");
    } finally {
      setBusyConfig(false);
    }
  }, [solanaClient]);

  // ---------- SECTION 2 ----------
  const registerAs = useCallback(
    async (role: "Farmer" | "Partner") => {
      if (!signer) return;
      setBusyRole(role);
      try {
        const ix = await getRegisterRoleInstructionAsync({
          user: signer,
          role: role === "Farmer" ? RoleKind.Farmer : RoleKind.Partner,
        });
        const sig = await runTx(`register_role(${role})`, () =>
          send({ instructions: [ix] }),
        );
        if (sig) await fetchRole();
      } finally {
        setBusyRole(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signer, send, runTx],
  );

  const fetchRole = useCallback(async () => {
    if (!walletAddress) return;
    setBusyRole("fetch");
    try {
      const pda = await deriveUserRolePda(walletAddress);
      const account = await fetchMaybeUserRole(solanaClient.rpc, pda);
      setRoleState(
        account.exists
          ? { pda, exists: true, role: account.data.role }
          : { pda, exists: false },
      );
    } finally {
      setBusyRole(null);
    }
  }, [walletAddress, solanaClient]);

  // ---------- SECTION 3 ----------
  const createFarmerProfile = useCallback(async () => {
    if (!signer || !walletAddress) return;
    setBusyFarmerProfile(true);
    try {
      const displayNameHash = await sha256String(displayName);
      const metadataUriHash = await sha256String(
        `ipfs://farmer-profile/${displayName}`,
      );

      const ix = await getCreateFarmerProfileInstructionAsync({
        farmer: signer,
        displayNameHash,
        metadataUriHash,
      });
      const sig = await runTx("create_farmer_profile", () =>
        send({ instructions: [ix] }),
      );
      if (sig) {
        const pda = await deriveFarmerProfilePda(walletAddress);
        const acct = await fetchMaybeFarmerProfile(solanaClient.rpc, pda);
        setFarmerProfileState({ pda, exists: acct.exists });
      }
    } finally {
      setBusyFarmerProfile(false);
    }
  }, [signer, walletAddress, displayName, send, runTx, solanaClient]);

  // ---------- SECTION 4 ----------
  const autofillLot = useCallback(() => {
    setLotCode(ZAFIRO_LOT_CODE);
    setFarmName("Finca Zafiro");
    setTicket(ZAFIRO_TICKET_USDC_CENTS);
    setFarmerBps(ZAFIRO_FARMER_SHARE_BPS);
    setPartnerBps(ZAFIRO_PARTNER_SHARE_BPS);
  }, []);

  const createLot = useCallback(async () => {
    if (!signer || !walletAddress) return;
    setBusyLot("create");
    try {
      const lotIdHash = await sha256String(lotCode);
      const metadataHash = await sha256String(
        `meta:${lotCode}:${farmName}`,
      );
      const planHash = await sha256String(`plan:${lotCode}`);
      const mediaManifestHash = await sha256String(`media:${lotCode}`);
      const sensorManifestHash = await sha256String(`sensors:${lotCode}`);

      const ix = await getCreateLotInstructionAsync({
        farmer: signer,
        lotIdHash,
        metadataHash,
        planHash,
        mediaManifestHash,
        sensorManifestHash,
        ticketUsdcCents: BigInt(ticket),
        farmerShareBps: farmerBps,
        partnerShareBps: partnerBps,
      });

      const sig = await runTx("create_lot", () =>
        send({ instructions: [ix] }),
      );
      if (sig) {
        const pda = await deriveLotPda(walletAddress, lotIdHash);
        const acct = await fetchMaybeLot(solanaClient.rpc, pda);
        setLotState(
          acct.exists
            ? { pda, exists: true, status: acct.data.status }
            : { pda, exists: false },
        );
      }
    } finally {
      setBusyLot(null);
    }
  }, [
    signer,
    walletAddress,
    lotCode,
    farmName,
    ticket,
    farmerBps,
    partnerBps,
    send,
    runTx,
    solanaClient,
  ]);

  const publishLot = useCallback(async () => {
    if (!signer || !walletAddress || !lotState?.pda) return;
    setBusyLot("publish");
    try {
      const ix = await getPublishLotInstructionAsync({
        farmer: signer,
        lot: lotState.pda,
      });
      const sig = await runTx("publish_lot", () =>
        send({ instructions: [ix] }),
      );
      if (sig) {
        const acct = await fetchMaybeLot(solanaClient.rpc, lotState.pda);
        setLotState((prev) =>
          prev
            ? {
                ...prev,
                status: acct.exists ? acct.data.status : prev.status,
              }
            : prev,
        );
      }
    } finally {
      setBusyLot(null);
    }
  }, [signer, walletAddress, lotState, send, runTx, solanaClient]);

  // ---------- SECTION 5 ----------
  const createPartnerProfile = useCallback(async () => {
    if (!signer || !walletAddress) return;
    setBusyPartner("profile");
    try {
      const displayNameHash = await sha256String(displayName);
      const metadataUriHash = await sha256String(
        `ipfs://partner-profile/${displayName}`,
      );
      const ix = await getCreatePartnerProfileInstructionAsync({
        partner: signer,
        displayNameHash,
        metadataUriHash,
      });
      const sig = await runTx("create_partner_profile", () =>
        send({ instructions: [ix] }),
      );
      if (sig) {
        const pda = await derivePartnerProfilePda(walletAddress);
        const acct = await fetchMaybePartnerProfile(solanaClient.rpc, pda);
        setPartnerProfileState({ pda, exists: acct.exists });
      }
    } finally {
      setBusyPartner(null);
    }
  }, [signer, walletAddress, displayName, send, runTx, solanaClient]);

  const reservePartnership = useCallback(async () => {
    if (!signer || !walletAddress || !lotState?.pda) {
      toast.error("Need a lot PDA from Section 4 first");
      return;
    }
    setBusyPartner("reserve");
    try {
      const planHash = await sha256String(`plan:${lotCode}`);
      const metadataHash = await sha256String(`meta:${lotCode}:${farmName}`);
      const termsHash = await computeTermsHash({
        lotPda: lotState.pda,
        farmerWallet: walletAddress,
        partnerWallet: walletAddress,
        ticketUsdcCents: ticket,
        farmerShareBps: farmerBps,
        partnerShareBps: partnerBps,
        metadataHash,
        planHash,
        timestamp: Math.floor(Date.now() / 1000),
      });

      const ix = await getReservePartnershipInstructionAsync({
        partner: signer,
        lot: lotState.pda,
        termsHash,
      });
      const sig = await runTx("reserve_partnership", () =>
        send({ instructions: [ix] }),
      );
      if (sig) {
        const pda = await derivePartnershipPda(lotState.pda, walletAddress);
        const acct = await fetchMaybePartnership(solanaClient.rpc, pda);
        setPartnershipState(
          acct.exists
            ? { pda, exists: true, status: acct.data.status }
            : { pda, exists: false },
        );
      }
    } finally {
      setBusyPartner(null);
    }
  }, [
    signer,
    walletAddress,
    lotState,
    lotCode,
    farmName,
    ticket,
    farmerBps,
    partnerBps,
    send,
    runTx,
    solanaClient,
  ]);

  // ---------- SECTION 6 ----------
  const recordAllMilestones = useCallback(async () => {
    if (!signer || !partnershipState?.pda) {
      toast.error("Need a partnership PDA from Section 5 first");
      return;
    }
    setBusyMilestones(true);
    setMilestonesDone(0);
    try {
      for (let i = 1; i <= 6; i++) {
        const proofHash = await sha256String(
          `milestone:${partnershipState.pda}:${i}`,
        );
        const milestonePda = await deriveMilestoneReceiptPda(
          partnershipState.pda,
          i,
        );
        const ix = getRecordMilestoneInstruction({
          signer,
          partnership: partnershipState.pda,
          milestone: milestonePda,
          milestoneIndex: i,
          proofHash,
        });
        const sig = await runTx(`record_milestone(${i})`, () =>
          send({ instructions: [ix] }),
        );
        if (!sig) break;
        setMilestonesDone(i);
      }
    } finally {
      setBusyMilestones(false);
    }
  }, [signer, partnershipState, send, runTx]);

  const recordSettlement = useCallback(async () => {
    if (!signer || !partnershipState?.pda || !lotState?.pda) {
      toast.error("Need partnership and lot PDAs from earlier sections");
      return;
    }
    setBusySettlement(true);
    try {
      const settlementHash = await sha256String(
        `settle:${partnershipState.pda}`,
      );

      const ix = await getRecordSettlementInstructionAsync({
        signer,
        partnership: partnershipState.pda,
        lot: lotState.pda,
        yieldQq: 6,
        pricePerLbCents: 350,
        revenueUsdcCents: 174_930n,
        costUsdcCents: 149_000n,
        profitUsdcCents: 25_930n,
        farmerShareUsdcCents: 15_558n,
        partnerShareUsdcCents: 10_372n,
        settlementHash,
      });

      const sig = await runTx("record_settlement", () =>
        send({ instructions: [ix] }),
      );
      if (sig) {
        const pda = await deriveSettlementReceiptPda(partnershipState.pda);
        const acct = await fetchMaybeSettlementReceipt(solanaClient.rpc, pda);
        setSettlementState({ pda, exists: acct.exists });
      }
    } finally {
      setBusySettlement(false);
    }
  }, [signer, partnershipState, lotState, send, runTx, solanaClient]);

  const isConnected = status === "connected" && !!signer && !!walletAddress;
  const disabled = useMemo(() => !isConnected || isSending, [
    isConnected,
    isSending,
  ]);

  if (!isConnected) {
    return (
      <Section title="Harvverse Demo">
        <p className="text-sm text-muted">
          Connect your wallet to interact with the Harvverse program at{" "}
          <span className="font-mono">{HARVVERSE_PROGRAM_ID}</span>.
        </p>
      </Section>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1 */}
      <Section title="1. Program Info">
        <div className="grid gap-3 sm:grid-cols-2">
          <KeyVal
            k="Program ID"
            v={
              <a
                href={getExplorerUrl(`/address/${HARVVERSE_PROGRAM_ID}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {HARVVERSE_PROGRAM_ID}
              </a>
            }
          />
          <KeyVal k="Wallet" v={walletAddress} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={fetchConfig} loading={busyConfig}>
            Fetch Config PDA
          </PrimaryButton>
          {configState && (
            <span className="text-xs text-muted">
              {configState.exists ? "Loaded" : "Not initialized"}
            </span>
          )}
        </div>
        {configState?.exists && (
          <div className="grid gap-3 rounded-xl border border-border-low bg-cream/30 p-4 sm:grid-cols-2">
            <KeyVal k="Config PDA" v={configState.pda} />
            <KeyVal
              k="Authority"
              v={configState.authority ?? "—"}
            />
            <KeyVal k="Treasury" v={configState.treasury ?? "—"} />
            <KeyVal
              k="Role Registration"
              v={configState.enabled ? "enabled" : "disabled"}
            />
          </div>
        )}
      </Section>

      {/* SECTION 2 */}
      <Section title="2. Role Registration">
        <p className="text-sm text-muted">
          One role per wallet, immutable. The connected wallet can be either
          Farmer or Partner — not both.
        </p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton
            onClick={() => registerAs("Farmer")}
            disabled={disabled}
            loading={busyRole === "Farmer"}
          >
            Register as Farmer
          </PrimaryButton>
          <PrimaryButton
            onClick={() => registerAs("Partner")}
            disabled={disabled}
            loading={busyRole === "Partner"}
          >
            Register as Partner
          </PrimaryButton>
          <SecondaryButton
            onClick={fetchRole}
            disabled={disabled}
            loading={busyRole === "fetch"}
          >
            Check My Role
          </SecondaryButton>
        </div>
        {roleState && (
          <div className="grid gap-2 rounded-xl border border-border-low bg-cream/30 p-4 sm:grid-cols-2">
            <KeyVal k="UserRole PDA" v={roleState.pda} />
            <KeyVal
              k="Role"
              v={
                roleState.exists && roleState.role !== undefined
                  ? roleLabel(roleState.role)
                  : "not registered"
              }
            />
          </div>
        )}
      </Section>

      {/* SECTION 3 */}
      <Section title="3. Farmer Profile">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-muted">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-border-low bg-background px-3 py-2 font-mono"
          />
        </label>
        <PrimaryButton
          onClick={createFarmerProfile}
          disabled={disabled}
          loading={busyFarmerProfile}
        >
          Create Farmer Profile
        </PrimaryButton>
        {farmerProfileState && (
          <div className="rounded-xl border border-border-low bg-cream/30 p-4">
            <KeyVal k="FarmerProfile PDA" v={farmerProfileState.pda} />
          </div>
        )}
      </Section>

      {/* SECTION 4 */}
      <Section title="4. Create & Publish Lot">
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton onClick={autofillLot}>
            Autofill Zafiro Demo Lot
          </SecondaryButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-muted">Lot code</span>
            <input
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              className="rounded-lg border border-border-low bg-background px-3 py-2 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-muted">Farm name</span>
            <input
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="rounded-lg border border-border-low bg-background px-3 py-2 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-muted">
              Ticket (USDC cents)
            </span>
            <input
              type="number"
              value={ticket}
              onChange={(e) => setTicket(Number(e.target.value))}
              className="rounded-lg border border-border-low bg-background px-3 py-2 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-muted">Farmer bps</span>
            <input
              type="number"
              value={farmerBps}
              onChange={(e) => setFarmerBps(Number(e.target.value))}
              className="rounded-lg border border-border-low bg-background px-3 py-2 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-muted">Partner bps</span>
            <input
              type="number"
              value={partnerBps}
              onChange={(e) => setPartnerBps(Number(e.target.value))}
              className="rounded-lg border border-border-low bg-background px-3 py-2 font-mono"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton
            onClick={createLot}
            disabled={disabled}
            loading={busyLot === "create"}
          >
            Create Lot (Draft)
          </PrimaryButton>
          <PrimaryButton
            onClick={publishLot}
            disabled={disabled || !lotState?.pda}
            loading={busyLot === "publish"}
          >
            Publish Lot
          </PrimaryButton>
        </div>
        {lotState?.exists && (
          <div className="grid gap-2 rounded-xl border border-border-low bg-cream/30 p-4 sm:grid-cols-2">
            <KeyVal k="Lot PDA" v={lotState.pda} />
            <KeyVal
              k="Status"
              v={
                lotState.status !== undefined
                  ? lotStatusLabel(lotState.status)
                  : "—"
              }
            />
          </div>
        )}
      </Section>

      {/* SECTION 5 */}
      <Section title="5. Partner Actions">
        <p className="text-sm text-muted">
          For a real demo across two roles, connect a second wallet. The
          on-chain checks will reject these calls if your wallet is registered
          as Farmer.
        </p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton
            onClick={createPartnerProfile}
            disabled={disabled}
            loading={busyPartner === "profile"}
          >
            Create Partner Profile
          </PrimaryButton>
          <PrimaryButton
            onClick={reservePartnership}
            disabled={disabled || !lotState?.pda}
            loading={busyPartner === "reserve"}
          >
            Reserve Partnership
          </PrimaryButton>
        </div>
        {partnerProfileState && (
          <div className="rounded-xl border border-border-low bg-cream/30 p-4">
            <KeyVal
              k="PartnerProfile PDA"
              v={partnerProfileState.pda}
            />
          </div>
        )}
        {partnershipState?.exists && (
          <div className="grid gap-2 rounded-xl border border-border-low bg-cream/30 p-4 sm:grid-cols-2">
            <KeyVal k="Partnership PDA" v={partnershipState.pda} />
            <KeyVal
              k="Status"
              v={
                partnershipState.status !== undefined
                  ? PartnershipStatusLabel(partnershipState.status)
                  : "—"
              }
            />
          </div>
        )}
      </Section>

      {/* SECTION 6 */}
      <Section title="6. Milestones & Settlement">
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton
            onClick={recordAllMilestones}
            disabled={disabled || !partnershipState?.pda}
            loading={busyMilestones}
          >
            Record All 6 Milestones
          </PrimaryButton>
          <span className="text-xs text-muted">
            {milestonesDone > 0 ? `${milestonesDone}/6 recorded` : ""}
          </span>
        </div>
        <PrimaryButton
          onClick={recordSettlement}
          disabled={
            disabled || !partnershipState?.pda || !lotState?.pda
          }
          loading={busySettlement}
        >
          Record Settlement
        </PrimaryButton>
        {settlementState?.exists && (
          <div className="rounded-xl border border-border-low bg-cream/30 p-4">
            <KeyVal
              k="SettlementReceipt PDA"
              v={settlementState.pda}
            />
            <p className="mt-2 text-xs text-muted">
              Yield 6 qq · 350¢/lb · revenue 174,930 · profit 25,930 · farmer
              15,558 · partner 10,372
            </p>
          </div>
        )}
      </Section>

      {/* SECTION 7 */}
      <Section title="7. Transaction Log">
        {txLog.length === 0 ? (
          <p className="text-sm text-muted">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {txLog.map((entry) => (
              <li
                key={entry.signature}
                className="flex flex-col gap-0.5 rounded-lg border border-border-low bg-cream/20 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-xs text-muted">
                    {new Date(entry.at).toLocaleTimeString()}
                  </span>
                </div>
                <a
                  href={getExplorerUrl(`/tx/${entry.signature}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-mono text-xs underline underline-offset-2"
                >
                  {entry.signature}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function PartnershipStatusLabel(status: number): string {
  const names = ["Reserved", "Active", "Settled", "Cancelled"];
  return names[status] ?? "?";
}

// Suppress lint complaint about importing helper used only inside render.
void getInitializeConfigInstructionAsync;
void bytesToHexShort;

import type { Address, TransactionSigner } from "@solana/kit";
import {
  buildReservePartnershipTx,
  computeManifestHash,
  computeManifestHashHex,
  findPartnershipPda,
  type TermsManifest,
} from "@repo/solana-client";

export interface ReserveFlowInput {
  lotPda: string;
  farmerWallet: string;
  partnerWallet: string;
  ticketUsdcCents: number;
  farmerShareBps: number;
  partnerShareBps: number;
  metadataHash: string;
  planHash: string;
}

export interface ReserveFlowResult {
  termsHash: Uint8Array;
  termsHashHex: string;
  partnershipPda: Address;
  timestamp: number;
}

export async function computeReserveData(
  input: ReserveFlowInput,
): Promise<ReserveFlowResult> {
  const timestamp = Date.now();
  const termsManifest: TermsManifest = {
    lotPda: input.lotPda,
    farmerWallet: input.farmerWallet,
    partnerWallet: input.partnerWallet,
    ticketUsdcCents: input.ticketUsdcCents,
    farmerShareBps: input.farmerShareBps,
    partnerShareBps: input.partnerShareBps,
    metadataHash: input.metadataHash,
    planHash: input.planHash,
    timestamp,
  };

  const termsHash = await computeManifestHash(
    termsManifest as unknown as Record<string, unknown>,
  );
  const termsHashHex = await computeManifestHashHex(
    termsManifest as unknown as Record<string, unknown>,
  );
  const [partnershipPda] = await findPartnershipPda({
    lot: input.lotPda as Address,
    partner: input.partnerWallet as Address,
  });

  return {
    termsHash,
    termsHashHex,
    partnershipPda,
    timestamp,
  };
}

export async function buildReserveInstruction(
  signer: TransactionSigner,
  lotPda: Address,
  termsHash: Uint8Array,
) {
  const ix = await buildReservePartnershipTx({
    partner: signer,
    lotPda,
    termsHash,
  });
  return [ix];
}

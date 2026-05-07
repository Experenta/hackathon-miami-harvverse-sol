/**
 * Reserve flow logic for partnership reservation.
 *
 * Computes the terms hash from canonical JSON and builds the
 * reserve_partnership instruction for MWA signing.
 */

import type { Address, TransactionSendingSigner } from "@solana/kit";
import {
  buildCreateAssociatedTokenAccountIdempotentTx,
  computeManifestHash,
  computeManifestHashHex,
  deriveAssociatedTokenAccount,
  findMockUsdcMintPda,
  findPartnershipEscrowPda,
  buildReservePartnershipTx,
  findPartnershipPda,
  findVaultAuthorityPda,
  ZAFIRO_RELEASE_AMOUNTS_BASE_UNITS,
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
  partnershipEscrowPda: Address;
  vaultAuthority: Address;
  vaultTokenAccount: Address;
  partnerMockUsdcAta: Address;
  mockUsdcMint: Address;
  releaseAmounts: bigint[];
  timestamp: number;
}

/**
 * Computes the terms hash and derives the partnership PDA for the reservation.
 */
export async function computeReserveData(
  input: ReserveFlowInput,
): Promise<ReserveFlowResult> {
  const timestamp = Date.now();

  // Build the terms manifest for hashing
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

  // Derive the partnership PDA
  const [partnershipPda] = await findPartnershipPda({
    lot: input.lotPda as Address,
    partner: input.partnerWallet as Address,
  });
  const [mockUsdcMint] = await findMockUsdcMintPda();
  const [partnershipEscrowPda] = await findPartnershipEscrowPda({
    partnership: partnershipPda,
  });
  const [vaultAuthority] = await findVaultAuthorityPda({
    partnership: partnershipPda,
  });
  const [vaultTokenAccount] = await deriveAssociatedTokenAccount(
    vaultAuthority,
    mockUsdcMint,
  );
  const [partnerMockUsdcAta] = await deriveAssociatedTokenAccount(
    input.partnerWallet as Address,
    mockUsdcMint,
  );

  return {
    termsHash,
    termsHashHex,
    partnershipPda,
    partnershipEscrowPda,
    vaultAuthority,
    vaultTokenAccount,
    partnerMockUsdcAta,
    mockUsdcMint,
    releaseAmounts: [...ZAFIRO_RELEASE_AMOUNTS_BASE_UNITS],
    timestamp,
  };
}

/**
 * Builds the reserve_partnership instruction for MWA signing.
 */
export async function buildReserveInstruction(
  signer: TransactionSendingSigner,
  lotPda: Address,
  termsHash: Uint8Array,
  ticketUsdcCents: number,
  mockUsdcMint: Address,
  partnerMockUsdcAta: Address,
  releaseAmounts: Array<number | bigint>,
) {
  const createAtaIx = buildCreateAssociatedTokenAccountIdempotentTx({
    payer: signer,
    owner: signer.address,
    mint: mockUsdcMint,
    tokenAccount: partnerMockUsdcAta,
  });
  const ix = await buildReservePartnershipTx({
    partner: signer,
    lotPda,
    termsHash,
    ticketUsdcCents,
    mockUsdcMint,
    releaseAmounts,
  });
  return [createAtaIx, ix];
}

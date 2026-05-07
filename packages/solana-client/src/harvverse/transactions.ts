/**
 * Transaction builder functions for the Harvverse program.
 *
 * Each builder wraps the Codama-generated instruction builders,
 * resolving PDAs automatically and returning a ready-to-sign instruction.
 */

import {
  getRegisterRoleInstructionAsync,
  getCreateFarmerProfileInstructionAsync,
  getCreatePartnerProfileInstructionAsync,
  getCreateLotInstructionAsync,
  getPublishLotInstruction,
  getUpdateLotHashesInstruction,
  getInitializeMockUsdcInstructionAsync,
  getClaimMockUsdcInstructionAsync,
  getReservePartnershipInstructionAsync,
  getRecordMilestoneInstructionAsync,
  getReleaseKickoffFundsInstructionAsync,
  getReleaseMilestoneFundsInstructionAsync,
  getRecordSettlementInstructionAsync,
  type RegisterRoleInstruction,
  type CreateFarmerProfileInstruction,
  type CreatePartnerProfileInstruction,
  type CreateLotInstruction,
  type PublishLotInstruction,
  type UpdateLotHashesInstruction,
  type InitializeMockUsdcInstruction,
  type ReservePartnershipInstruction,
  type RecordMilestoneInstruction,
  type RecordSettlementInstruction,
} from "../generated/harvverse";
import type {
  RegisterRoleTxInput,
  CreateFarmerProfileTxInput,
  CreatePartnerProfileTxInput,
  CreateLotTxInput,
  PublishLotTxInput,
  UpdateLotHashesTxInput,
  InitializeMockUsdcTxInput,
  ClaimMockUsdcTxInput,
  ReservePartnershipTxInput,
  RecordMilestoneTxInput,
  ReleaseKickoffFundsTxInput,
  ReleaseMilestoneFundsTxInput,
  RecordSettlementTxInput,
} from "./types";
import {
  AccountRole,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ZAFIRO_RELEASE_AMOUNTS_BASE_UNITS,
  ZAFIRO_TICKET_USDC_CENTS,
} from "./constants";
import {
  deriveAssociatedTokenAccount,
  deriveMilestonePda,
  findMockUsdcMintPda,
} from "./pda";

/**
 * Builds a `register_role` instruction.
 * The UserRole PDA is derived automatically from the wallet address.
 */
export async function buildRegisterRoleTx(
  input: RegisterRoleTxInput,
): Promise<RegisterRoleInstruction> {
  return getRegisterRoleInstructionAsync({
    wallet: input.wallet,
    role: input.role,
  });
}

/**
 * Builds a `create_farmer_profile` instruction.
 * The UserRole and FarmerProfile PDAs are derived automatically.
 */
export async function buildCreateFarmerProfileTx(
  input: CreateFarmerProfileTxInput,
): Promise<CreateFarmerProfileInstruction> {
  return getCreateFarmerProfileInstructionAsync({
    farmer: input.farmer,
    displayNameHash: input.displayNameHash,
    metadataUriHash: input.metadataUriHash,
  });
}

/**
 * Builds a `create_partner_profile` instruction.
 * The UserRole and PartnerProfile PDAs are derived automatically.
 */
export async function buildCreatePartnerProfileTx(
  input: CreatePartnerProfileTxInput,
): Promise<CreatePartnerProfileInstruction> {
  return getCreatePartnerProfileInstructionAsync({
    partner: input.partner,
    displayNameHash: input.displayNameHash,
    metadataUriHash: input.metadataUriHash,
  });
}

/**
 * Builds a `create_lot` instruction.
 * The UserRole and FarmerProfile PDAs are derived automatically.
 * The Lot PDA must be pre-computed and passed as `lotPda`.
 */
export async function buildCreateLotTx(
  input: CreateLotTxInput,
): Promise<CreateLotInstruction> {
  return getCreateLotInstructionAsync({
    farmer: input.farmer,
    lot: input.lotPda,
    lotIdHash: input.lotIdHash,
    metadataHash: input.metadataHash,
    planHash: input.planHash,
    mediaManifestHash: input.mediaManifestHash,
    sensorManifestHash: input.sensorManifestHash,
    ticketUsdcCents: input.ticketUsdcCents,
    farmerShareBps: input.farmerShareBps,
    partnerShareBps: input.partnerShareBps,
  });
}

/**
 * Builds a `publish_lot` instruction.
 * The Lot PDA must be pre-computed and passed as `lotPda`.
 */
export function buildPublishLotTx(
  input: PublishLotTxInput,
): PublishLotInstruction {
  return getPublishLotInstruction({
    farmer: input.farmer,
    lot: input.lotPda,
  });
}

/**
 * Builds an `update_lot_hashes` instruction.
 * The Lot PDA must be pre-computed and passed as `lotPda`.
 * Pass null for hash fields that should not be updated.
 */
export function buildUpdateLotHashesTx(
  input: UpdateLotHashesTxInput,
): UpdateLotHashesInstruction {
  return getUpdateLotHashesInstruction({
    farmer: input.farmer,
    lot: input.lotPda,
    metadataHash: input.metadataHash ?? null,
    planHash: input.planHash ?? null,
    mediaManifestHash: input.mediaManifestHash ?? null,
    sensorManifestHash: input.sensorManifestHash ?? null,
  });
}

/**
 * Builds an `initialize_mock_usdc` instruction.
 * The ProgramConfig, PaymentConfig, mint, and mint authority PDAs are derived automatically.
 */
export async function buildInitializeMockUsdcTx(
  input: InitializeMockUsdcTxInput,
): Promise<InitializeMockUsdcInstruction> {
  return getInitializeMockUsdcInstructionAsync({
    authority: input.authority,
    decimals: input.decimals,
    faucetAmount: input.faucetAmount,
  });
}

/**
 * Builds an idempotent associated token account create instruction.
 * The instruction is safe to include before faucet/release transactions.
 */
export function buildCreateAssociatedTokenAccountIdempotentTx(input: {
  payer: TransactionSigner;
  owner: Address;
  mint: Address;
  tokenAccount: Address;
}): Instruction {
  return Object.freeze({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
    accounts: [
      Object.freeze({
        address: input.payer.address,
        role: AccountRole.WRITABLE_SIGNER,
        signer: input.payer,
      }),
      Object.freeze({
        address: input.tokenAccount,
        role: AccountRole.WRITABLE,
      }),
      Object.freeze({ address: input.owner, role: AccountRole.READONLY }),
      Object.freeze({ address: input.mint, role: AccountRole.READONLY }),
      Object.freeze({
        address: SYSTEM_PROGRAM_ID,
        role: AccountRole.READONLY,
      }),
      Object.freeze({ address: TOKEN_PROGRAM_ID, role: AccountRole.READONLY }),
    ],
    data: new Uint8Array([1]),
  });
}

/**
 * Builds a claimant ATA create instruction followed by `claim_mock_usdc`.
 */
export async function buildClaimMockUsdcTx(
  input: ClaimMockUsdcTxInput,
): Promise<Instruction[]> {
  const [claimantAta] = await deriveAssociatedTokenAccount(
    input.claimant.address,
    input.mockUsdcMint,
  );
  const createAtaIx = buildCreateAssociatedTokenAccountIdempotentTx({
    payer: input.claimant,
    owner: input.claimant.address,
    mint: input.mockUsdcMint,
    tokenAccount: claimantAta,
  });
  const claimIx = await getClaimMockUsdcInstructionAsync({
    claimant: input.claimant,
    mockUsdcMint: input.mockUsdcMint,
    claimantMockUsdcAta: claimantAta,
  });

  return [createAtaIx, claimIx];
}

/**
 * Builds a funded `reserve_partnership` instruction.
 * The UserRole, PartnerProfile, and Partnership PDAs are derived automatically.
 */
export async function buildReservePartnershipTx(
  input: ReservePartnershipTxInput,
): Promise<ReservePartnershipInstruction> {
  const mockUsdcMint = input.mockUsdcMint ?? (await findMockUsdcMintPda())[0];

  return getReservePartnershipInstructionAsync({
    partner: input.partner,
    lot: input.lotPda,
    mockUsdcMint,
    termsHash: input.termsHash,
    ticketUsdcCents: input.ticketUsdcCents ?? ZAFIRO_TICKET_USDC_CENTS,
    releaseAmounts: input.releaseAmounts ?? [
      ...ZAFIRO_RELEASE_AMOUNTS_BASE_UNITS,
    ],
  });
}

/**
 * Builds a `record_milestone` instruction.
 * The ProgramConfig and MilestoneReceipt PDAs are derived automatically.
 */
export async function buildRecordMilestoneTx(
  input: RecordMilestoneTxInput,
): Promise<RecordMilestoneInstruction> {
  const [milestoneReceipt] = await deriveMilestonePda(
    input.partnershipPda,
    input.milestoneIndex,
  );
  return getRecordMilestoneInstructionAsync({
    recorder: input.recorder,
    partnership: input.partnershipPda,
    milestoneReceipt,
    milestoneIndex: input.milestoneIndex,
    proofHash: input.proofHash,
  });
}

/**
 * Builds a farmer ATA create instruction followed by `release_kickoff_funds`.
 */
export async function buildReleaseKickoffFundsTx(
  input: ReleaseKickoffFundsTxInput,
): Promise<Instruction[]> {
  const createFarmerAtaIx = buildCreateAssociatedTokenAccountIdempotentTx({
    payer: input.signer,
    owner: input.farmer,
    mint: input.mockUsdcMint,
    tokenAccount: input.farmerMockUsdcAta,
  });
  const releaseIx = await getReleaseKickoffFundsInstructionAsync({
    signer: input.signer,
    partnership: input.partnershipPda,
    lot: input.lotPda,
    vaultTokenAccount: input.vaultTokenAccount,
    farmerMockUsdcAta: input.farmerMockUsdcAta,
    mockUsdcMint: input.mockUsdcMint,
  });

  return [createFarmerAtaIx, releaseIx];
}

/**
 * Builds a farmer ATA create instruction followed by `release_milestone_funds`.
 */
export async function buildReleaseMilestoneFundsTx(
  input: ReleaseMilestoneFundsTxInput,
): Promise<Instruction[]> {
  const createFarmerAtaIx = buildCreateAssociatedTokenAccountIdempotentTx({
    payer: input.signer,
    owner: input.farmer,
    mint: input.mockUsdcMint,
    tokenAccount: input.farmerMockUsdcAta,
  });
  const releaseIx = await getReleaseMilestoneFundsInstructionAsync({
    signer: input.signer,
    partnership: input.partnershipPda,
    requiredMilestoneReceipt: input.requiredMilestoneReceipt,
    vaultTokenAccount: input.vaultTokenAccount,
    farmerMockUsdcAta: input.farmerMockUsdcAta,
    mockUsdcMint: input.mockUsdcMint,
    releaseIndex: input.releaseIndex,
  });

  return [createFarmerAtaIx, releaseIx];
}

/**
 * Builds a `record_settlement` instruction.
 * The ProgramConfig and SettlementReceipt PDAs are derived automatically.
 */
export async function buildRecordSettlementTx(
  input: RecordSettlementTxInput,
): Promise<RecordSettlementInstruction> {
  return getRecordSettlementInstructionAsync({
    signer: input.signer,
    partnership: input.partnershipPda,
    lot: input.lotPda,
    yieldQq: input.yieldQq,
    pricePerLbCents: input.pricePerLbCents,
    revenueUsdcCents: input.revenueUsdcCents,
    costUsdcCents: input.costUsdcCents,
    profitUsdcCents: input.profitUsdcCents,
    farmerShareUsdcCents: input.farmerShareUsdcCents,
    partnerShareUsdcCents: input.partnerShareUsdcCents,
    settlementHash: input.settlementHash,
  });
}

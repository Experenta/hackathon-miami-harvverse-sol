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
  getReservePartnershipInstructionAsync,
  getRecordSettlementInstructionAsync,
  type RegisterRoleInstruction,
  type CreateFarmerProfileInstruction,
  type CreatePartnerProfileInstruction,
  type CreateLotInstruction,
  type PublishLotInstruction,
  type UpdateLotHashesInstruction,
  type ReservePartnershipInstruction,
  type RecordSettlementInstruction,
} from "../generated/harvverse";
import type {
  RegisterRoleTxInput,
  CreateFarmerProfileTxInput,
  CreatePartnerProfileTxInput,
  CreateLotTxInput,
  PublishLotTxInput,
  UpdateLotHashesTxInput,
  ReservePartnershipTxInput,
  RecordSettlementTxInput,
} from "./types";

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
 * Builds a `reserve_partnership` instruction.
 * The UserRole, PartnerProfile, and Partnership PDAs are derived automatically.
 */
export async function buildReservePartnershipTx(
  input: ReservePartnershipTxInput,
): Promise<ReservePartnershipInstruction> {
  return getReservePartnershipInstructionAsync({
    partner: input.partner,
    lot: input.lotPda,
    termsHash: input.termsHash,
  });
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

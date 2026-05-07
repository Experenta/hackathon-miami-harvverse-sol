/**
 * Shared TypeScript interfaces for the Harvverse app.
 * These supplement the Codama-generated types with app-level input shapes.
 */

import type { Address, TransactionSigner } from "@solana/kit";

// ─── Re-export generated account types ───────────────────────────────────────
export type {
  UserRole,
  Lot,
  Partnership,
  FarmerProfile,
  PartnerProfile,
  ProgramConfig,
  SettlementReceipt,
  MilestoneReceipt,
} from "../generated/harvverse";

// ─── Re-export generated enum types ──────────────────────────────────────────
export { RoleKind, LotStatus, PartnershipStatus } from "../generated/harvverse";

// ─── Transaction input types ─────────────────────────────────────────────────

import { RoleKind } from "../generated/harvverse";

export interface RegisterRoleTxInput {
  wallet: TransactionSigner;
  role: RoleKind;
}

export interface CreateFarmerProfileTxInput {
  farmer: TransactionSigner;
  displayNameHash: Uint8Array;
  metadataUriHash: Uint8Array;
}

export interface CreatePartnerProfileTxInput {
  partner: TransactionSigner;
  displayNameHash: Uint8Array;
  metadataUriHash: Uint8Array;
}

export interface CreateLotTxInput {
  farmer: TransactionSigner;
  lotPda: Address;
  lotIdHash: Uint8Array;
  metadataHash: Uint8Array;
  planHash: Uint8Array;
  mediaManifestHash: Uint8Array;
  sensorManifestHash: Uint8Array;
  ticketUsdcCents: number | bigint;
  farmerShareBps: number;
  partnerShareBps: number;
}

export interface PublishLotTxInput {
  farmer: TransactionSigner;
  lotPda: Address;
}

export interface UpdateLotHashesTxInput {
  farmer: TransactionSigner;
  lotPda: Address;
  metadataHash?: Uint8Array;
  planHash?: Uint8Array;
  mediaManifestHash?: Uint8Array;
  sensorManifestHash?: Uint8Array;
}

export interface ReservePartnershipTxInput {
  partner: TransactionSigner;
  lotPda: Address;
  termsHash: Uint8Array;
}

export interface RecordSettlementTxInput {
  signer: TransactionSigner;
  partnershipPda: Address;
  lotPda: Address;
  yieldQq: number;
  pricePerLbCents: number;
  revenueUsdcCents: number | bigint;
  costUsdcCents: number | bigint;
  profitUsdcCents: number | bigint;
  farmerShareUsdcCents: number | bigint;
  partnerShareUsdcCents: number | bigint;
  settlementHash: Uint8Array;
}

// ─── Manifest types for hash computation ─────────────────────────────────────

export interface LotMetadataManifest {
  lotCode: string;
  farmName: string;
  farmerWallet: string;
  location: {
    country: string;
    region: string;
    latitude: number;
    longitude: number;
    altitudeMeters: number;
  };
  variety: string;
  areaManzanas: number;
}

export interface PlanManifest {
  lotCode: string;
  planId: string;
  planJson: unknown;
}

export interface MediaManifest {
  lotCode: string;
  items: Array<{ storageId: string; kind: string; hash: string }>;
}

export interface SensorManifest {
  lotCode: string;
  snapshots: Array<{
    source: string;
    temperatureC?: number;
    humidityPct?: number;
    soilPh?: number;
    soilMoisturePct?: number;
    hash: string;
  }>;
}

export interface TermsManifest {
  lotPda: string;
  farmerWallet: string;
  partnerWallet: string;
  ticketUsdcCents: number;
  farmerShareBps: number;
  partnerShareBps: number;
  metadataHash: string;
  planHash: string;
  timestamp: number;
}

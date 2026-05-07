/**
 * Account fetcher functions for the Harvverse program.
 *
 * Each fetcher derives the PDA from the given seeds, fetches the account,
 * decodes it using the generated codec, and returns the typed account or null.
 */

import type { Address, MaybeAccount } from "@solana/kit";
import {
  fetchMaybeUserRole,
  fetchMaybeLot,
  fetchMaybePartnership,
  fetchMaybeFarmerProfile,
  fetchMaybePartnerProfile,
  type UserRole,
  type Lot,
  type Partnership,
  type FarmerProfile,
  type PartnerProfile,
} from "../generated/harvverse";
import {
  findUserRolePda,
  findFarmerProfilePda,
  findPartnerProfilePda,
  findPartnershipPda,
  deriveLotPda,
} from "./pda";

type Rpc = Parameters<typeof fetchMaybeUserRole>[0];

/**
 * Fetches the UserRole account for a given wallet address.
 * Returns null if the account does not exist.
 */
export async function fetchUserRoleByWallet(
  rpc: Rpc,
  wallet: Address,
): Promise<MaybeAccount<UserRole> | null> {
  const [pda] = await findUserRolePda({ farmer: wallet });
  const account = await fetchMaybeUserRole(rpc, pda);
  return account.exists ? account : null;
}

/**
 * Fetches the Lot account at a given PDA address.
 * Returns null if the account does not exist.
 */
export async function fetchLotByPda(
  rpc: Rpc,
  lotPda: Address,
): Promise<MaybeAccount<Lot> | null> {
  const account = await fetchMaybeLot(rpc, lotPda);
  return account.exists ? account : null;
}

/**
 * Fetches the Lot account by deriving the PDA from farmer + lotIdHash.
 * Returns null if the account does not exist.
 */
export async function fetchLotBySeeds(
  rpc: Rpc,
  farmer: Address,
  lotIdHash: Uint8Array,
): Promise<MaybeAccount<Lot> | null> {
  const [pda] = await deriveLotPda(farmer, lotIdHash);
  return fetchLotByPda(rpc, pda);
}

/**
 * Fetches the Partnership account at a given PDA address.
 * Returns null if the account does not exist.
 */
export async function fetchPartnershipByPda(
  rpc: Rpc,
  partnershipPda: Address,
): Promise<MaybeAccount<Partnership> | null> {
  const account = await fetchMaybePartnership(rpc, partnershipPda);
  return account.exists ? account : null;
}

/**
 * Fetches the Partnership account by deriving the PDA from lot + partner.
 * Returns null if the account does not exist.
 */
export async function fetchPartnershipBySeeds(
  rpc: Rpc,
  lotPda: Address,
  partner: Address,
): Promise<MaybeAccount<Partnership> | null> {
  const [pda] = await findPartnershipPda({ lot: lotPda, partner });
  return fetchPartnershipByPda(rpc, pda);
}

/**
 * Fetches the FarmerProfile account for a given farmer wallet.
 * Returns null if the account does not exist.
 */
export async function fetchFarmerProfileByWallet(
  rpc: Rpc,
  farmer: Address,
): Promise<MaybeAccount<FarmerProfile> | null> {
  const [pda] = await findFarmerProfilePda({ farmer });
  const account = await fetchMaybeFarmerProfile(rpc, pda);
  return account.exists ? account : null;
}

/**
 * Fetches the PartnerProfile account for a given partner wallet.
 * Returns null if the account does not exist.
 */
export async function fetchPartnerProfileByWallet(
  rpc: Rpc,
  partner: Address,
): Promise<MaybeAccount<PartnerProfile> | null> {
  const [pda] = await findPartnerProfilePda({ partner });
  const account = await fetchMaybePartnerProfile(rpc, pda);
  return account.exists ? account : null;
}

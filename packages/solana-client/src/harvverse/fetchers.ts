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
  fetchMaybePaymentConfig,
  fetchMaybePartnershipEscrow,
  type UserRole,
  type Lot,
  type Partnership,
  type FarmerProfile,
  type PartnerProfile,
  type PaymentConfig,
  type PartnershipEscrow,
} from "../generated/harvverse";
import {
  findUserRolePda,
  findFarmerProfilePda,
  findPartnerProfilePda,
  findPartnershipPda,
  findPaymentConfigPda,
  findPartnershipEscrowPda,
  deriveLotPda,
} from "./pda";
import type { MockUsdcBalance } from "./types";

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

/**
 * Fetches the PaymentConfig singleton.
 * Returns null if the account does not exist.
 */
export async function fetchHarvversePaymentConfig(
  rpc: Rpc,
): Promise<MaybeAccount<PaymentConfig> | null> {
  const [pda] = await findPaymentConfigPda();
  const account = await fetchMaybePaymentConfig(rpc, pda);
  return account.exists ? account : null;
}

/**
 * Fetches a PartnershipEscrow account by partnership PDA.
 * Returns null if the escrow account does not exist.
 */
export async function fetchPartnershipEscrowByPartnership(
  rpc: Rpc,
  partnershipPda: Address,
): Promise<MaybeAccount<PartnershipEscrow> | null> {
  const [pda] = await findPartnershipEscrowPda({ partnership: partnershipPda });
  const account = await fetchMaybePartnershipEscrow(rpc, pda);
  return account.exists ? account : null;
}

type TokenBalanceRpcResponse = {
  value: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString?: string;
  };
};

type TokenBalanceRpc = {
  getTokenAccountBalance(address: Address): {
    send(): Promise<TokenBalanceRpcResponse>;
  };
};

/**
 * Reads a live SPL token account balance from RPC.
 * Missing token accounts return a zero balance with `exists: false`.
 */
export async function fetchMockUsdcTokenAccountBalance(
  rpc: Rpc,
  tokenAccount: Address,
  mint: Address,
): Promise<MockUsdcBalance> {
  const account = await rpc
    .getAccountInfo(tokenAccount, { encoding: "base64" })
    .send();

  if (!account.value) {
    return {
      tokenAccount,
      mint,
      amountBaseUnits: 0n,
      decimals: 6,
      uiAmount: 0,
      uiAmountString: "0",
      exists: false,
    };
  }

  const balance = await (rpc as unknown as TokenBalanceRpc)
    .getTokenAccountBalance(tokenAccount)
    .send();

  return {
    tokenAccount,
    mint,
    amountBaseUnits: BigInt(balance.value.amount),
    decimals: balance.value.decimals,
    uiAmount: balance.value.uiAmount ?? 0,
    uiAmountString:
      balance.value.uiAmountString ?? String(balance.value.uiAmount ?? 0),
    exists: true,
  };
}

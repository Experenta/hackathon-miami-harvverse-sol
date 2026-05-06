import {
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address,
} from "@solana/kit";
import { HARVVERSE_PROGRAM_ID } from "./constants";

const SEED_CONFIG = new TextEncoder().encode("config");
const SEED_ROLE = new TextEncoder().encode("role");
const SEED_FARMER = new TextEncoder().encode("farmer");
const SEED_PARTNER = new TextEncoder().encode("partner");
const SEED_LOT = new TextEncoder().encode("lot");
const SEED_PARTNERSHIP = new TextEncoder().encode("partnership");
const SEED_MILESTONE = new TextEncoder().encode("milestone");
const SEED_SETTLEMENT = new TextEncoder().encode("settlement");

export async function deriveConfigPda(): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [SEED_CONFIG],
  });
  return pda;
}

export async function deriveUserRolePda(wallet: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [SEED_ROLE, getAddressEncoder().encode(wallet)],
  });
  return pda;
}

export async function deriveFarmerProfilePda(
  farmer: Address,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [SEED_FARMER, getAddressEncoder().encode(farmer)],
  });
  return pda;
}

export async function derivePartnerProfilePda(
  partner: Address,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [SEED_PARTNER, getAddressEncoder().encode(partner)],
  });
  return pda;
}

export async function deriveLotPda(
  farmer: Address,
  lotIdHash: Uint8Array,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [SEED_LOT, getAddressEncoder().encode(farmer), lotIdHash],
  });
  return pda;
}

export async function derivePartnershipPda(
  lotPda: Address,
  partner: Address,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [
      SEED_PARTNERSHIP,
      getAddressEncoder().encode(lotPda),
      getAddressEncoder().encode(partner),
    ],
  });
  return pda;
}

export async function deriveMilestoneReceiptPda(
  partnershipPda: Address,
  milestoneIndex: number,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [
      SEED_MILESTONE,
      getAddressEncoder().encode(partnershipPda),
      new Uint8Array([milestoneIndex]),
    ],
  });
  return pda;
}

export async function deriveSettlementReceiptPda(
  partnershipPda: Address,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [SEED_SETTLEMENT, getAddressEncoder().encode(partnershipPda)],
  });
  return pda;
}

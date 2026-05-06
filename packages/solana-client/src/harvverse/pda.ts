/**
 * PDA derivation helper functions for the Harvverse program.
 *
 * The Codama-generated code provides `findUserRolePda`, `findFarmerProfilePda`,
 * `findPartnerProfilePda`, `findPartnershipPda`, `findSettlementReceiptPda`,
 * and `findProgramConfigPda`. This module adds the remaining helpers that
 * require non-account seeds (Lot and MilestoneReceipt).
 */

import {
	getAddressEncoder,
	getBytesEncoder,
	getU8Encoder,
	getProgramDerivedAddress,
	type Address,
	type ProgramDerivedAddress,
} from "@solana/kit";
import { HARVVERSE_PROGRAM_ID } from "./constants";

/**
 * Derives the Lot PDA for a given farmer wallet and lot ID hash.
 * Seeds: ["lot", farmer_wallet, lot_id_hash]
 */
export async function deriveLotPda(
	farmer: Address,
	lotIdHash: Uint8Array,
	programId: Address = HARVVERSE_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
	return getProgramDerivedAddress({
		programAddress: programId,
		seeds: [
			getBytesEncoder().encode(new Uint8Array([108, 111, 116])), // "lot"
			getAddressEncoder().encode(farmer),
			lotIdHash,
		],
	});
}

/**
 * Derives the MilestoneReceipt PDA for a given partnership PDA and milestone index.
 * Seeds: ["milestone", partnership_pda, milestone_index]
 */
export async function deriveMilestonePda(
	partnershipPda: Address,
	milestoneIndex: number,
	programId: Address = HARVVERSE_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
	return getProgramDerivedAddress({
		programAddress: programId,
		seeds: [
			getBytesEncoder().encode(
				new Uint8Array([109, 105, 108, 101, 115, 116, 111, 110, 101]), // "milestone"
			),
			getAddressEncoder().encode(partnershipPda),
			getU8Encoder().encode(milestoneIndex),
		],
	});
}

// Re-export the Codama-generated PDA finders for convenience
export {
	findUserRolePda,
	findFarmerProfilePda,
	findPartnerProfilePda,
	findPartnershipPda,
	findSettlementReceiptPda,
	findProgramConfigPda,
} from "../generated/harvverse";

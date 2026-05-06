/**
 * Reserve flow logic for partnership reservation.
 *
 * Computes the terms hash from canonical JSON and builds the
 * reserve_partnership instruction for MWA signing.
 */

import type { Address, TransactionSendingSigner } from "@solana/kit";
import {
	computeManifestHash,
	computeManifestHashHex,
	buildReservePartnershipTx,
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

	return {
		termsHash,
		termsHashHex,
		partnershipPda,
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
) {
	const ix = await buildReservePartnershipTx({
		partner: signer,
		lotPda,
		termsHash,
	});
	return [ix];
}

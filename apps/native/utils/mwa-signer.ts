/**
 * Creates a "noop" TransactionSigner for use with MWA.
 *
 * MWA handles signing externally via the wallet app, so we don't need
 * the signer to actually sign. This adapter satisfies the TransactionSigner
 * interface required by Codama-generated instructions while letting MWA
 * handle the actual signing.
 */

import type { Address, TransactionSigner } from "@solana/kit";

/**
 * Creates a TransactionSigner that only provides the address.
 * The actual signing is handled by MWA's sendTransactions.
 *
 * This is needed because Codama-generated instructions expect a
 * TransactionSigner, but MWA handles signing externally.
 */
export function createMwaSigner<T extends string = string>(
	address: Address<T>,
): TransactionSigner<T> {
	return {
		address,
		signAndSendTransactions: async () => {
			throw new Error(
				"MWA signer should not be used for signing. Use sendTransactions from useMobileWallet instead.",
			);
		},
	};
}

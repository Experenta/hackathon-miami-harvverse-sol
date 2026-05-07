/**
 * Harvverse program constants.
 */

import type { Address } from "@solana/kit";

/** The Harvverse program address on devnet and localnet. */
export const HARVVERSE_PROGRAM_ID =
  "Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP" as Address<"Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP">;

/** Classic SPL Token program used by P0 mockUSDC. */
export const TOKEN_PROGRAM_ID =
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address<"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA">;

/** Associated Token Account program used for mockUSDC ATAs. */
export const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address<"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL">;

/** System program address. */
export const SYSTEM_PROGRAM_ID =
  "11111111111111111111111111111111" as Address<"11111111111111111111111111111111">;

/** P0 mockUSDC constants. */
export const MOCK_USDC_DECIMALS = 6;
export const MOCK_USDC_BASE_UNITS_PER_USDC = 1_000_000n;
export const MOCK_USDC_CENTS_TO_BASE_UNITS = 10_000n;
export const MOCK_USDC_FAUCET_AMOUNT_BASE_UNITS = 5_000_000_000n;
export const ZAFIRO_TICKET_USDC_CENTS = 342_500;
export const ZAFIRO_TICKET_BASE_UNITS = 3_425_000_000n;
export const ZAFIRO_RELEASE_AMOUNTS_BASE_UNITS = [
  380_000_000n,
  225_000_000n,
  175_000_000n,
  210_000_000n,
  460_000_000n,
  40_000_000n,
] as const;
export const ZAFIRO_RELEASE_LABELS = [
  "Kickoff",
  "M3",
  "M4",
  "M5",
  "M6",
  "IoT service",
] as const;

/** Demo Zafiro lot autofill constants. */
export const DEMO_LOT = {
  lotCode: "HV-HN-ZAF-L02",
  farmName: "Zafiro",
  country: "Honduras",
  region: "Comayagua",
  latitude: 14.9465,
  longitude: -88.0863,
  altitudeMeters: 1300,
  variety: "Parainema",
  areaManzanas: 1.0,
  ticketUsdcCents: 342500, // $3,425.00
  farmerShareBps: 6000,
  partnerShareBps: 4000,
} as const;

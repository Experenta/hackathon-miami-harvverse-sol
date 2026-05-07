/**
 * Harvverse program constants.
 */

import type { Address } from "@solana/kit";

/** The Harvverse program address on devnet and localnet. */
export const HARVVERSE_PROGRAM_ID =
  "Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP" as Address<"Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP">;

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

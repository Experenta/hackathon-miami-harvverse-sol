import type { Address } from "@solana/kit";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          [key, canonicalize((value as Record<string, unknown>)[key])] as const,
      );
    return Object.fromEntries(entries);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function computeManifestHash(
  payload: Record<string, unknown>,
): Promise<Uint8Array> {
  const canonical = JSON.stringify(canonicalize(payload));
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

export interface TermsInput {
  lotPda: Address | string;
  farmerWallet: Address | string;
  partnerWallet: Address | string;
  ticketUsdcCents: number | bigint;
  farmerShareBps: number;
  partnerShareBps: number;
  metadataHash: Uint8Array;
  planHash: Uint8Array;
  timestamp: number;
}

export function computeTermsHash(terms: TermsInput): Promise<Uint8Array> {
  return computeManifestHash({
    lotPda: String(terms.lotPda),
    farmerWallet: String(terms.farmerWallet),
    partnerWallet: String(terms.partnerWallet),
    ticketUsdcCents:
      typeof terms.ticketUsdcCents === "bigint"
        ? terms.ticketUsdcCents.toString()
        : terms.ticketUsdcCents,
    farmerShareBps: terms.farmerShareBps,
    partnerShareBps: terms.partnerShareBps,
    metadataHash: bytesToHex(terms.metadataHash),
    planHash: bytesToHex(terms.planHash),
    timestamp: terms.timestamp,
  });
}

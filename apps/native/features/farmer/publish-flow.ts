/**
 * Publish flow logic for lot creation and publishing.
 *
 * Computes all manifest hashes from Convex data and builds the
 * create_lot + publish_lot instructions for MWA signing.
 */

import type { Address, TransactionSendingSigner } from "@solana/kit";
import {
  computeManifestHash,
  computeManifestHashHex,
  buildCreateLotTx,
  buildPublishLotTx,
  deriveLotPda,
  type LotMetadataManifest,
  type PlanManifest,
  type MediaManifest,
  type SensorManifest,
} from "@repo/solana-client";

export interface LotPublishData {
  lotCode: string;
  farmName: string;
  farmerWallet: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  variety: string;
  areaManzanas: number;
  ticketUsdcCents: number;
  farmerShareBps: number;
  partnerShareBps: number;
}

export interface PublishFlowResult {
  metadataHash: Uint8Array;
  metadataHashHex: string;
  planHash: Uint8Array;
  planHashHex: string;
  mediaManifestHash: Uint8Array;
  mediaManifestHashHex: string;
  sensorManifestHash: Uint8Array;
  sensorManifestHashHex: string;
  lotIdHash: Uint8Array;
  lotPda: Address;
}

/**
 * Computes all manifest hashes needed for lot publishing.
 */
export async function computePublishHashes(
  lot: LotPublishData,
  plan: { planId: string; planJson: unknown } | null,
  mediaItems: Array<{ storageId: string; kind: string; hash: string }>,
  sensorSnapshots: Array<{
    source: string;
    temperatureC?: number;
    humidityPct?: number;
    soilPh?: number;
    soilMoisturePct?: number;
    hash: string;
  }>,
): Promise<PublishFlowResult> {
  // 1. Metadata manifest hash
  const metadataManifest: LotMetadataManifest = {
    lotCode: lot.lotCode,
    farmName: lot.farmName,
    farmerWallet: lot.farmerWallet,
    location: {
      country: lot.country,
      region: lot.region,
      latitude: lot.latitude,
      longitude: lot.longitude,
      altitudeMeters: lot.altitudeMeters,
    },
    variety: lot.variety,
    areaManzanas: lot.areaManzanas,
  };
  const metadataHash = await computeManifestHash(
    metadataManifest as unknown as Record<string, unknown>,
  );
  const metadataHashHex = await computeManifestHashHex(
    metadataManifest as unknown as Record<string, unknown>,
  );

  // 2. Plan hash
  const planManifest: PlanManifest = {
    lotCode: lot.lotCode,
    planId: plan?.planId ?? "none",
    planJson: plan?.planJson ?? null,
  };
  const planHash = await computeManifestHash(
    planManifest as unknown as Record<string, unknown>,
  );
  const planHashHex = await computeManifestHashHex(
    planManifest as unknown as Record<string, unknown>,
  );

  // 3. Media manifest hash
  const mediaManifest: MediaManifest = {
    lotCode: lot.lotCode,
    items: mediaItems,
  };
  const mediaManifestHash = await computeManifestHash(
    mediaManifest as unknown as Record<string, unknown>,
  );
  const mediaManifestHashHex = await computeManifestHashHex(
    mediaManifest as unknown as Record<string, unknown>,
  );

  // 4. Sensor manifest hash
  const sensorManifest: SensorManifest = {
    lotCode: lot.lotCode,
    snapshots: sensorSnapshots,
  };
  const sensorManifestHash = await computeManifestHash(
    sensorManifest as unknown as Record<string, unknown>,
  );
  const sensorManifestHashHex = await computeManifestHashHex(
    sensorManifest as unknown as Record<string, unknown>,
  );

  // 5. Lot ID hash (used as PDA seed)
  const lotIdHash = await computeManifestHash({
    lotCode: lot.lotCode,
  } as Record<string, unknown>);

  // 6. Derive lot PDA
  const [lotPda] = await deriveLotPda(lot.farmerWallet as Address, lotIdHash);

  return {
    metadataHash,
    metadataHashHex,
    planHash,
    planHashHex,
    mediaManifestHash,
    mediaManifestHashHex,
    sensorManifestHash,
    sensorManifestHashHex,
    lotIdHash,
    lotPda,
  };
}

/**
 * Builds the create_lot and publish_lot instructions for the publish flow.
 */
export async function buildPublishInstructions(
  signer: TransactionSendingSigner,
  lotPda: Address,
  lotIdHash: Uint8Array,
  metadataHash: Uint8Array,
  planHash: Uint8Array,
  mediaManifestHash: Uint8Array,
  sensorManifestHash: Uint8Array,
  ticketUsdcCents: number,
  farmerShareBps: number,
  partnerShareBps: number,
) {
  const createLotIx = await buildCreateLotTx({
    farmer: signer,
    lotPda,
    lotIdHash,
    metadataHash,
    planHash,
    mediaManifestHash,
    sensorManifestHash,
    ticketUsdcCents,
    farmerShareBps,
    partnerShareBps,
  });

  const publishLotIx = buildPublishLotTx({
    farmer: signer,
    lotPda,
  });

  return [createLotIx, publishLotIx];
}

import type { Address, TransactionSigner } from "@solana/kit";
import {
  buildCreateLotTx,
  buildPublishLotTx,
  computeManifestHash,
  computeManifestHashHex,
  deriveLotPda,
  type LotMetadataManifest,
  type MediaManifest,
  type PlanManifest,
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

  const planManifest: PlanManifest = {
    lotCode: lot.lotCode,
    planId: plan?.planId ?? "none",
    planJson: plan?.planJson ?? null,
  };

  const mediaManifest: MediaManifest = {
    lotCode: lot.lotCode,
    items: mediaItems,
  };

  const sensorManifest: SensorManifest = {
    lotCode: lot.lotCode,
    snapshots: sensorSnapshots,
  };

  const metadataHash = await computeManifestHash(
    metadataManifest as unknown as Record<string, unknown>,
  );
  const metadataHashHex = await computeManifestHashHex(
    metadataManifest as unknown as Record<string, unknown>,
  );
  const planHash = await computeManifestHash(
    planManifest as unknown as Record<string, unknown>,
  );
  const planHashHex = await computeManifestHashHex(
    planManifest as unknown as Record<string, unknown>,
  );
  const mediaManifestHash = await computeManifestHash(
    mediaManifest as unknown as Record<string, unknown>,
  );
  const mediaManifestHashHex = await computeManifestHashHex(
    mediaManifest as unknown as Record<string, unknown>,
  );
  const sensorManifestHash = await computeManifestHash(
    sensorManifest as unknown as Record<string, unknown>,
  );
  const sensorManifestHashHex = await computeManifestHashHex(
    sensorManifest as unknown as Record<string, unknown>,
  );
  const lotIdHash = await computeManifestHash({
    lotCode: lot.lotCode,
  } as Record<string, unknown>);
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

export async function buildPublishInstructions(
  signer: TransactionSigner,
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

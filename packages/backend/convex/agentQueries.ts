import { v } from "convex/values";
import { internalQuery, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const DEBUG_SCOPE = "agentQueries";

function debugLog(event: string, fields: Record<string, unknown>) {
  console.log(`[${DEBUG_SCOPE}] ${event}`, fields);
}

function shortId(value: string | undefined | null) {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function nullable<T>(value: T | undefined): T | null {
  return value ?? null;
}

function clampLimit(value: number | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), max));
}

function projectLot(lot: Doc<"lots">) {
  return {
    id: lot._id,
    creationTime: lot._creationTime,
    lotCode: lot.lotCode,
    lotPda: nullable(lot.lotPda),
    farmerWallet: lot.farmerWallet,
    status: lot.status,
    farmName: lot.farmName,
    variety: lot.variety,
    region: lot.region,
    country: lot.country,
    latitude: lot.latitude,
    longitude: lot.longitude,
    altitudeMeters: lot.altitudeMeters,
    areaManzanas: lot.areaManzanas,
    ticketUsdcCents: lot.ticketUsdcCents,
    farmerShareBps: lot.farmerShareBps,
    partnerShareBps: lot.partnerShareBps,
    metadataHash: lot.metadataHash,
    planHash: lot.planHash,
    mediaManifestHash: lot.mediaManifestHash,
    sensorManifestHash: lot.sensorManifestHash,
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
  };
}

function projectFarmerProfile(profile: Doc<"farmerProfiles"> | null) {
  if (!profile) return null;
  return {
    id: profile._id,
    creationTime: profile._creationTime,
    wallet: profile.wallet,
    farmerProfilePda: nullable(profile.farmerProfilePda),
    displayName: profile.displayName,
    bio: nullable(profile.bio),
    country: nullable(profile.country),
    region: nullable(profile.region),
    metadataHash: profile.metadataHash,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function projectPartnerProfile(profile: Doc<"partnerProfiles"> | null) {
  if (!profile) return null;
  return {
    id: profile._id,
    creationTime: profile._creationTime,
    wallet: profile.wallet,
    partnerProfilePda: nullable(profile.partnerProfilePda),
    displayName: profile.displayName,
    organization: nullable(profile.organization),
    metadataHash: profile.metadataHash,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function projectPartnership(partnership: Doc<"partnerships">) {
  return {
    id: partnership._id,
    creationTime: partnership._creationTime,
    partnershipPda: nullable(partnership.partnershipPda),
    lotCode: partnership.lotCode,
    lotPda: nullable(partnership.lotPda),
    farmerWallet: partnership.farmerWallet,
    partnerWallet: partnership.partnerWallet,
    termsHash: partnership.termsHash,
    reserveTx: nullable(partnership.reserveTx),
    ticketUsdcCents: nullable(partnership.ticketUsdcCents),
    mockUsdcMint: nullable(partnership.mockUsdcMint),
    escrowVault: nullable(partnership.escrowVault),
    escrowPda: nullable(partnership.escrowPda),
    fundingTx: nullable(partnership.fundingTx),
    fundedAt: nullable(partnership.fundedAt),
    depositedAmountBaseUnits: nullable(partnership.depositedAmountBaseUnits),
    releasedAmountBaseUnits: nullable(partnership.releasedAmountBaseUnits),
    reserveAmountBaseUnits: nullable(partnership.reserveAmountBaseUnits),
    releaseScheduleBaseUnits: nullable(partnership.releaseScheduleBaseUnits),
    status: partnership.status,
    createdAt: partnership.createdAt,
    updatedAt: partnership.updatedAt,
  };
}

function projectAgronomicPlan(plan: Doc<"agronomicPlans"> | null) {
  if (!plan) return null;
  return {
    id: plan._id,
    creationTime: plan._creationTime,
    lotCode: plan.lotCode,
    planId: plan.planId,
    planJson: plan.planJson,
    hash: plan.hash,
    createdAt: plan.createdAt,
  };
}

function projectSensorSnapshot(snapshot: Doc<"sensorSnapshots">) {
  return {
    id: snapshot._id,
    creationTime: snapshot._creationTime,
    lotCode: snapshot.lotCode,
    source: snapshot.source,
    temperatureC: nullable(snapshot.temperatureC),
    humidityPct: nullable(snapshot.humidityPct),
    soilPh: nullable(snapshot.soilPh),
    soilMoisturePct: nullable(snapshot.soilMoisturePct),
    payload: snapshot.payload,
    hash: snapshot.hash,
    createdAt: snapshot.createdAt,
  };
}

async function projectLotMedia(ctx: QueryCtx, media: Doc<"lotMedia">) {
  let storageUrl: string | null = null;

  try {
    storageUrl = await ctx.storage.getUrl(media.storageId as Id<"_storage">);
  } catch {
    storageUrl = null;
  }

  return {
    id: media._id,
    creationTime: media._creationTime,
    lotCode: media.lotCode,
    storageId: media.storageId,
    storageUrl,
    kind: media.kind,
    caption: nullable(media.caption),
    hash: media.hash,
    createdAt: media.createdAt,
  };
}

function projectMilestoneProof(proof: Doc<"milestoneProofs">) {
  return {
    id: proof._id,
    creationTime: proof._creationTime,
    partnershipId: proof.partnershipId,
    partnershipPda: nullable(proof.partnershipPda),
    lotCode: proof.lotCode,
    milestoneIndex: proof.milestoneIndex,
    proofHash: proof.proofHash,
    proofTx: nullable(proof.proofTx),
    recordedByWallet: proof.recordedByWallet,
    status: proof.status,
    title: proof.title,
    caption: nullable(proof.caption),
    imageStorageIds: nullable(proof.imageStorageIds),
    receiptText: nullable(proof.receiptText),
    gpsText: nullable(proof.gpsText),
    iotPayload: nullable(proof.iotPayload),
    createdAt: proof.createdAt,
    updatedAt: proof.updatedAt,
  };
}

function projectFundRelease(release: Doc<"fundReleases">) {
  return {
    id: release._id,
    creationTime: release._creationTime,
    partnershipId: release.partnershipId,
    partnershipPda: release.partnershipPda,
    releaseIndex: release.releaseIndex,
    amountBaseUnits: release.amountBaseUnits,
    releaseTx: release.releaseTx,
    recipientWallet: release.recipientWallet,
    releasedAt: release.releasedAt,
  };
}

function projectAuditEvent(event: Doc<"auditEvents">) {
  return {
    id: event._id,
    creationTime: event._creationTime,
    actorWallet: nullable(event.actorWallet),
    kind: event.kind,
    entityType: event.entityType,
    entityId: event.entityId,
    data: event.data,
    createdAt: event.createdAt,
  };
}

function projectBalanceSnapshot(snapshot: Doc<"mockUsdcBalanceSnapshots">) {
  return {
    id: snapshot._id,
    creationTime: snapshot._creationTime,
    wallet: nullable(snapshot.wallet),
    tokenAccount: snapshot.tokenAccount,
    mint: snapshot.mint,
    role: snapshot.role,
    balanceBaseUnits: snapshot.balanceBaseUnits,
    balanceUiAmount: snapshot.balanceUiAmount,
    sourceTx: nullable(snapshot.sourceTx),
    observedAt: snapshot.observedAt,
  };
}

async function getFarmerProfile(ctx: QueryCtx, wallet: string) {
  return await ctx.db
    .query("farmerProfiles")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .unique();
}

async function getPartnerProfile(ctx: QueryCtx, wallet: string) {
  return await ctx.db
    .query("partnerProfiles")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .unique();
}

async function getLotByCode(ctx: QueryCtx, lotCode: string) {
  return await ctx.db
    .query("lots")
    .withIndex("by_lot_code", (q) => q.eq("lotCode", lotCode))
    .unique();
}

async function getLotPlan(ctx: QueryCtx, lotCode: string) {
  return await ctx.db
    .query("agronomicPlans")
    .withIndex("by_lot", (q) => q.eq("lotCode", lotCode))
    .first();
}

async function getLatestSensors(ctx: QueryCtx, lotCode: string, limit: number) {
  return await ctx.db
    .query("sensorSnapshots")
    .withIndex("by_lot", (q) => q.eq("lotCode", lotCode))
    .order("desc")
    .take(limit);
}

async function getLatestMedia(ctx: QueryCtx, lotCode: string, limit: number) {
  return await ctx.db
    .query("lotMedia")
    .withIndex("by_lot", (q) => q.eq("lotCode", lotCode))
    .order("desc")
    .take(limit);
}

async function getLotPartnerships(
  ctx: QueryCtx,
  lotCode: string,
  limit: number,
) {
  return await ctx.db
    .query("partnerships")
    .withIndex("by_lot", (q) => q.eq("lotCode", lotCode))
    .take(limit);
}

async function getPartnershipMilestones(
  ctx: QueryCtx,
  partnershipId: Id<"partnerships">,
  limit: number,
) {
  return await ctx.db
    .query("milestoneProofs")
    .withIndex("by_partnership", (q) => q.eq("partnershipId", partnershipId))
    .order("desc")
    .take(limit);
}

async function getPartnershipReleases(
  ctx: QueryCtx,
  partnershipId: Id<"partnerships">,
  limit: number,
) {
  return await ctx.db
    .query("fundReleases")
    .withIndex("by_partnership", (q) => q.eq("partnershipId", partnershipId))
    .order("desc")
    .take(limit);
}

async function getPartnershipAuditEvents(
  ctx: QueryCtx,
  lotCode: string,
  limit: number,
) {
  return await ctx.db
    .query("auditEvents")
    .withIndex("by_entity", (q) =>
      q.eq("entityType", "partnership").eq("entityId", lotCode),
    )
    .order("desc")
    .take(limit);
}

async function getLotAuditEvents(
  ctx: QueryCtx,
  lotCode: string,
  limit: number,
) {
  return await ctx.db
    .query("auditEvents")
    .withIndex("by_entity", (q) =>
      q.eq("entityType", "lot").eq("entityId", lotCode),
    )
    .order("desc")
    .take(limit);
}

async function getPartnershipBundle(
  ctx: QueryCtx,
  partnership: Doc<"partnerships">,
  options?: { includeLot?: boolean },
) {
  const [lot, farmerProfile, partnerProfile, milestoneProofs, fundReleases] =
    await Promise.all([
      options?.includeLot ? getLotByCode(ctx, partnership.lotCode) : null,
      getFarmerProfile(ctx, partnership.farmerWallet),
      getPartnerProfile(ctx, partnership.partnerWallet),
      getPartnershipMilestones(ctx, partnership._id, 20),
      getPartnershipReleases(ctx, partnership._id, 20),
    ]);

  return {
    partnership: projectPartnership(partnership),
    lot: lot ? projectLot(lot) : null,
    farmerProfile: projectFarmerProfile(farmerProfile),
    partnerProfile: projectPartnerProfile(partnerProfile),
    milestoneProofs: milestoneProofs.map(projectMilestoneProof),
    fundReleases: fundReleases.map(projectFundRelease),
  };
}

async function resolvePartnership(
  ctx: QueryCtx,
  args: {
    partnershipId?: Id<"partnerships">;
    lotCode?: string;
    partnerWallet?: string;
    farmerWallet?: string;
    partnershipPda?: string;
  },
) {
  if (args.partnershipId) {
    return await ctx.db.get(args.partnershipId);
  }

  if (args.partnershipPda) {
    const partnershipPda = args.partnershipPda;
    return await ctx.db
      .query("partnerships")
      .withIndex("by_partnership_pda", (q) =>
        q.eq("partnershipPda", partnershipPda),
      )
      .first();
  }

  if (args.lotCode && args.partnerWallet) {
    const lotCode = args.lotCode;
    const partnerWallet = args.partnerWallet;
    return await ctx.db
      .query("partnerships")
      .withIndex("by_lot_and_partner", (q) =>
        q.eq("lotCode", lotCode).eq("partnerWallet", partnerWallet),
      )
      .first();
  }

  if (args.lotCode && args.farmerWallet) {
    const lotCode = args.lotCode;
    const farmerWallet = args.farmerWallet;
    return await ctx.db
      .query("partnerships")
      .withIndex("by_lot_and_farmer", (q) =>
        q.eq("lotCode", lotCode).eq("farmerWallet", farmerWallet),
      )
      .first();
  }

  if (args.lotCode) {
    const lotCode = args.lotCode;
    return await ctx.db
      .query("partnerships")
      .withIndex("by_lot", (q) => q.eq("lotCode", lotCode))
      .first();
  }

  if (args.partnerWallet) {
    const partnerWallet = args.partnerWallet;
    return await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerWallet", partnerWallet))
      .first();
  }

  if (args.farmerWallet) {
    const farmerWallet = args.farmerWallet;
    return await ctx.db
      .query("partnerships")
      .withIndex("by_farmer", (q) => q.eq("farmerWallet", farmerWallet))
      .first();
  }

  return null;
}

/**
 * Internal query used by the AI agent tool to fetch full lot context.
 */
export const getLotFull = internalQuery({
  args: { lotCode: v.string() },
  handler: async (ctx, args) => {
    debugLog("getLotFull:start", { lotCode: args.lotCode });

    const lot = await getLotByCode(ctx, args.lotCode);

    if (!lot) {
      debugLog("getLotFull:notFound", { lotCode: args.lotCode });
      return { error: `Lot not found: ${args.lotCode}` };
    }

    const [
      farmerProfile,
      partnerships,
      plan,
      sensors,
      media,
      lotAuditEvents,
      partnershipAuditEvents,
      lotMilestoneProofs,
    ] = await Promise.all([
      getFarmerProfile(ctx, lot.farmerWallet),
      getLotPartnerships(ctx, args.lotCode, 20),
      getLotPlan(ctx, args.lotCode),
      getLatestSensors(ctx, args.lotCode, 20),
      getLatestMedia(ctx, args.lotCode, 20),
      getLotAuditEvents(ctx, args.lotCode, 30),
      getPartnershipAuditEvents(ctx, args.lotCode, 30),
      ctx.db
        .query("milestoneProofs")
        .withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
        .order("desc")
        .take(30),
    ]);

    const [partnershipBundles, mediaItems, releaseGroups] = await Promise.all([
      Promise.all(partnerships.map((p) => getPartnershipBundle(ctx, p))),
      Promise.all(media.map((item) => projectLotMedia(ctx, item))),
      Promise.all(
        partnerships.map((p) => getPartnershipReleases(ctx, p._id, 20)),
      ),
    ]);

    const fundReleases = releaseGroups.flat().map(projectFundRelease);

    debugLog("getLotFull:success", {
      lotCode: args.lotCode,
      status: lot.status,
      farmerWallet: shortId(lot.farmerWallet),
      hasFarmerProfile: Boolean(farmerProfile),
      partnershipCount: partnerships.length,
      hasAgronomicPlan: Boolean(plan),
      sensorCount: sensors.length,
      mediaCount: media.length,
      milestoneProofCount: lotMilestoneProofs.length,
      fundReleaseCount: fundReleases.length,
    });

    return {
      lot: projectLot(lot),
      farmerProfile: projectFarmerProfile(farmerProfile),
      partnerships: partnershipBundles,
      agronomicPlan: projectAgronomicPlan(plan),
      sensorSnapshots: sensors.map(projectSensorSnapshot),
      media: mediaItems,
      mediaCount: media.length,
      milestoneProofs: lotMilestoneProofs.map(projectMilestoneProof),
      fundReleases,
      auditEvents: {
        lot: lotAuditEvents.map(projectAuditEvent),
        partnership: partnershipAuditEvents.map(projectAuditEvent),
      },
    };
  },
});

/**
 * Internal query used by the AI agent for a single partnership/agreement.
 */
export const getPartnershipFull = internalQuery({
  args: {
    partnershipId: v.optional(v.id("partnerships")),
    lotCode: v.optional(v.string()),
    partnerWallet: v.optional(v.string()),
    farmerWallet: v.optional(v.string()),
    partnershipPda: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    debugLog("getPartnershipFull:start", {
      partnershipId: args.partnershipId ?? null,
      lotCode: args.lotCode ?? null,
      partnerWallet: shortId(args.partnerWallet),
      farmerWallet: shortId(args.farmerWallet),
      partnershipPda: shortId(args.partnershipPda),
    });

    const partnership = await resolvePartnership(ctx, args);

    if (!partnership) {
      debugLog("getPartnershipFull:notFound", {
        partnershipId: args.partnershipId ?? null,
        lotCode: args.lotCode ?? null,
        partnerWallet: shortId(args.partnerWallet),
        farmerWallet: shortId(args.farmerWallet),
        partnershipPda: shortId(args.partnershipPda),
      });
      return { error: "Partnership not found for the supplied reference." };
    }

    const [
      bundle,
      plan,
      sensors,
      media,
      lotAuditEvents,
      partnershipAuditEvents,
    ] = await Promise.all([
      getPartnershipBundle(ctx, partnership, { includeLot: true }),
      getLotPlan(ctx, partnership.lotCode),
      getLatestSensors(ctx, partnership.lotCode, 20),
      getLatestMedia(ctx, partnership.lotCode, 20),
      getLotAuditEvents(ctx, partnership.lotCode, 30),
      getPartnershipAuditEvents(ctx, partnership.lotCode, 30),
    ]);

    const mediaItems = await Promise.all(
      media.map((item) => projectLotMedia(ctx, item)),
    );

    debugLog("getPartnershipFull:success", {
      partnershipId: partnership._id,
      lotCode: partnership.lotCode,
      status: partnership.status,
      partnerWallet: shortId(partnership.partnerWallet),
      milestoneProofCount: bundle.milestoneProofs.length,
      fundReleaseCount: bundle.fundReleases.length,
      sensorCount: sensors.length,
      mediaCount: media.length,
    });

    return {
      ...bundle,
      agronomicPlan: projectAgronomicPlan(plan),
      sensorSnapshots: sensors.map(projectSensorSnapshot),
      media: mediaItems,
      auditEvents: {
        lot: lotAuditEvents.map(projectAuditEvent),
        partnership: partnershipAuditEvents.map(projectAuditEvent),
      },
    };
  },
});

/**
 * Resolves a 1-based partnership position in the current workspace list.
 */
export const getPartnershipByPosition = internalQuery({
  args: {
    wallet: v.string(),
    role: v.union(v.literal("farmer"), v.literal("partner")),
    position: v.number(),
    order: v.optional(v.union(v.literal("workspace"), v.literal("newest"))),
  },
  handler: async (ctx, args) => {
    const position = Math.max(1, Math.floor(args.position));
    const limit = Math.min(50, Math.max(20, position));
    const order = args.order ?? "workspace";
    const baseQuery =
      args.role === "partner"
        ? ctx.db
            .query("partnerships")
            .withIndex("by_partner", (q) => q.eq("partnerWallet", args.wallet))
        : ctx.db
            .query("partnerships")
            .withIndex("by_farmer", (q) => q.eq("farmerWallet", args.wallet));
    const partnerships =
      order === "newest"
        ? await baseQuery.order("desc").take(limit)
        : await baseQuery.take(limit);
    const partnership = partnerships[position - 1];

    debugLog("getPartnershipByPosition:start", {
      wallet: shortId(args.wallet),
      role: args.role,
      position,
      order,
      returnedCount: partnerships.length,
    });

    if (!partnership) {
      return {
        error: `No partnership found at position ${position}.`,
        reference: {
          wallet: args.wallet,
          role: args.role,
          position,
          order,
          returnedCount: partnerships.length,
        },
      };
    }

    const context = await getPartnershipBundle(ctx, partnership, {
      includeLot: true,
    });
    const [plan, sensors, media] = await Promise.all([
      getLotPlan(ctx, partnership.lotCode),
      getLatestSensors(ctx, partnership.lotCode, 20),
      getLatestMedia(ctx, partnership.lotCode, 20),
    ]);
    const mediaItems = await Promise.all(
      media.map((item) => projectLotMedia(ctx, item)),
    );

    debugLog("getPartnershipByPosition:success", {
      wallet: shortId(args.wallet),
      role: args.role,
      position,
      order,
      partnershipId: partnership._id,
      lotCode: partnership.lotCode,
      status: partnership.status,
    });

    return {
      reference: {
        wallet: args.wallet,
        role: args.role,
        position,
        order,
      },
      ...context,
      agronomicPlan: projectAgronomicPlan(plan),
      sensorSnapshots: sensors.map(projectSensorSnapshot),
      media: mediaItems,
    };
  },
});

/**
 * Internal query used by the AI agent when a partner is browsing their home or
 * catalog rather than a single lot detail screen.
 */
export const getPartnerWorkspace = internalQuery({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    debugLog("getPartnerWorkspace:start", {
      wallet: shortId(args.wallet),
    });

    const partnerProfile = await getPartnerProfile(ctx, args.wallet);

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerWallet", args.wallet))
      .take(20);

    const partnershipLots = await Promise.all(
      partnerships.map(async (partnership, index) => {
        const [lot, farmerProfile, latestSensors, milestoneProofs] =
          await Promise.all([
            getLotByCode(ctx, partnership.lotCode),
            getFarmerProfile(ctx, partnership.farmerWallet),
            getLatestSensors(ctx, partnership.lotCode, 3),
            getPartnershipMilestones(ctx, partnership._id, 6),
          ]);

        return {
          position: index + 1,
          partnership: projectPartnership(partnership),
          lot: lot ? projectLot(lot) : null,
          farmerProfile: projectFarmerProfile(farmerProfile),
          latestSensorSnapshots: latestSensors.map(projectSensorSnapshot),
          milestoneProofs: milestoneProofs.map(projectMilestoneProof),
        };
      }),
    );

    const catalog = await ctx.db
      .query("lots")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(20);

    debugLog("getPartnerWorkspace:success", {
      wallet: shortId(args.wallet),
      hasProfile: Boolean(partnerProfile),
      partnershipCount: partnerships.length,
      partnershipLotCount: partnershipLots.filter((row) => row.lot).length,
      catalogCount: catalog.length,
    });

    return {
      partnerProfile: projectPartnerProfile(partnerProfile),
      partnerships: partnershipLots,
      catalog: catalog.map(projectLot),
    };
  },
});

/**
 * Internal query used by the AI agent for a farmer-level workspace summary.
 */
export const getFarmerWorkspace = internalQuery({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    debugLog("getFarmerWorkspace:start", {
      wallet: shortId(args.wallet),
    });

    const farmerProfile = await getFarmerProfile(ctx, args.wallet);

    const lots = await ctx.db
      .query("lots")
      .withIndex("by_farmer", (q) => q.eq("farmerWallet", args.wallet))
      .take(20);

    const lotSummaries = await Promise.all(
      lots.map(async (lot, index) => {
        const [partnerships, plan, latestSensors, latestMedia] =
          await Promise.all([
            getLotPartnerships(ctx, lot.lotCode, 10),
            getLotPlan(ctx, lot.lotCode),
            getLatestSensors(ctx, lot.lotCode, 3),
            getLatestMedia(ctx, lot.lotCode, 3),
          ]);

        return {
          position: index + 1,
          lot: projectLot(lot),
          partnerships: partnerships.map(projectPartnership),
          agronomicPlan: projectAgronomicPlan(plan),
          latestSensorSnapshots: latestSensors.map(projectSensorSnapshot),
          latestMedia: await Promise.all(
            latestMedia.map((item) => projectLotMedia(ctx, item)),
          ),
        };
      }),
    );

    debugLog("getFarmerWorkspace:success", {
      wallet: shortId(args.wallet),
      hasProfile: Boolean(farmerProfile),
      lotCount: lots.length,
      draftCount: lots.filter((lot) => lot.status === "draft").length,
      publishedCount: lots.filter((lot) => lot.status === "published").length,
    });

    return {
      farmerProfile: projectFarmerProfile(farmerProfile),
      lots: lotSummaries,
    };
  },
});

/**
 * Internal query for focused sensor reads.
 */
export const getLotSensors = internalQuery({
  args: {
    lotCode: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 20, 100);
    const sensors = await getLatestSensors(ctx, args.lotCode, limit);

    debugLog("getLotSensors:success", {
      lotCode: args.lotCode,
      sensorCount: sensors.length,
      limit,
    });

    return {
      lotCode: args.lotCode,
      sensorSnapshots: sensors.map(projectSensorSnapshot),
    };
  },
});

/**
 * Internal query for focused media reads.
 */
export const getLotMedia = internalQuery({
  args: {
    lotCode: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 20, 100);
    const media = await getLatestMedia(ctx, args.lotCode, limit);
    const mediaItems = await Promise.all(
      media.map((item) => projectLotMedia(ctx, item)),
    );

    debugLog("getLotMedia:success", {
      lotCode: args.lotCode,
      mediaCount: media.length,
      limit,
    });

    return {
      lotCode: args.lotCode,
      media: mediaItems,
    };
  },
});

/**
 * Internal query for focused agronomic plan reads.
 */
export const getLotAgronomicPlan = internalQuery({
  args: { lotCode: v.string() },
  handler: async (ctx, args) => {
    const plan = await getLotPlan(ctx, args.lotCode);

    debugLog("getLotAgronomicPlan:success", {
      lotCode: args.lotCode,
      hasAgronomicPlan: Boolean(plan),
    });

    return {
      lotCode: args.lotCode,
      agronomicPlan: projectAgronomicPlan(plan),
    };
  },
});

/**
 * Internal query for recent operational history across lot and partnership data.
 */
export const getLotTimeline = internalQuery({
  args: {
    lotCode: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 50, 100);
    const [lotAuditEvents, partnershipAuditEvents, sensors, media, milestones] =
      await Promise.all([
        getLotAuditEvents(ctx, args.lotCode, 40),
        getPartnershipAuditEvents(ctx, args.lotCode, 40),
        getLatestSensors(ctx, args.lotCode, 40),
        getLatestMedia(ctx, args.lotCode, 40),
        ctx.db
          .query("milestoneProofs")
          .withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
          .order("desc")
          .take(40),
      ]);

    const mediaItems = await Promise.all(
      media.map((item) => projectLotMedia(ctx, item)),
    );
    const partnerships = await getLotPartnerships(ctx, args.lotCode, 20);
    const releaseGroups = await Promise.all(
      partnerships.map((p) => getPartnershipReleases(ctx, p._id, 20)),
    );
    const releases = releaseGroups.flat();

    const timeline = [
      ...lotAuditEvents.map((event) => ({
        recordType: "lot_audit",
        at: event.createdAt,
        auditEvent: projectAuditEvent(event),
      })),
      ...partnershipAuditEvents.map((event) => ({
        recordType: "partnership_audit",
        at: event.createdAt,
        auditEvent: projectAuditEvent(event),
      })),
      ...sensors.map((snapshot) => ({
        recordType: "sensor_snapshot",
        at: snapshot.createdAt,
        sensorSnapshot: projectSensorSnapshot(snapshot),
      })),
      ...mediaItems.map((item) => ({
        recordType: "lot_media",
        at: item.createdAt,
        media: item,
      })),
      ...milestones.map((proof) => ({
        recordType: "milestone_proof",
        at: proof.updatedAt,
        milestoneProof: projectMilestoneProof(proof),
      })),
      ...releases.map((release) => ({
        recordType: "fund_release",
        at: release.releasedAt,
        fundRelease: projectFundRelease(release),
      })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, limit);

    debugLog("getLotTimeline:success", {
      lotCode: args.lotCode,
      timelineCount: timeline.length,
      limit,
    });

    return {
      lotCode: args.lotCode,
      timeline,
      sourceCounts: {
        lotAuditEvents: lotAuditEvents.length,
        partnershipAuditEvents: partnershipAuditEvents.length,
        sensorSnapshots: sensors.length,
        media: media.length,
        milestoneProofs: milestones.length,
        fundReleases: releases.length,
      },
    };
  },
});

/**
 * Internal query for mirrored mock USDC balance snapshots.
 */
export const getMockUsdcBalanceSnapshots = internalQuery({
  args: {
    wallet: v.optional(v.string()),
    tokenAccount: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 10, 50);

    if (args.tokenAccount) {
      const tokenAccount = args.tokenAccount;
      const snapshots = await ctx.db
        .query("mockUsdcBalanceSnapshots")
        .withIndex("by_token_account", (q) =>
          q.eq("tokenAccount", tokenAccount),
        )
        .order("desc")
        .take(limit);

      debugLog("getMockUsdcBalanceSnapshots:byTokenAccount", {
        tokenAccount: shortId(args.tokenAccount),
        snapshotCount: snapshots.length,
        limit,
      });

      return {
        tokenAccount: args.tokenAccount,
        wallet: args.wallet ?? null,
        balanceSnapshots: snapshots.map(projectBalanceSnapshot),
      };
    }

    if (args.wallet) {
      const snapshots = await ctx.db
        .query("mockUsdcBalanceSnapshots")
        .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
        .order("desc")
        .take(limit);

      debugLog("getMockUsdcBalanceSnapshots:byWallet", {
        wallet: shortId(args.wallet),
        snapshotCount: snapshots.length,
        limit,
      });

      return {
        tokenAccount: args.tokenAccount ?? null,
        wallet: args.wallet,
        balanceSnapshots: snapshots.map(projectBalanceSnapshot),
      };
    }

    return {
      error: "Provide either wallet or tokenAccount.",
      tokenAccount: null,
      wallet: null,
      balanceSnapshots: [],
    };
  },
});

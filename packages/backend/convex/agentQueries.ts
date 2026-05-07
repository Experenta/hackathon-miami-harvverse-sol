import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

const DEBUG_SCOPE = "agentQueries";

function debugLog(event: string, fields: Record<string, unknown>) {
  console.log(`[${DEBUG_SCOPE}] ${event}`, fields);
}

function shortId(value: string | undefined | null) {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

/**
 * Internal query used by the AI agent tool to fetch full lot context.
 */
export const getLotFull = internalQuery({
  args: { lotCode: v.string() },
  handler: async (ctx, args) => {
    debugLog("getLotFull:start", { lotCode: args.lotCode });

    const lot = await ctx.db
      .query("lots")
      .withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
      .unique();

    if (!lot) {
      debugLog("getLotFull:notFound", { lotCode: args.lotCode });
      return { error: `Lot not found: ${args.lotCode}` };
    }

    // Fetch farmer profile
    const farmerProfile = await ctx.db
      .query("farmerProfiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", lot.farmerWallet))
      .unique();

    // Fetch partnership(s) for this lot
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
      .take(10);

    // Fetch partner profiles for each partnership
    const partnerProfiles = await Promise.all(
      partnerships.map(async (p) => {
        const profile = await ctx.db
          .query("partnerProfiles")
          .withIndex("by_wallet", (q) => q.eq("wallet", p.partnerWallet))
          .unique();
        return { partnership: p, partnerProfile: profile };
      }),
    );

    // Fetch agronomic plan
    const plan = await ctx.db
      .query("agronomicPlans")
      .withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
      .first();

    // Fetch sensor snapshots (latest 5)
    const sensors = await ctx.db
      .query("sensorSnapshots")
      .withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
      .take(5);

    // Fetch media
    const media = await ctx.db
      .query("lotMedia")
      .withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
      .take(10);

    debugLog("getLotFull:success", {
      lotCode: args.lotCode,
      status: lot.status,
      farmerWallet: shortId(lot.farmerWallet),
      hasFarmerProfile: Boolean(farmerProfile),
      partnershipCount: partnerships.length,
      partnerProfileCount: partnerProfiles.filter((pp) => pp.partnerProfile)
        .length,
      hasAgronomicPlan: Boolean(plan),
      sensorCount: sensors.length,
      mediaCount: media.length,
    });

    return {
      lot: {
        lotCode: lot.lotCode,
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
        lotPda: lot.lotPda,
        createdAt: lot.createdAt,
      },
      farmerProfile: farmerProfile
        ? {
            displayName: farmerProfile.displayName,
            bio: farmerProfile.bio,
            country: farmerProfile.country,
            region: farmerProfile.region,
          }
        : null,
      partnerships: partnerProfiles.map((pp) => ({
        status: pp.partnership.status,
        partnerWallet: pp.partnership.partnerWallet,
        termsHash: pp.partnership.termsHash,
        reserveTx: pp.partnership.reserveTx,
        partnerName: pp.partnerProfile?.displayName ?? "Unknown",
        organization: pp.partnerProfile?.organization ?? null,
      })),
      agronomicPlan: plan
        ? { planId: plan.planId, planJson: plan.planJson }
        : null,
      sensorSnapshots: sensors.map((s) => ({
        source: s.source,
        temperatureC: s.temperatureC,
        humidityPct: s.humidityPct,
        soilPh: s.soilPh,
        soilMoisturePct: s.soilMoisturePct,
        createdAt: s.createdAt,
      })),
      mediaCount: media.length,
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

    const partnerProfile = await ctx.db
      .query("partnerProfiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerWallet", args.wallet))
      .take(20);

    const partnershipLots = await Promise.all(
      partnerships.map(async (partnership) => {
        const lot = await ctx.db
          .query("lots")
          .withIndex("by_lot_code", (q) => q.eq("lotCode", partnership.lotCode))
          .unique();

        return {
          partnership: {
            lotCode: partnership.lotCode,
            status: partnership.status,
            farmerWallet: partnership.farmerWallet,
            termsHash: partnership.termsHash,
            reserveTx: partnership.reserveTx,
            partnershipPda: partnership.partnershipPda,
          },
          lot: lot
            ? {
                farmName: lot.farmName,
                variety: lot.variety,
                region: lot.region,
                country: lot.country,
                ticketUsdcCents: lot.ticketUsdcCents,
                farmerShareBps: lot.farmerShareBps,
                partnerShareBps: lot.partnerShareBps,
                status: lot.status,
              }
            : null,
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
      partnerProfile: partnerProfile
        ? {
            displayName: partnerProfile.displayName,
            organization: partnerProfile.organization,
          }
        : null,
      partnerships: partnershipLots,
      catalog: catalog.map((lot) => ({
        lotCode: lot.lotCode,
        farmName: lot.farmName,
        variety: lot.variety,
        region: lot.region,
        country: lot.country,
        ticketUsdcCents: lot.ticketUsdcCents,
        farmerShareBps: lot.farmerShareBps,
        partnerShareBps: lot.partnerShareBps,
        status: lot.status,
      })),
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

    const farmerProfile = await ctx.db
      .query("farmerProfiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();

    const lots = await ctx.db
      .query("lots")
      .withIndex("by_farmer", (q) => q.eq("farmerWallet", args.wallet))
      .take(20);

    debugLog("getFarmerWorkspace:success", {
      wallet: shortId(args.wallet),
      hasProfile: Boolean(farmerProfile),
      lotCount: lots.length,
      draftCount: lots.filter((lot) => lot.status === "draft").length,
      publishedCount: lots.filter((lot) => lot.status === "published").length,
    });

    return {
      farmerProfile: farmerProfile
        ? {
            displayName: farmerProfile.displayName,
            bio: farmerProfile.bio,
            country: farmerProfile.country,
            region: farmerProfile.region,
          }
        : null,
      lots: lots.map((lot) => ({
        lotCode: lot.lotCode,
        status: lot.status,
        farmName: lot.farmName,
        variety: lot.variety,
        region: lot.region,
        country: lot.country,
        ticketUsdcCents: lot.ticketUsdcCents,
        farmerShareBps: lot.farmerShareBps,
        partnerShareBps: lot.partnerShareBps,
        lotPda: lot.lotPda,
      })),
    };
  },
});

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query used by the AI agent tool to fetch full lot context.
 */
export const getLotFull = internalQuery({
  args: { lotCode: v.string() },
  handler: async (ctx, args) => {
    const lot = await ctx.db
      .query("lots")
      .withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
      .unique();

    if (!lot) {
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

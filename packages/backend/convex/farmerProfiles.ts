import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns the farmer profile for a given wallet address, or null if not found.
 */
export const getByWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("farmerProfiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();
  },
});

/**
 * Creates or updates a farmer profile. Idempotent by wallet address.
 */
export const upsert = mutation({
  args: {
    wallet: v.string(),
    farmerProfilePda: v.optional(v.string()),
    displayName: v.string(),
    bio: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    metadataHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("farmerProfiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        farmerProfilePda: args.farmerProfilePda ?? existing.farmerProfilePda,
        displayName: args.displayName,
        bio: args.bio,
        country: args.country,
        region: args.region,
        metadataHash: args.metadataHash,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("farmerProfiles", {
      wallet: args.wallet,
      farmerProfilePda: args.farmerProfilePda,
      displayName: args.displayName,
      bio: args.bio,
      country: args.country,
      region: args.region,
      metadataHash: args.metadataHash,
      createdAt: now,
      updatedAt: now,
    });
  },
});

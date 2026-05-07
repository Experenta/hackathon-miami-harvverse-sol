import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns the partner profile for a given wallet address, or null if not found.
 */
export const getByWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("partnerProfiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();
  },
});

/**
 * Creates or updates a partner profile. Idempotent by wallet address.
 */
export const upsert = mutation({
  args: {
    wallet: v.string(),
    partnerProfilePda: v.optional(v.string()),
    displayName: v.string(),
    organization: v.optional(v.string()),
    metadataHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("partnerProfiles")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        partnerProfilePda: args.partnerProfilePda ?? existing.partnerProfilePda,
        displayName: args.displayName,
        organization: args.organization,
        metadataHash: args.metadataHash,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("partnerProfiles", {
      wallet: args.wallet,
      partnerProfilePda: args.partnerProfilePda,
      displayName: args.displayName,
      organization: args.organization,
      metadataHash: args.metadataHash,
      createdAt: now,
      updatedAt: now,
    });
  },
});

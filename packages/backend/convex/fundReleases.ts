import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const listByPartnership = query({
  args: { partnershipId: v.id("partnerships") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fundReleases")
      .withIndex("by_partnership", (q) =>
        q.eq("partnershipId", args.partnershipId),
      )
      .take(20);
  },
});

export const recordRelease = mutation({
  args: {
    partnershipId: v.id("partnerships"),
    partnershipPda: v.string(),
    releaseIndex: v.number(),
    amountBaseUnits: v.number(),
    releaseTx: v.string(),
    recipientWallet: v.string(),
  },
  handler: async (ctx, args) => {
    const partnership = await ctx.db.get(args.partnershipId);
    if (!partnership) {
      throw new Error(`Partnership not found: ${args.partnershipId}`);
    }

    const existing = await ctx.db
      .query("fundReleases")
      .withIndex("by_partnership_and_release", (q) =>
        q
          .eq("partnershipId", args.partnershipId)
          .eq("releaseIndex", args.releaseIndex),
      )
      .unique();
    if (existing) {
      throw new Error(`Release ${args.releaseIndex} is already mirrored`);
    }

    const releasedAt = Date.now();
    const releaseId = await ctx.db.insert("fundReleases", {
      partnershipId: args.partnershipId,
      partnershipPda: args.partnershipPda,
      releaseIndex: args.releaseIndex,
      amountBaseUnits: args.amountBaseUnits,
      releaseTx: args.releaseTx,
      recipientWallet: args.recipientWallet,
      releasedAt,
    });

    await ctx.db.patch(args.partnershipId, {
      releasedAmountBaseUnits:
        (partnership.releasedAmountBaseUnits ?? 0) + args.amountBaseUnits,
      updatedAt: releasedAt,
    });

    await ctx.runMutation(internal.audit.recordInternal, {
      actorWallet: args.recipientWallet,
      kind: "funds_released",
      entityType: "partnership",
      entityId: partnership.lotCode,
      data: {
        partnershipId: args.partnershipId,
        partnershipPda: args.partnershipPda,
        releaseIndex: args.releaseIndex,
        amountBaseUnits: args.amountBaseUnits,
        releaseTx: args.releaseTx,
      },
    });

    return releaseId;
  },
});

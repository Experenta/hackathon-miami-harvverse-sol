import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const listByPartnership = query({
  args: { partnershipId: v.id("partnerships") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("milestoneProofs")
      .withIndex("by_partnership", (q) =>
        q.eq("partnershipId", args.partnershipId),
      )
      .take(20);
  },
});

export const recordMockProof = mutation({
  args: {
    partnershipId: v.id("partnerships"),
    partnershipPda: v.optional(v.string()),
    lotCode: v.string(),
    milestoneIndex: v.number(),
    proofHash: v.string(),
    proofTx: v.optional(v.string()),
    recordedByWallet: v.string(),
    status: v.union(v.literal("draft"), v.literal("recorded")),
    title: v.string(),
    caption: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.string())),
    receiptText: v.optional(v.string()),
    gpsText: v.optional(v.string()),
    iotPayload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (args.milestoneIndex < 1 || args.milestoneIndex > 6) {
      throw new Error("Milestone index must be between 1 and 6");
    }
    if (!args.proofHash || /^0+$/.test(args.proofHash)) {
      throw new Error("Proof hash cannot be empty");
    }

    const partnership = await ctx.db.get(args.partnershipId);
    if (!partnership) {
      throw new Error(`Partnership not found: ${args.partnershipId}`);
    }

    const existing = await ctx.db
      .query("milestoneProofs")
      .withIndex("by_partnership_and_milestone", (q) =>
        q
          .eq("partnershipId", args.partnershipId)
          .eq("milestoneIndex", args.milestoneIndex),
      )
      .unique();

    const now = Date.now();
    const patch = {
      partnershipPda: args.partnershipPda,
      lotCode: args.lotCode,
      proofHash: args.proofHash,
      proofTx: args.proofTx,
      recordedByWallet: args.recordedByWallet,
      status: args.status,
      title: args.title,
      caption: args.caption,
      imageStorageIds: args.imageStorageIds,
      receiptText: args.receiptText,
      gpsText: args.gpsText,
      iotPayload: args.iotPayload,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    const proofId = await ctx.db.insert("milestoneProofs", {
      partnershipId: args.partnershipId,
      milestoneIndex: args.milestoneIndex,
      createdAt: now,
      ...patch,
    });

    await ctx.runMutation(internal.audit.recordInternal, {
      actorWallet: args.recordedByWallet,
      kind: "milestone_proof_recorded",
      entityType: "partnership",
      entityId: args.lotCode,
      data: {
        partnershipId: args.partnershipId,
        partnershipPda: args.partnershipPda,
        milestoneIndex: args.milestoneIndex,
        proofHash: args.proofHash,
        proofTx: args.proofTx,
      },
    });

    return proofId;
  },
});

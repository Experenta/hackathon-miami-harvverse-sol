import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Returns all partnerships for a given partner wallet.
 */
export const listByPartner = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerWallet", args.wallet))
      .take(100);
  },
});

/**
 * Returns all partnerships for a given farmer wallet.
 */
export const listByFarmer = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("partnerships")
      .withIndex("by_farmer", (q) => q.eq("farmerWallet", args.wallet))
      .take(100);
  },
});

/**
 * Returns a partnership by Convex id.
 */
export const getById = query({
  args: { partnershipId: v.id("partnerships") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.partnershipId);
  },
});

/**
 * Creates a partnership record with status "reserved".
 */
export const createPendingReservation = mutation({
  args: {
    lotCode: v.string(),
    lotPda: v.optional(v.string()),
    farmerWallet: v.string(),
    partnerWallet: v.string(),
    termsHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const partnershipId = await ctx.db.insert("partnerships", {
      lotCode: args.lotCode,
      lotPda: args.lotPda,
      farmerWallet: args.farmerWallet,
      partnerWallet: args.partnerWallet,
      termsHash: args.termsHash,
      status: "reserved",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.audit.recordInternal, {
      actorWallet: args.partnerWallet,
      kind: "partnership_reserved",
      entityType: "partnership",
      entityId: args.lotCode,
      data: {
        lotCode: args.lotCode,
        farmerWallet: args.farmerWallet,
        partnerWallet: args.partnerWallet,
      },
    });

    return partnershipId;
  },
});

/**
 * Creates the funded reservation mirror after the on-chain escrow transaction confirms.
 */
export const createFundedReservation = mutation({
  args: {
    lotCode: v.string(),
    lotPda: v.optional(v.string()),
    farmerWallet: v.string(),
    partnerWallet: v.string(),
    termsHash: v.string(),
    partnershipPda: v.string(),
    ticketUsdcCents: v.number(),
    mockUsdcMint: v.string(),
    escrowVault: v.string(),
    escrowPda: v.string(),
    fundingTx: v.string(),
    depositedAmountBaseUnits: v.number(),
    releasedAmountBaseUnits: v.number(),
    reserveAmountBaseUnits: v.number(),
    releaseScheduleBaseUnits: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("partnerships")
      .withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
      .take(20);

    const duplicate = existing.find(
      (item) => item.partnerWallet === args.partnerWallet,
    );
    if (duplicate) {
      throw new Error(
        `Partnership already mirrored for ${args.lotCode} and ${args.partnerWallet}`,
      );
    }

    const partnershipId = await ctx.db.insert("partnerships", {
      lotCode: args.lotCode,
      lotPda: args.lotPda,
      farmerWallet: args.farmerWallet,
      partnerWallet: args.partnerWallet,
      termsHash: args.termsHash,
      partnershipPda: args.partnershipPda,
      reserveTx: args.fundingTx,
      ticketUsdcCents: args.ticketUsdcCents,
      mockUsdcMint: args.mockUsdcMint,
      escrowVault: args.escrowVault,
      escrowPda: args.escrowPda,
      fundingTx: args.fundingTx,
      fundedAt: now,
      depositedAmountBaseUnits: args.depositedAmountBaseUnits,
      releasedAmountBaseUnits: args.releasedAmountBaseUnits,
      reserveAmountBaseUnits: args.reserveAmountBaseUnits,
      releaseScheduleBaseUnits: args.releaseScheduleBaseUnits,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const lot = await ctx.db
      .query("lots")
      .withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
      .unique();
    if (lot) {
      await ctx.db.patch(lot._id, {
        status: "in_cycle",
        updatedAt: now,
      });
    }

    await ctx.runMutation(internal.audit.recordInternal, {
      actorWallet: args.partnerWallet,
      kind: "partnership_funded",
      entityType: "partnership",
      entityId: args.lotCode,
      data: {
        lotCode: args.lotCode,
        farmerWallet: args.farmerWallet,
        partnerWallet: args.partnerWallet,
        partnershipPda: args.partnershipPda,
        escrowVault: args.escrowVault,
        fundingTx: args.fundingTx,
        depositedAmountBaseUnits: args.depositedAmountBaseUnits,
      },
    });

    return partnershipId;
  },
});

/**
 * Records the partnership PDA address and reservation transaction signature.
 */
export const recordReservationTx = mutation({
  args: {
    partnershipId: v.id("partnerships"),
    partnershipPda: v.string(),
    tx: v.string(),
  },
  handler: async (ctx, args) => {
    const partnership = await ctx.db.get(args.partnershipId);

    if (!partnership) {
      throw new Error(`Partnership not found: ${args.partnershipId}`);
    }

    await ctx.db.patch(args.partnershipId, {
      partnershipPda: args.partnershipPda,
      reserveTx: args.tx,
      updatedAt: Date.now(),
    });

    return args.partnershipId;
  },
});

/**
 * Updates mirrored escrow amounts from an RPC/on-chain refresh.
 */
export const updateEscrowSnapshot = mutation({
  args: {
    partnershipId: v.id("partnerships"),
    releasedAmountBaseUnits: v.number(),
    reserveAmountBaseUnits: v.number(),
  },
  handler: async (ctx, args) => {
    const partnership = await ctx.db.get(args.partnershipId);

    if (!partnership) {
      throw new Error(`Partnership not found: ${args.partnershipId}`);
    }

    await ctx.db.patch(args.partnershipId, {
      releasedAmountBaseUnits: args.releasedAmountBaseUnits,
      reserveAmountBaseUnits: args.reserveAmountBaseUnits,
      updatedAt: Date.now(),
    });

    return args.partnershipId;
  },
});

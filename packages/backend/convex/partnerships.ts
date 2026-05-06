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

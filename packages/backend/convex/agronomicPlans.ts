import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns the agronomic plan for a given lot code, or null if not found.
 */
export const getByLot = query({
	args: { lotCode: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("agronomicPlans")
			.withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
			.unique();
	},
});

/**
 * Creates or updates the agronomic plan for a lot. Idempotent by lot code.
 */
export const upsertPlan = mutation({
	args: {
		lotCode: v.string(),
		planId: v.string(),
		planJson: v.any(),
		hash: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("agronomicPlans")
			.withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				planId: args.planId,
				planJson: args.planJson,
				hash: args.hash,
			});
			return existing._id;
		}

		return await ctx.db.insert("agronomicPlans", {
			lotCode: args.lotCode,
			planId: args.planId,
			planJson: args.planJson,
			hash: args.hash,
			createdAt: Date.now(),
		});
	},
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all media items for a given lot code.
 */
export const listByLot = query({
	args: { lotCode: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("lotMedia")
			.withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
			.take(100);
	},
});

/**
 * Adds a media item to a lot.
 */
export const addMedia = mutation({
	args: {
		lotCode: v.string(),
		storageId: v.string(),
		kind: v.union(
			v.literal("farm_photo"),
			v.literal("document"),
			v.literal("sensor_photo"),
		),
		caption: v.optional(v.string()),
		hash: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("lotMedia", {
			lotCode: args.lotCode,
			storageId: args.storageId,
			kind: args.kind,
			caption: args.caption,
			hash: args.hash,
			createdAt: Date.now(),
		});
	},
});

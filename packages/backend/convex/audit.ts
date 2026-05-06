import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Records an audit event for a given entity.
 */
export const record = mutation({
	args: {
		actorWallet: v.optional(v.string()),
		kind: v.string(),
		entityType: v.string(),
		entityId: v.string(),
		data: v.any(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("auditEvents", {
			actorWallet: args.actorWallet,
			kind: args.kind,
			entityType: args.entityType,
			entityId: args.entityId,
			data: args.data,
			createdAt: Date.now(),
		});
	},
});

/**
 * Returns audit events for a given entity type and entity ID.
 */
export const listByEntity = query({
	args: {
		entityType: v.string(),
		entityId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("auditEvents")
			.withIndex("by_entity", (q) =>
				q
					.eq("entityType", args.entityType)
					.eq("entityId", args.entityId),
			)
			.take(100);
	},
});

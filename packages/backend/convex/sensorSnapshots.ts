import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all sensor snapshots for a given lot code.
 */
export const listByLot = query({
	args: { lotCode: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("sensorSnapshots")
			.withIndex("by_lot", (q) => q.eq("lotCode", args.lotCode))
			.take(100);
	},
});

/**
 * Adds a sensor snapshot to a lot.
 */
export const addSnapshot = mutation({
	args: {
		lotCode: v.string(),
		source: v.union(
			v.literal("demo_autofill"),
			v.literal("manual"),
			v.literal("iot_future"),
		),
		temperatureC: v.optional(v.number()),
		humidityPct: v.optional(v.number()),
		soilPh: v.optional(v.number()),
		soilMoisturePct: v.optional(v.number()),
		payload: v.any(),
		hash: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("sensorSnapshots", {
			lotCode: args.lotCode,
			source: args.source,
			temperatureC: args.temperatureC,
			humidityPct: args.humidityPct,
			soilPh: args.soilPh,
			soilMoisturePct: args.soilMoisturePct,
			payload: args.payload,
			hash: args.hash,
			createdAt: Date.now(),
		});
	},
});

import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Zafiro demo lot constants used by applyDemoAutofill
const ZAFIRO_DEMO = {
	lotCode: "HV-HN-ZAF-L02",
	farmName: "Zafiro",
	country: "Honduras",
	region: "Comayagua",
	latitude: 14.9465,
	longitude: -88.0863,
	altitudeMeters: 1300,
	variety: "Parainema",
	areaManzanas: 1.0,
	ticketUsdcCents: 342500, // $3,425.00
	farmerShareBps: 6000,
	partnerShareBps: 4000,
} as const;

/**
 * Returns all lots with status "published".
 */
export const listPublished = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query("lots")
			.withIndex("by_status", (q) => q.eq("status", "published"))
			.take(100);
	},
});

/**
 * Returns the lot record for a given lot code, or null if not found.
 */
export const getByCode = query({
	args: { lotCode: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("lots")
			.withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
			.unique();
	},
});

/**
 * Returns all lots belonging to a farmer wallet.
 */
export const listByFarmer = query({
	args: { wallet: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("lots")
			.withIndex("by_farmer", (q) => q.eq("farmerWallet", args.wallet))
			.take(100);
	},
});

/**
 * Creates a new lot in "draft" status with all provided lot fields.
 */
export const createDraft = mutation({
	args: {
		lotCode: v.string(),
		farmerWallet: v.string(),
		farmName: v.string(),
		variety: v.string(),
		region: v.string(),
		country: v.string(),
		latitude: v.number(),
		longitude: v.number(),
		altitudeMeters: v.number(),
		areaManzanas: v.number(),
		ticketUsdcCents: v.number(),
		farmerShareBps: v.number(),
		partnerShareBps: v.number(),
		metadataHash: v.optional(v.string()),
		planHash: v.optional(v.string()),
		mediaManifestHash: v.optional(v.string()),
		sensorManifestHash: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const emptyHash = "0".repeat(64); // placeholder until hashes are computed on publish

		const lotId = await ctx.db.insert("lots", {
			lotCode: args.lotCode,
			farmerWallet: args.farmerWallet,
			status: "draft",
			farmName: args.farmName,
			variety: args.variety,
			region: args.region,
			country: args.country,
			latitude: args.latitude,
			longitude: args.longitude,
			altitudeMeters: args.altitudeMeters,
			areaManzanas: args.areaManzanas,
			ticketUsdcCents: args.ticketUsdcCents,
			farmerShareBps: args.farmerShareBps,
			partnerShareBps: args.partnerShareBps,
			metadataHash: args.metadataHash ?? emptyHash,
			planHash: args.planHash ?? emptyHash,
			mediaManifestHash: args.mediaManifestHash ?? emptyHash,
			sensorManifestHash: args.sensorManifestHash ?? emptyHash,
			createdAt: now,
			updatedAt: now,
		});

		await ctx.runMutation(internal.audit.recordInternal, {
			actorWallet: args.farmerWallet,
			kind: "lot_created",
			entityType: "lot",
			entityId: args.lotCode,
			data: {
				lotCode: args.lotCode,
				farmName: args.farmName,
				status: "draft",
			},
		});

		return lotId;
	},
});

/**
 * Applies Zafiro demo data to an existing draft lot.
 */
export const applyDemoAutofill = mutation({
	args: { lotCode: v.string() },
	handler: async (ctx, args) => {
		const lot = await ctx.db
			.query("lots")
			.withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
			.unique();

		if (!lot) {
			throw new Error(`Lot not found: ${args.lotCode}`);
		}

		if (lot.status !== "draft") {
			throw new Error(
				`Cannot autofill a lot that is not in draft status`,
			);
		}

		await ctx.db.patch(lot._id, {
			farmName: ZAFIRO_DEMO.farmName,
			country: ZAFIRO_DEMO.country,
			region: ZAFIRO_DEMO.region,
			latitude: ZAFIRO_DEMO.latitude,
			longitude: ZAFIRO_DEMO.longitude,
			altitudeMeters: ZAFIRO_DEMO.altitudeMeters,
			variety: ZAFIRO_DEMO.variety,
			areaManzanas: ZAFIRO_DEMO.areaManzanas,
			ticketUsdcCents: ZAFIRO_DEMO.ticketUsdcCents,
			farmerShareBps: ZAFIRO_DEMO.farmerShareBps,
			partnerShareBps: ZAFIRO_DEMO.partnerShareBps,
			updatedAt: Date.now(),
		});

		return lot._id;
	},
});

/**
 * Records the on-chain lot PDA address and creation transaction signature.
 */
export const recordOnChainLot = mutation({
	args: {
		lotCode: v.string(),
		lotPda: v.string(),
		tx: v.string(),
	},
	handler: async (ctx, args) => {
		const lot = await ctx.db
			.query("lots")
			.withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
			.unique();

		if (!lot) {
			throw new Error(`Lot not found: ${args.lotCode}`);
		}

		await ctx.db.patch(lot._id, {
			lotPda: args.lotPda,
			updatedAt: Date.now(),
		});

		return lot._id;
	},
});

/**
 * Updates the lot status to "published" and records the publish transaction signature.
 */
export const markPublished = mutation({
	args: {
		lotCode: v.string(),
		tx: v.string(),
		metadataHash: v.optional(v.string()),
		planHash: v.optional(v.string()),
		mediaManifestHash: v.optional(v.string()),
		sensorManifestHash: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const lot = await ctx.db
			.query("lots")
			.withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
			.unique();

		if (!lot) {
			throw new Error(`Lot not found: ${args.lotCode}`);
		}

		const updates: Record<string, unknown> = {
			status: "published",
			updatedAt: Date.now(),
		};

		if (args.metadataHash !== undefined)
			updates.metadataHash = args.metadataHash;
		if (args.planHash !== undefined) updates.planHash = args.planHash;
		if (args.mediaManifestHash !== undefined)
			updates.mediaManifestHash = args.mediaManifestHash;
		if (args.sensorManifestHash !== undefined)
			updates.sensorManifestHash = args.sensorManifestHash;

		await ctx.db.patch(lot._id, updates);

		await ctx.runMutation(internal.audit.recordInternal, {
			actorWallet: lot.farmerWallet,
			kind: "lot_published",
			entityType: "lot",
			entityId: args.lotCode,
			data: { lotCode: args.lotCode, tx: args.tx },
		});

		return lot._id;
	},
});

/**
 * Updates an existing draft lot with new field values.
 * Only lots in "draft" status can be updated.
 */
export const updateDraft = mutation({
	args: {
		lotCode: v.string(),
		farmName: v.optional(v.string()),
		variety: v.optional(v.string()),
		region: v.optional(v.string()),
		country: v.optional(v.string()),
		latitude: v.optional(v.number()),
		longitude: v.optional(v.number()),
		altitudeMeters: v.optional(v.number()),
		areaManzanas: v.optional(v.number()),
		ticketUsdcCents: v.optional(v.number()),
		farmerShareBps: v.optional(v.number()),
		partnerShareBps: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const lot = await ctx.db
			.query("lots")
			.withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
			.unique();

		if (!lot) {
			throw new Error(`Lot not found: ${args.lotCode}`);
		}

		if (lot.status !== "draft") {
			throw new Error("Cannot update a lot that is not in draft status");
		}

		const { lotCode: _, ...updates } = args;
		const patchData: Record<string, unknown> = { updatedAt: Date.now() };

		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patchData[key] = value;
			}
		}

		await ctx.db.patch(lot._id, patchData);

		return lot._id;
	},
});

/**
 * Synchronizes the mirrored Convex lot status with the live on-chain state.
 */
export const syncStatusFromChain = mutation({
	args: {
		lotCode: v.string(),
		status: v.union(
			v.literal("draft"),
			v.literal("published"),
			v.literal("reserved"),
			v.literal("in_cycle"),
			v.literal("settled"),
			v.literal("cancelled"),
		),
	},
	handler: async (ctx, args) => {
		const lot = await ctx.db
			.query("lots")
			.withIndex("by_lot_code", (q) => q.eq("lotCode", args.lotCode))
			.unique();

		if (!lot) {
			throw new Error(`Lot not found: ${args.lotCode}`);
		}

		if (lot.status === args.status) {
			return lot._id;
		}

		await ctx.db.patch(lot._id, {
			status: args.status,
			updatedAt: Date.now(),
		});

		return lot._id;
	},
});

import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Returns the user record for a given wallet address, or null if not found.
 */
export const getByWallet = query({
	args: { wallet: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("users")
			.withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
			.unique();
	},
});

/**
 * Creates a new user record if none exists for the wallet, otherwise updates
 * `updatedAt`. Idempotent — safe to call on every wallet connect.
 */
export const upsertAfterWalletConnect = mutation({
	args: { wallet: v.string() },
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("users")
			.withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
			.unique();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, { updatedAt: now });
			return existing._id;
		}

		return await ctx.db.insert("users", {
			wallet: args.wallet,
			createdAt: now,
			updatedAt: now,
		});
	},
});

/**
 * Records the on-chain role registration for a user — stores the role kind,
 * the UserRole PDA address, and the transaction signature.
 */
export const recordRoleRegistration = mutation({
	args: {
		wallet: v.string(),
		role: v.union(v.literal("farmer"), v.literal("partner")),
		rolePda: v.string(),
		roleTx: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("users")
			.withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
			.unique();

		const now = Date.now();
		let userId;

		if (existing) {
			await ctx.db.patch(existing._id, {
				role: args.role,
				rolePda: args.rolePda,
				roleTx: args.roleTx,
				updatedAt: now,
			});
			userId = existing._id;
		} else {
			// Create the user record if it doesn't exist yet (edge case)
			userId = await ctx.db.insert("users", {
				wallet: args.wallet,
				role: args.role,
				rolePda: args.rolePda,
				roleTx: args.roleTx,
				createdAt: now,
				updatedAt: now,
			});
		}

		await ctx.runMutation(internal.audit.recordInternal, {
			actorWallet: args.wallet,
			kind: "role_registered",
			entityType: "user",
			entityId: args.wallet,
			data: {
				role: args.role,
				rolePda: args.rolePda,
				roleTx: args.roleTx,
			},
		});

		return userId;
	},
});

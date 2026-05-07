import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByTokenAccount = query({
  args: { tokenAccount: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mockUsdcBalanceSnapshots")
      .withIndex("by_token_account", (q) =>
        q.eq("tokenAccount", args.tokenAccount),
      )
      .order("desc")
      .take(20);
  },
});

export const recordSnapshot = mutation({
  args: {
    wallet: v.optional(v.string()),
    tokenAccount: v.string(),
    mint: v.string(),
    role: v.union(
      v.literal("partner"),
      v.literal("farmer"),
      v.literal("vault"),
      v.literal("other"),
    ),
    balanceBaseUnits: v.number(),
    balanceUiAmount: v.number(),
    sourceTx: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mockUsdcBalanceSnapshots", {
      wallet: args.wallet,
      tokenAccount: args.tokenAccount,
      mint: args.mint,
      role: args.role,
      balanceBaseUnits: args.balanceBaseUnits,
      balanceUiAmount: args.balanceUiAmount,
      sourceTx: args.sourceTx,
      observedAt: Date.now(),
    });
  },
});

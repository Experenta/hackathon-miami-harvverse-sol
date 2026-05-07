import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { components } from "./_generated/api";
import { createThread, saveMessage, listUIMessages } from "@convex-dev/agent";

/**
 * Get or create a thread for a wallet + lotCode combination.
 */
export const getOrCreateThread = mutation({
	args: {
		wallet: v.string(),
		role: v.union(v.literal("farmer"), v.literal("partner")),
		lotCode: v.string(),
	},
	handler: async (ctx: any, args: any): Promise<string> => {
		// Check if thread already exists
		const existing = await ctx.db
			.query("agentThreads")
			.withIndex("by_wallet_lot", (q: any) =>
				q.eq("wallet", args.wallet).eq("lotCode", args.lotCode),
			)
			.first();

		if (existing) {
			return existing.threadId;
		}

		// Create a new thread using the component directly
		const result: any = await createThread(ctx, components.agent, {});
		const threadId = result.threadId || result; // Handle both possible return formats

		const now = Date.now();
		await ctx.db.insert("agentThreads", {
			wallet: args.wallet,
			role: args.role,
			agentName: "Harvverse Assistant",
			threadId,
			lotCode: args.lotCode,
			createdAt: now,
			updatedAt: now,
		});

		return threadId;
	},
});

/**
 * Send a message to the agent and trigger generation.
 */
export const sendMessage = mutation({
	args: {
		threadId: v.string(),
		message: v.string(),
		lotCode: v.string(),
	},
	handler: async (ctx: any, args: any): Promise<string> => {
		// Save the user message into the thread using the component directly
		const result: any = await saveMessage(ctx, components.agent, {
			threadId: args.threadId,
			prompt: args.message,
		});

		const messageId = result.messageId || result;

		// Schedule the generation action
		await ctx.scheduler.runAfter(
			0,
			internal.agentChatActions.generateResponse,
			{
				threadId: args.threadId,
				promptMessageId: messageId,
				lotCode: args.lotCode,
			},
		);

		return messageId;
	},
});

/**
 * List messages in a thread for the UI.
 */
export const listThreadMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: v.object({
			cursor: v.union(v.string(), v.null()),
			numItems: v.number(),
		}),
	},
	handler: async (ctx: any, args: any): Promise<any> => {
		return await listUIMessages(ctx, components.agent, {
			threadId: args.threadId,
			paginationOpts: args.paginationOpts,
		});
	},
});

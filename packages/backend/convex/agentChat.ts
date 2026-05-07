import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { components } from "./_generated/api";
import { createThread, saveMessage, listUIMessages } from "@convex-dev/agent";

const DEBUG_SCOPE = "agentChat";

function debugLog(event: string, fields: Record<string, unknown>) {
  console.log(`[${DEBUG_SCOPE}] ${event}`, fields);
}

function debugError(event: string, fields: Record<string, unknown>) {
  console.error(`[${DEBUG_SCOPE}] ${event}`, fields);
}

function shortId(value: string | undefined | null) {
  if (!value) return null;
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function contextFields(args: {
  wallet: string;
  role: "farmer" | "partner";
  lotCode: string;
}) {
  return {
    wallet: shortId(args.wallet),
    role: args.role,
    lotCode: args.lotCode || null,
    scope: args.lotCode ? "lot" : "workspace",
  };
}

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
    debugLog("getOrCreateThread:start", contextFields(args));

    // Check if thread already exists
    const existing = await ctx.db
      .query("agentThreads")
      .withIndex("by_wallet_role_lot", (q: any) =>
        q
          .eq("wallet", args.wallet)
          .eq("role", args.role)
          .eq("lotCode", args.lotCode),
      )
      .first();

    if (existing) {
      debugLog("getOrCreateThread:reuse", {
        ...contextFields(args),
        threadId: shortId(existing.threadId),
        mappingId: existing._id,
      });
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

    debugLog("getOrCreateThread:create", {
      ...contextFields(args),
      threadId: shortId(threadId),
    });

    return threadId;
  },
});

/**
 * Starts a fresh thread for a wallet + role + lotCode context.
 */
export const resetThread = mutation({
  args: {
    wallet: v.string(),
    role: v.union(v.literal("farmer"), v.literal("partner")),
    lotCode: v.string(),
  },
  handler: async (ctx: any, args: any): Promise<string> => {
    debugLog("resetThread:start", contextFields(args));

    const existing = await ctx.db
      .query("agentThreads")
      .withIndex("by_wallet_role_lot", (q: any) =>
        q
          .eq("wallet", args.wallet)
          .eq("role", args.role)
          .eq("lotCode", args.lotCode),
      )
      .first();

    const result: any = await createThread(ctx, components.agent, {});
    const threadId = result.threadId || result;
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        threadId,
        updatedAt: now,
      });
      debugLog("resetThread:updateMapping", {
        ...contextFields(args),
        previousThreadId: shortId(existing.threadId),
        nextThreadId: shortId(threadId),
        mappingId: existing._id,
      });
      return threadId;
    }

    await ctx.db.insert("agentThreads", {
      wallet: args.wallet,
      role: args.role,
      agentName: "Harvverse Assistant",
      threadId,
      lotCode: args.lotCode,
      createdAt: now,
      updatedAt: now,
    });

    debugLog("resetThread:createMapping", {
      ...contextFields(args),
      nextThreadId: shortId(threadId),
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
    debugLog("sendMessage:start", {
      threadId: shortId(args.threadId),
      lotCodeArg: args.lotCode || null,
      messageChars: args.message.length,
    });

    const thread = await ctx.db
      .query("agentThreads")
      .withIndex("by_thread", (q: any) => q.eq("threadId", args.threadId))
      .unique();

    if (!thread) {
      debugError("sendMessage:threadMissing", {
        threadId: shortId(args.threadId),
        lotCodeArg: args.lotCode || null,
        messageChars: args.message.length,
      });
      throw new Error("Agent thread not found");
    }

    // Save the user message into the thread using the component directly
    const result: any = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      prompt: args.message,
    });

    const messageId = result.messageId || result;
    const lotCode = thread.lotCode ?? args.lotCode;

    await ctx.db.patch(thread._id, { updatedAt: Date.now() });

    debugLog("sendMessage:saved", {
      wallet: shortId(thread.wallet),
      role: thread.role,
      threadId: shortId(args.threadId),
      messageId: shortId(messageId),
      lotCode: lotCode || null,
      scope: lotCode ? "lot" : "workspace",
    });

    // Schedule the generation action
    await ctx.scheduler.runAfter(
      0,
      internal.agentChatActions.generateResponse,
      {
        threadId: args.threadId,
        promptMessageId: messageId,
        lotCode,
        wallet: thread.wallet,
        role: thread.role,
      },
    );

    debugLog("sendMessage:scheduledGeneration", {
      threadId: shortId(args.threadId),
      promptMessageId: shortId(messageId),
      lotCode: lotCode || null,
      role: thread.role,
    });

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
    const result = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
    debugLog("listThreadMessages:result", {
      threadId: shortId(args.threadId),
      requestedItems: args.paginationOpts.numItems,
      returnedItems: Array.isArray(result?.page) ? result.page.length : null,
      isDone: result?.isDone ?? null,
    });
    return result;
  },
});

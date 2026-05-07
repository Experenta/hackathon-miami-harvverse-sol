"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { anthropic } from "@ai-sdk/anthropic";
import { stepCountIs } from "ai";
import { z } from "zod";

// Import types from @convex-dev/agent
import { Agent as AgentClass, createTool } from "@convex-dev/agent";

const DEBUG_SCOPE = "agentChatActions";

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

function summarizeGenerationResult(result: any) {
  const steps = Array.isArray(result?.steps)
    ? result.steps.map((step: any, index: number) => ({
        index,
        finishReason: step?.finishReason ?? null,
        textChars:
          typeof step?.text === "string"
            ? step.text.length
            : Array.isArray(step?.content)
              ? JSON.stringify(step.content).length
              : null,
        toolCalls: Array.isArray(step?.toolCalls)
          ? step.toolCalls.map((call: any) => call.toolName ?? call.type)
          : [],
        toolResults: Array.isArray(step?.toolResults)
          ? step.toolResults.map(
              (toolResult: any) => toolResult.toolName ?? toolResult.type,
            )
          : [],
      }))
    : [];

  return {
    textChars: typeof result?.text === "string" ? result.text.length : null,
    finishReason: result?.finishReason ?? null,
    usage: result?.usage ?? null,
    stepCount: steps.length,
    steps,
  };
}

/**
 * Tool that fetches full lot context including farmer profile, partnership, and sensor data.
 */
const getLotContext: any = createTool({
  description:
    "Fetches complete lot information including farmer profile, partnership details, agronomic plan, and sensor data for a given lot code.",
  inputSchema: z.object({
    lotCode: z.string().describe("The Harvverse lot code, e.g. HV-HN-ZAF-L02"),
  }),
  execute: async (ctx: any, { lotCode }: { lotCode: string }): Promise<any> => {
    debugLog("tool:getLotContext:start", {
      threadId: shortId(ctx.threadId),
      messageId: shortId(ctx.messageId),
      lotCode,
    });

    try {
      const result = await ctx.runQuery(internal.agentQueries.getLotFull, {
        lotCode,
      });
      debugLog("tool:getLotContext:success", {
        threadId: shortId(ctx.threadId),
        lotCode,
        found: !result?.error,
        status: result?.lot?.status ?? null,
        partnershipCount: Array.isArray(result?.partnerships)
          ? result.partnerships.length
          : null,
        sensorCount: Array.isArray(result?.sensorSnapshots)
          ? result.sensorSnapshots.length
          : null,
        mediaCount: result?.mediaCount ?? null,
      });
      return result;
    } catch (error) {
      debugError("tool:getLotContext:error", {
        threadId: shortId(ctx.threadId),
        lotCode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

/**
 * Tool that fetches the partner's current portfolio and the available catalog.
 */
const getPartnerWorkspaceContext: any = createTool({
  description:
    "Fetches partner profile details, current partnerships, and published catalog lots for a partner wallet.",
  inputSchema: z.object({
    wallet: z.string().describe("The partner wallet public key."),
  }),
  execute: async (ctx: any, { wallet }: { wallet: string }): Promise<any> => {
    debugLog("tool:getPartnerWorkspaceContext:start", {
      threadId: shortId(ctx.threadId),
      messageId: shortId(ctx.messageId),
      wallet: shortId(wallet),
    });

    try {
      const result = await ctx.runQuery(
        internal.agentQueries.getPartnerWorkspace,
        {
          wallet,
        },
      );
      debugLog("tool:getPartnerWorkspaceContext:success", {
        threadId: shortId(ctx.threadId),
        wallet: shortId(wallet),
        hasProfile: Boolean(result?.partnerProfile),
        partnershipCount: Array.isArray(result?.partnerships)
          ? result.partnerships.length
          : null,
        catalogCount: Array.isArray(result?.catalog)
          ? result.catalog.length
          : null,
      });
      return result;
    } catch (error) {
      debugError("tool:getPartnerWorkspaceContext:error", {
        threadId: shortId(ctx.threadId),
        wallet: shortId(wallet),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

/**
 * Tool that fetches a farmer's profile and current lot portfolio.
 */
const getFarmerWorkspaceContext: any = createTool({
  description:
    "Fetches farmer profile details and the farmer's current lots for a farmer wallet.",
  inputSchema: z.object({
    wallet: z.string().describe("The farmer wallet public key."),
  }),
  execute: async (ctx: any, { wallet }: { wallet: string }): Promise<any> => {
    debugLog("tool:getFarmerWorkspaceContext:start", {
      threadId: shortId(ctx.threadId),
      messageId: shortId(ctx.messageId),
      wallet: shortId(wallet),
    });

    try {
      const result = await ctx.runQuery(
        internal.agentQueries.getFarmerWorkspace,
        {
          wallet,
        },
      );
      debugLog("tool:getFarmerWorkspaceContext:success", {
        threadId: shortId(ctx.threadId),
        wallet: shortId(wallet),
        hasProfile: Boolean(result?.farmerProfile),
        lotCount: Array.isArray(result?.lots) ? result.lots.length : null,
      });
      return result;
    } catch (error) {
      debugError("tool:getFarmerWorkspaceContext:error", {
        threadId: shortId(ctx.threadId),
        wallet: shortId(wallet),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

const harvverseAgent: any = new AgentClass(components.agent, {
  name: "Harvverse Assistant",
  languageModel: anthropic("claude-sonnet-4-5-20250929"),
  instructions: `You are the Harvverse AI Assistant, an expert in coffee lot management on the Solana blockchain.

You help farmers and partners understand their lots, partnerships, and agronomic data.

When a user asks about a lot:
- Use the getLotContext tool to fetch the full lot data
- Explain the lot details clearly: farm name, variety, location, ticket price, revenue split
- If there's a partnership, explain the partner relationship and terms
- If there's an agronomic plan, summarize the key milestones
- If there are sensor readings, summarize the environmental conditions

When a user is not viewing a specific lot:
- For partner questions, use getPartnerWorkspaceContext to summarize current partnerships and available catalog lots
- For farmer questions, use getFarmerWorkspaceContext to summarize the farmer's portfolio
- Ask for a specific lot code when the question requires lot-level sensor, media, or agronomic detail

Important context:
- Ticket price is in USD cents (divide by 100 for dollars)
- Share values are in basis points (divide by 100 for percentage)
- Altitude is in meters above sea level
- Area is in manzanas (a Central American unit, ~0.7 hectares)

You speak in a friendly, professional tone. You can respond in Spanish or English depending on the user's language.

You never sign transactions or make financial recommendations. You only explain verified on-chain and off-chain data.

Keep responses concise but informative.`,
  tools: {
    getLotContext,
    getPartnerWorkspaceContext,
    getFarmerWorkspaceContext,
  },
});

/**
 * Internal action that runs the agent generation (requires Node.js runtime).
 */
export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    lotCode: v.string(),
    wallet: v.string(),
    role: v.union(v.literal("farmer"), v.literal("partner")),
  },
  handler: async (ctx: any, args: any): Promise<string> => {
    const trimmedLotCode = args.lotCode.trim();
    const isLotScoped = Boolean(trimmedLotCode);
    const tools = isLotScoped
      ? { getLotContext }
      : args.role === "partner"
        ? { getPartnerWorkspaceContext }
        : { getFarmerWorkspaceContext };
    const screenContext = isLotScoped
      ? `The user is currently viewing lot: ${trimmedLotCode}. Use getLotContext with this lot code to answer lot-specific questions.`
      : args.role === "partner"
        ? `The user is viewing the partner workspace or catalog. No lot is selected. Use getPartnerWorkspaceContext with wallet ${args.wallet} to answer portfolio, partnership, and catalog questions. Do not ask for a lot code unless the user asks for lot-level sensor, media, or agronomic detail.`
        : `The user is viewing the farmer workspace. No lot is selected. Use getFarmerWorkspaceContext with wallet ${args.wallet} to answer portfolio questions. Do not ask for a lot code unless the user asks for lot-level sensor, media, or agronomic detail.`;

    debugLog("generateResponse:start", {
      threadId: shortId(args.threadId),
      promptMessageId: shortId(args.promptMessageId),
      wallet: shortId(args.wallet),
      role: args.role,
      lotCode: trimmedLotCode || null,
      scope: isLotScoped ? "lot" : "workspace",
      tools: Object.keys(tools),
      maxSteps: 5,
    });

    try {
      const result: any = await harvverseAgent.generateText(
        ctx,
        { threadId: args.threadId },
        {
          promptMessageId: args.promptMessageId,
          system: screenContext,
          tools,
          stopWhen: stepCountIs(5),
        },
      );

      debugLog("generateResponse:success", {
        threadId: shortId(args.threadId),
        promptMessageId: shortId(args.promptMessageId),
        ...summarizeGenerationResult(result),
      });

      return result.text;
    } catch (error) {
      debugError("generateResponse:error", {
        threadId: shortId(args.threadId),
        promptMessageId: shortId(args.promptMessageId),
        wallet: shortId(args.wallet),
        role: args.role,
        lotCode: trimmedLotCode || null,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

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

function stripUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

function summarizeToolResult(result: any) {
  return {
    hasError: Boolean(result?.error),
    resultKeys:
      result && typeof result === "object"
        ? Object.keys(result).slice(0, 12)
        : [],
    lotCode:
      result?.lot?.lotCode ??
      result?.lotCode ??
      result?.partnership?.lotCode ??
      null,
    partnershipId:
      result?.partnership?.id ??
      result?.partnership?.partnershipId ??
      result?.partnershipId ??
      null,
    partnershipCount: Array.isArray(result?.partnerships)
      ? result.partnerships.length
      : null,
    sensorCount: Array.isArray(result?.sensorSnapshots)
      ? result.sensorSnapshots.length
      : null,
    mediaCount: Array.isArray(result?.media)
      ? result.media.length
      : (result?.mediaCount ?? null),
    timelineCount: Array.isArray(result?.timeline)
      ? result.timeline.length
      : null,
  };
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

async function runAgentQueryTool(
  ctx: any,
  toolName: string,
  queryRef: any,
  input: Record<string, unknown>,
) {
  const args = stripUndefined(input);

  debugLog(`tool:${toolName}:start`, {
    threadId: shortId(ctx.threadId),
    messageId: shortId(ctx.messageId),
    args: {
      ...args,
      wallet:
        typeof args.wallet === "string" ? shortId(args.wallet) : args.wallet,
      partnerWallet:
        typeof args.partnerWallet === "string"
          ? shortId(args.partnerWallet)
          : args.partnerWallet,
      farmerWallet:
        typeof args.farmerWallet === "string"
          ? shortId(args.farmerWallet)
          : args.farmerWallet,
      partnershipPda:
        typeof args.partnershipPda === "string"
          ? shortId(args.partnershipPda)
          : args.partnershipPda,
      tokenAccount:
        typeof args.tokenAccount === "string"
          ? shortId(args.tokenAccount)
          : args.tokenAccount,
    },
  });

  try {
    const result = await ctx.runQuery(queryRef, args);
    debugLog(`tool:${toolName}:success`, {
      threadId: shortId(ctx.threadId),
      ...summarizeToolResult(result),
    });
    return result;
  } catch (error) {
    debugError(`tool:${toolName}:error`, {
      threadId: shortId(ctx.threadId),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Tool that fetches full lot context including farmer profile, partnership, and sensor data.
 */
const getLotContext: any = createTool({
  description:
    "Fetch complete verified lot context for a Harvverse lot code: lot metadata, farmer profile, partnerships, agronomic plan, sensor snapshots, media, milestone proofs, fund releases, and audit events.",
  inputSchema: z.object({
    lotCode: z.string().describe("The Harvverse lot code, e.g. HV-HN-ZAF-L02"),
  }),
  execute: async (ctx: any, input: { lotCode: string }): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getLotContext",
      internal.agentQueries.getLotFull,
      input,
    );
  },
});

/**
 * Tool that fetches one partnership/agreement using any stable reference.
 */
const getPartnershipContext: any = createTool({
  description:
    "Fetch complete verified context for one partnership/agreement. Use this for questions about lifecycle, escrow funding, releases, milestones, partner/farmer details, or a lot's active cycle. It can resolve by partnership id, lot code, partner wallet, farmer wallet, or partnership PDA.",
  inputSchema: z.object({
    partnershipId: z
      .string()
      .optional()
      .describe("Convex id of the partnership, if known."),
    lotCode: z
      .string()
      .optional()
      .describe("Harvverse lot code connected to the partnership."),
    partnerWallet: z.string().optional().describe("Partner wallet public key."),
    farmerWallet: z.string().optional().describe("Farmer wallet public key."),
    partnershipPda: z
      .string()
      .optional()
      .describe("On-chain partnership PDA address."),
  }),
  execute: async (
    ctx: any,
    input: {
      partnershipId?: string;
      lotCode?: string;
      partnerWallet?: string;
      farmerWallet?: string;
      partnershipPda?: string;
    },
  ): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getPartnershipContext",
      internal.agentQueries.getPartnershipFull,
      input,
    );
  },
});

/**
 * Tool that resolves "partnership 1", "partnership 2", etc. in the current workspace.
 */
const getPartnershipByPosition: any = createTool({
  description:
    "Resolve a 1-based partnership number from the current workspace list, then fetch full partnership context. Use this when the user says partnership 1, partnership 2, second partnership, first agreement, etc.",
  inputSchema: z.object({
    wallet: z.string().describe("Connected wallet public key."),
    role: z.enum(["farmer", "partner"]).describe("Current user role."),
    position: z
      .number()
      .describe("1-based position in the workspace partnership list."),
    order: z
      .enum(["workspace", "newest"])
      .optional()
      .describe(
        "Use workspace for the app's displayed list order, or newest for most-recent first.",
      ),
  }),
  execute: async (
    ctx: any,
    input: {
      wallet: string;
      role: "farmer" | "partner";
      position: number;
      order?: "workspace" | "newest";
    },
  ): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getPartnershipByPosition",
      internal.agentQueries.getPartnershipByPosition,
      input,
    );
  },
});

/**
 * Tool that fetches a focused sensor history for a lot.
 */
const getLotSensorSnapshots: any = createTool({
  description:
    "Fetch recent environmental and soil sensor snapshots for a lot, including raw payload and hash. Use for temperature, humidity, rainfall/IoT payload, soil pH, and soil moisture questions.",
  inputSchema: z.object({
    lotCode: z.string().describe("The Harvverse lot code."),
    limit: z.number().optional().describe("Maximum snapshots to return."),
  }),
  execute: async (
    ctx: any,
    input: { lotCode: string; limit?: number },
  ): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getLotSensorSnapshots",
      internal.agentQueries.getLotSensors,
      input,
    );
  },
});

/**
 * Tool that fetches media and document metadata for a lot.
 */
const getLotMedia: any = createTool({
  description:
    "Fetch media/document metadata for a lot, including kind, caption, hash, storage id, and storage URL when available. Use for farm photos, sensor photos, documents, and manifest questions.",
  inputSchema: z.object({
    lotCode: z.string().describe("The Harvverse lot code."),
    limit: z.number().optional().describe("Maximum media records to return."),
  }),
  execute: async (
    ctx: any,
    input: { lotCode: string; limit?: number },
  ): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getLotMedia",
      internal.agentQueries.getLotMedia,
      input,
    );
  },
});

/**
 * Tool that fetches the agronomic plan for a lot.
 */
const getLotAgronomicPlan: any = createTool({
  description:
    "Fetch the agronomic plan JSON and hash for a lot. Use for growth stages, planned interventions, harvest cycle, milestone schedule, and agronomy questions.",
  inputSchema: z.object({
    lotCode: z.string().describe("The Harvverse lot code."),
  }),
  execute: async (ctx: any, input: { lotCode: string }): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getLotAgronomicPlan",
      internal.agentQueries.getLotAgronomicPlan,
      input,
    );
  },
});

/**
 * Tool that fetches a unified timeline for lot operations.
 */
const getLotTimeline: any = createTool({
  description:
    "Fetch a unified recent timeline for a lot across audit events, partnership events, sensor snapshots, media, milestone proofs, and fund releases. Use for 'what changed recently', cycle progress, update history, and operational status questions.",
  inputSchema: z.object({
    lotCode: z.string().describe("The Harvverse lot code."),
    limit: z
      .number()
      .optional()
      .describe("Maximum timeline records to return."),
  }),
  execute: async (
    ctx: any,
    input: { lotCode: string; limit?: number },
  ): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getLotTimeline",
      internal.agentQueries.getLotTimeline,
      input,
    );
  },
});

/**
 * Tool that fetches mirrored mock USDC balances.
 */
const getMockUsdcBalanceSnapshots: any = createTool({
  description:
    "Fetch recent mirrored mock USDC balance snapshots for a wallet or token account. Use for escrow vault, partner, farmer, funding, and balance questions.",
  inputSchema: z.object({
    wallet: z.string().optional().describe("Wallet public key."),
    tokenAccount: z
      .string()
      .optional()
      .describe("SPL token account, such as an escrow vault."),
    limit: z.number().optional().describe("Maximum snapshots to return."),
  }),
  execute: async (
    ctx: any,
    input: { wallet?: string; tokenAccount?: string; limit?: number },
  ): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getMockUsdcBalanceSnapshots",
      internal.agentQueries.getMockUsdcBalanceSnapshots,
      input,
    );
  },
});

/**
 * Tool that fetches the partner's current portfolio and the available catalog.
 */
const getPartnerWorkspaceContext: any = createTool({
  description:
    "Fetch partner profile details, numbered current partnerships, lot summaries, farmer details, recent sensors, milestone proofs, and published catalog lots for a partner wallet.",
  inputSchema: z.object({
    wallet: z.string().describe("The partner wallet public key."),
  }),
  execute: async (ctx: any, input: { wallet: string }): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getPartnerWorkspaceContext",
      internal.agentQueries.getPartnerWorkspace,
      input,
    );
  },
});

/**
 * Tool that fetches a farmer's profile and current lot portfolio.
 */
const getFarmerWorkspaceContext: any = createTool({
  description:
    "Fetch farmer profile details, numbered lots, partnership summaries, agronomic plans, recent sensors, and latest media for a farmer wallet.",
  inputSchema: z.object({
    wallet: z.string().describe("The farmer wallet public key."),
  }),
  execute: async (ctx: any, input: { wallet: string }): Promise<any> => {
    return await runAgentQueryTool(
      ctx,
      "getFarmerWorkspaceContext",
      internal.agentQueries.getFarmerWorkspace,
      input,
    );
  },
});

const allHarvverseTools = {
  getLotContext,
  getPartnershipContext,
  getPartnershipByPosition,
  getLotSensorSnapshots,
  getLotMedia,
  getLotAgronomicPlan,
  getLotTimeline,
  getMockUsdcBalanceSnapshots,
  getPartnerWorkspaceContext,
  getFarmerWorkspaceContext,
};

const harvverseAgent: any = new AgentClass(components.agent, {
  name: "Harvverse Assistant",
  languageModel: anthropic("claude-sonnet-4-5-20250929"),
  instructions: `You are the Harvverse AI Assistant, an expert in coffee lot management on the Solana blockchain.

You help farmers and partners understand their lots, partnerships, escrow funding, agronomic plans, sensor data, media, milestone proofs, fund releases, and audit history.

Before answering factual questions about a lot, partnership, cycle, escrow, milestone, sensor reading, media item, or balance, use the most specific available tool. Do not say that you need to query data when a tool can query it.

When a user asks about a lot:
- Use getLotContext for broad lot questions
- Use getLotSensorSnapshots for environmental or soil metric questions
- Use getLotAgronomicPlan for growth stage, interventions, and planned cycle questions
- Use getLotMedia for photos, documents, captions, and manifest questions
- Use getLotTimeline for recent updates and cycle progress questions

When a user asks about a partnership:
- Use getPartnershipContext when the user gives a lot code, partnership id, wallet, or partnership PDA
- Use getPartnershipByPosition when the user says "partnership 1", "partnership 2", "second partnership", or a similar numbered reference
- Use getMockUsdcBalanceSnapshots when the question is about partner/farmer/vault balances or escrow funding

When a user is not viewing a specific lot:
- For partner questions, use getPartnerWorkspaceContext first to understand the portfolio and catalog
- For farmer questions, use getFarmerWorkspaceContext first to understand the lot portfolio
- If workspace data returns a lot code or partnership id relevant to the question, call the lot or partnership tool next instead of asking the user for that code

Important context:
- Ticket price is in USD cents (divide by 100 for dollars)
- Mock USDC base units use 6 decimals
- Share values are in basis points (divide by 100 for percentage)
- Altitude is in meters above sea level
- Area is in manzanas (a Central American unit, ~0.7 hectares)
- Media URLs and captions are evidence, but do not infer image contents beyond captions and stored metadata

You speak in a friendly, professional tone. You can respond in Spanish or English depending on the user's language.

You never sign transactions or make financial recommendations. You only explain verified on-chain and off-chain data. If records are missing, say exactly which records are missing and continue with the verified data you have.

Keep responses concise but informative.`,
  tools: allHarvverseTools,
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
    const tools = allHarvverseTools;
    const screenContext = isLotScoped
      ? `Current screen context: the user is viewing lot ${trimmedLotCode}. Connected wallet: ${args.wallet}. Role: ${args.role}. Use lot and partnership tools with ${trimmedLotCode} before answering lot-specific questions.`
      : args.role === "partner"
        ? `Current screen context: the user is viewing the partner workspace or catalog. Connected partner wallet: ${args.wallet}. No lot is selected. Use getPartnerWorkspaceContext first for portfolio questions. If the user references a numbered partnership, use getPartnershipByPosition with wallet ${args.wallet}, role partner, and the referenced position. If a lot code or partnership id is available from workspace data, use the lot or partnership tools before asking for more information.`
        : `Current screen context: the user is viewing the farmer workspace. Connected farmer wallet: ${args.wallet}. No lot is selected. Use getFarmerWorkspaceContext first for portfolio questions. If the user references a numbered lot or a lot code from workspace data, use the lot or partnership tools before asking for more information.`;

    debugLog("generateResponse:start", {
      threadId: shortId(args.threadId),
      promptMessageId: shortId(args.promptMessageId),
      wallet: shortId(args.wallet),
      role: args.role,
      lotCode: trimmedLotCode || null,
      scope: isLotScoped ? "lot" : "workspace",
      tools: Object.keys(tools),
      maxSteps: 10,
    });

    try {
      const result: any = await harvverseAgent.generateText(
        ctx,
        { threadId: args.threadId },
        {
          promptMessageId: args.promptMessageId,
          system: screenContext,
          tools,
          stopWhen: stepCountIs(10),
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

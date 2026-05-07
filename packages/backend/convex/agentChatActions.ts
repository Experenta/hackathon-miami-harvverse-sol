"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Import types from @convex-dev/agent
import { Agent as AgentClass, createTool } from "@convex-dev/agent";

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
    const result = await ctx.runQuery(internal.agentQueries.getLotFull, {
      lotCode,
    });
    return result;
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

Important context:
- Ticket price is in USD cents (divide by 100 for dollars)
- Share values are in basis points (divide by 100 for percentage)
- Altitude is in meters above sea level
- Area is in manzanas (a Central American unit, ~0.7 hectares)

You speak in a friendly, professional tone. You can respond in Spanish or English depending on the user's language.

You never sign transactions or make financial recommendations. You only explain verified on-chain and off-chain data.

Keep responses concise but informative.`,
  tools: { getLotContext },
});

/**
 * Internal action that runs the agent generation (requires Node.js runtime).
 */
export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    lotCode: v.string(),
  },
  handler: async (ctx: any, args: any): Promise<string> => {
    const result: any = await harvverseAgent.generateText(
      ctx,
      { threadId: args.threadId },
      {
        promptMessageId: args.promptMessageId,
        system: `The user is currently viewing lot: ${args.lotCode}. Use the getLotContext tool with this lot code to answer their questions.`,
      },
    );

    return result.text;
  },
});

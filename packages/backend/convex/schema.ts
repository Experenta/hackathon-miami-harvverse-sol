import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    wallet: v.string(),
    role: v.optional(v.union(v.literal("farmer"), v.literal("partner"))),
    rolePda: v.optional(v.string()),
    roleTx: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_wallet", ["wallet"]),

  farmerProfiles: defineTable({
    wallet: v.string(),
    farmerProfilePda: v.optional(v.string()),
    displayName: v.string(),
    bio: v.optional(v.string()),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    metadataHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_wallet", ["wallet"]),

  partnerProfiles: defineTable({
    wallet: v.string(),
    partnerProfilePda: v.optional(v.string()),
    displayName: v.string(),
    organization: v.optional(v.string()),
    metadataHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_wallet", ["wallet"]),

  lots: defineTable({
    lotCode: v.string(),
    lotPda: v.optional(v.string()),
    farmerWallet: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("reserved"),
      v.literal("in_cycle"),
      v.literal("settled"),
      v.literal("cancelled"),
    ),
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
    metadataHash: v.string(),
    planHash: v.string(),
    mediaManifestHash: v.string(),
    sensorManifestHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lot_code", ["lotCode"])
    .index("by_farmer", ["farmerWallet"])
    .index("by_status", ["status"]),

  lotMedia: defineTable({
    lotCode: v.string(),
    storageId: v.string(),
    kind: v.union(
      v.literal("farm_photo"),
      v.literal("document"),
      v.literal("sensor_photo"),
    ),
    caption: v.optional(v.string()),
    hash: v.string(),
    createdAt: v.number(),
  }).index("by_lot", ["lotCode"]),

  agronomicPlans: defineTable({
    lotCode: v.string(),
    planId: v.string(),
    planJson: v.any(),
    hash: v.string(),
    createdAt: v.number(),
  }).index("by_lot", ["lotCode"]),

  sensorSnapshots: defineTable({
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
    createdAt: v.number(),
  }).index("by_lot", ["lotCode"]),

  partnerships: defineTable({
    partnershipPda: v.optional(v.string()),
    lotCode: v.string(),
    lotPda: v.optional(v.string()),
    farmerWallet: v.string(),
    partnerWallet: v.string(),
    termsHash: v.string(),
    reserveTx: v.optional(v.string()),
    status: v.union(
      v.literal("reserved"),
      v.literal("active"),
      v.literal("settled"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_partner", ["partnerWallet"])
    .index("by_lot", ["lotCode"]),

  agentThreads: defineTable({
    wallet: v.string(),
    role: v.union(v.literal("farmer"), v.literal("partner")),
    agentName: v.string(),
    threadId: v.string(),
    lotCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_lot", ["wallet", "lotCode"])
    .index("by_thread", ["threadId"]),

  auditEvents: defineTable({
    actorWallet: v.optional(v.string()),
    kind: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    data: v.any(),
    createdAt: v.number(),
  }).index("by_entity", ["entityType", "entityId"]),
});

---
document_id: PRD-HARVVERSE-SOLANA-X402-CONVEX
title: Harvverse Technical PRD - Solana Role Registry, Lot Marketplace, Convex Backend, x402 Agent Gate
version: 1.0
date: 2026-05-05
status: URGENT - implementation PRD for hackathon build
owners:
    product: Jorge
    architecture: Claudio
    mobile: Jesus
    backend: Sheyla
    solana_program: Practicante
source_context:
    - URGENT/HARVVERSE_DUAL_TRACK_PIVOT_STRATEGY.md
    - URGENT/EasyAMobileTrack.md
    - URGENT/CoinbasexAWSAgenticHackathon.md
    - ReadFiles/03_BLINDED_DATA.md
    - HVPLAN-ZAF-L02-2026.md
external_references:
    - https://builder.aws.com/content/38fLQk6zKRfLnaUNzcLPsUexUlZ/monetize-any-http-application-with-x402-and-cloudfront-lambdaedge
    - https://aws.amazon.com/blogs/industries/x402-and-agentic-commerce-redefining-autonomous-payments-in-financial-services/
    - https://docs.cdp.coinbase.com/x402/welcome
    - https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
    - https://docs.cdp.coinbase.com/x402/quickstart-for-buyers
    - https://docs.solanamobile.com/developers/mobile-wallet-adapter
    - https://docs.solanamobile.com/android-native/using_mobile_wallet_adapter
    - https://docs.convex.dev/functions/http-actions
    - https://docs.convex.dev/functions/actions
    - https://docs.convex.dev/functions/mutation-functions
    - https://docs.convex.dev/agents/getting-started
    - https://docs.convex.dev/agents/agent-usage
    - https://docs.convex.dev/agents/streaming
    - https://docs.convex.dev/agents/tools
    - https://docs.convex.dev/agents/tool-approval
    - https://solana.com/docs/core/pda
---

# Harvverse Technical PRD

## 1. Purpose

This document defines the technical product requirements for the hackathon implementation of Harvverse inside the existing Solana dApp Turborepo.

The build must support:

1. A Solana Mobile compatible Android experience for two user roles: Farmer and Partner.
2. On-chain role registration so a wallet can be routed deterministically after connection.
3. Farmer lot creation with demo autofill for pictures, geodata, agronomic plan, and future IoT sensor fields.
4. Partner discovery, AI-assisted lot analysis, reservation, and settlement preview.
5. A paid AI agent data flow using x402, where a Harvverse-controlled, team-funded server-side agent wallet pays for premium lot intelligence after user approval before answering deeper questions.
6. Convex as the primary backend for off-chain application state, media, plans, chat sessions, and audit logs.

This is not a production financial product PRD. It is a technical PRD for a coherent, judgeable hackathon product that is honest about what lives on-chain and what lives off-chain.

## 2. Repository Baseline

Assume the existing repository is a Turborepo with this shape:

```text
apps/
  web/                 Next.js web dApp
  native/              Expo React Native Android app
programs/
  anchor/              Anchor Rust program
packages/
  solana-client/       Shared Solana helpers and Codama-generated client
```

Existing baseline:

- `apps/web` uses Solana Kit, wallet-standard, Tailwind CSS, and shared Solana client.
- `apps/native` uses Expo React Native, Mobile Wallet Adapter, React Query, and example Solana flows.
- `programs/anchor` contains a template Vault program.
- `packages/solana-client` contains shared helpers and the Codama-generated client for the currently deployed Vault program at `Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP`.
- Apps are intended to interact with deployed programs.
- Anchor build/test and Codama generation support program changes and client regeneration.

This PRD requires extending that baseline rather than replacing it.

## 3. Product Scope

### 3.1 In Scope

- Wallet-first login.
- Role selection on first login: Farmer or Partner.
- User signs role registration transaction.
- Solana program stores the wallet role on-chain.
- App reads the on-chain role after wallet connection and routes the user.
- Farmer dashboard:
    - profile creation
    - lot setup
    - demo autofill buttons
    - image upload metadata
    - geodata
    - agronomic plan reference
    - IoT placeholder snapshot
    - publish lot
- Partner dashboard:
    - browse published lots
    - inspect lot details
    - ask paid AI chat agent
    - reserve partnership
    - view settlement preview
    - view Solana transaction receipts
- Anchor program extension for role, lot, partnership, milestone, and settlement receipt accounts.
- Convex backend for off-chain data.
- x402-paid API route for premium agent lot intelligence.
- AWS-compatible x402 gateway architecture.
- README-ready technical narrative for Solana Mobile and Coinbase x AWS tracks.

### 3.2 Out of Scope for Hackathon

- Real fiat escrow.
- Real mainnet funds.
- Real user-funded x402 billing.
- User custody of the x402 payment wallet.
- Real securities compliance workflow.
- Production legal onboarding.
- Production IoT ingestion.
- Full SPL USDC escrow unless P0 is finished early.
- dApp Store publication.
- Multi-country support.
- Complex farmer reputation scoring.
- Automated settlement from real coffee sale invoices.
- LLM-controlled transaction signing.

### 3.3 Non-Negotiable Technical Principles

1. **Role source of truth is Solana.** Convex may cache role state, but app routing after wallet connection must be based on the on-chain role account.
2. **Large data stays off-chain.** Images, agronomic plan text, sensor payloads, chat transcripts, and long descriptions live in Convex or object storage. Solana stores hashes, compact fields, and state transitions.
3. **The AI agent does not sign user transactions.** The user signs role registration and partnership actions. The agent may pay for data through a separate server-side agent wallet, but it cannot mutate user-owned Solana state.
4. **x402 gates the paid data tool, not the entire app.** Public lot browsing remains free. Premium analysis requires an x402-paid request.
5. **Demo autofill is explicit.** Farmer forms can include "Autofill demo lot" and "Autofill sensor snapshot" buttons. These must be visibly demo helpers, not hidden fake automation.
6. **x402 approval is app-level approval, not wallet custody.** The Android user's Solana wallet does not fund or sign the x402 payment. For the hackathon demo, approval authorizes a policy-limited backend tool call funded by the Harvverse demo agent wallet.

## 4. External Technical Basis

The architecture is based on current public docs and reference patterns:

- x402 is an HTTP payment protocol using `402 Payment Required` to let APIs and content be monetized with programmatic on-chain payments. Coinbase docs describe the flow as request, 402 response with payment requirements, payment payload, facilitator verification/settlement, and then resource response.
- Coinbase CDP x402 provides facilitator APIs for verification and settlement and supports testnet and production facilitator URLs. Seller docs show middleware for Express, Next.js, Hono, FastAPI, and Flask, including `exact` and `upto` payment schemes.
- Base docs frame x402 as a way for agents to pay per request without subscriptions or API keys.
- AWS published an x402 agentic commerce architecture where CloudFront plus Lambda@Edge can make existing HTTP services x402-compatible without rebuilding the origin application.
- Solana Mobile Wallet Adapter is supported on Android and is the required wallet integration path for Solana Mobile dApps. Solana Mobile docs state that MWA enables secure communication with installed MWA-compatible wallet apps and provides SDKs for React Native.
- Convex supports React Native clients, database queries/mutations, HTTP actions, file storage, and actions for third-party API calls. Convex mutations are transactional and deterministic; third-party calls belong in actions or HTTP actions.
- Solana PDAs are deterministic addresses derived from seeds and a program id. They are appropriate for role records, farmer profiles, lot accounts, and partnership accounts.

## 5. Users and Roles

### 5.1 Public Roles

There are exactly two public user roles in the hackathon demo.

#### Farmer

The Farmer is the supply-side user.

Responsibilities:

- Create a farmer profile.
- Register coffee lots.
- Upload lot pictures.
- Add geodata.
- Attach agronomic plan references.
- Add simple IoT/sensor snapshot fields.
- Publish a lot for partner discovery.
- Record milestone progress for demo.

Farmer UX must optimize for form completion and proof capture. For the demo, buttons may auto-populate known Zafiro data from `ReadFiles/03_BLINDED_DATA.md` and `HVPLAN-ZAF-L02-2026.md`.

#### Partner

The Partner is the demand-side user.

Responsibilities:

- Browse published lots.
- Review farmer and lot proof.
- Ask the AI chat agent questions.
- Let the agent pay for premium lot intelligence through x402 when needed.
- Reserve a partnership.
- Sign Solana transaction receipts.
- View deterministic settlement math.

Partner UX must optimize for confidence, clarity, and transparent proof.

### 5.2 Role Selection Rules

- A wallet with no on-chain role sees the role selection screen.
- The user must select Farmer or Partner.
- The user must sign a Solana transaction registering that role.
- The Solana program creates a `UserRole` PDA.
- After confirmation, the app refetches the role PDA and routes the user.
- A wallet with an existing role must not see the role selection screen again.
- For hackathon simplicity, one wallet can have only one public role.
- If a user needs both roles, they should use separate wallets.

### 5.3 Role Copy

Farmer:

> Farmers create verified coffee lots, upload proof, attach agronomic plans, and publish lots for partners to fund.

Partner:

> Partners discover verified coffee lots, ask the paid AI agent for analysis, reserve partnerships, and track settlement receipts.

## 6. High-Level Architecture

```text
                         +-----------------------------+
                         | apps/native                 |
                         | Expo React Native Android   |
                         | MWA, React Query, Convex    |
                         +--------------+--------------+
                                        |
                         +--------------+--------------+
                         | apps/web                    |
                         | Next.js admin/demo console  |
                         | wallet-standard, Tailwind   |
                         +--------------+--------------+
                                        |
             +--------------------------+--------------------------+
             |                                                     |
             v                                                     v
+-----------------------------+                       +-----------------------------+
| Solana RPC                  |                       | Convex Backend              |
| Harvverse Anchor program    |                       | DB, storage, actions        |
| Role, lot, partnership PDAs |                       | chat, plans, media, audit   |
+--------------+--------------+                       +--------------+--------------+
               |                                                     ^
               |                                                     |
               v                                                     |
+-----------------------------+                       +--------------+--------------+
| packages/solana-client      |                       | x402 Agent Gateway          |
| generated client + helpers  |                       | AWS CloudFront/Lambda@Edge  |
+-----------------------------+                       | or Next/Hono fallback       |
                                                      +--------------+--------------+
                                                                     |
                                                                     v
                                                      +--------------+--------------+
                                                      | x402 Facilitator            |
                                                      | Base Sepolia for demo       |
                                                      | server-side agent wallet    |
                                                      +-----------------------------+
```

## 7. Package and App Responsibilities

### 7.1 `apps/native`

Primary hackathon surface.

Responsibilities:

- Android APK.
- Mobile Wallet Adapter connection.
- Role selection and registration transaction.
- On-chain role read and routing.
- Farmer screens:
    - profile
    - lot editor
    - media upload
    - publish lot
- Partner screens:
    - lot catalog
    - lot detail
    - AI chat
    - partnership reservation
    - settlement preview
- Calls Convex for off-chain state.
- Calls Solana client helpers for on-chain reads/writes.

### 7.2 `apps/web`

Hackathon support and optional web demo.

Responsibilities:

- Admin/debug console.
- View all roles, lots, partnerships, and agent payment events.
- Trigger demo reset or seed actions if implemented.
- Optional x402 protected Next.js route fallback if AWS edge work blocks.
- Screenshots and reviewer-friendly inspection.

### 7.3 `programs/anchor`

On-chain source of truth for roles and compact partnership state.

Responsibilities:

- Replace or extend the template Vault program into a `harvverse` program.
- Define accounts:
    - `ProgramConfig`
    - `UserRole`
    - `FarmerProfile`
    - `PartnerProfile`
    - `Lot`
    - `Partnership`
    - `MilestoneReceipt`
    - `SettlementReceipt`
- Define instructions for role registration, lot publishing, partnership reservation, and demo settlement receipts.
- Enforce role constraints on instructions.

### 7.4 `packages/solana-client`

Shared client interface.

Responsibilities:

- Generated client for the Harvverse program.
- PDA derivation helpers.
- Transaction builders.
- Role router helper.
- Typed account fetchers.
- Constants for program id, network, and known demo lot ids.

Required helper examples:

```ts
deriveUserRolePda(wallet: Address): Address
deriveFarmerProfilePda(farmer: Address): Address
derivePartnerProfilePda(partner: Address): Address
deriveLotPda(farmer: Address, lotId: string): Address
derivePartnershipPda(lot: Address, partner: Address): Address
fetchUserRole(wallet: Address): Promise<UserRole | null>
buildRegisterRoleTx(role: "farmer" | "partner"): Transaction
buildCreateLotTx(input: CreateLotInput): Transaction
buildReservePartnershipTx(input: ReserveInput): Transaction
```

### 7.5 `convex/`

Primary off-chain backend.

Responsibilities:

- Database schema.
- Queries and mutations for app state.
- File storage for lot media.
- Convex Agent component installation and generated component code.
- Agent definitions for the Partner-facing lot intelligence assistant.
- Agent threads and persisted messages through `@convex-dev/agent`.
- Async message generation and streaming deltas for chat UI.
- Agent tools for free lot lookup and paid x402 lot intelligence.
- Tool approval flow for any tool that spends x402 funds.
- Actions for third-party HTTP calls and model calls.
- HTTP actions for public or internal HTTP endpoints.
- Audit log for agent decisions, x402 payments, and Solana transaction signatures.

### 7.6 `apps/x402-gateway` or `infra/x402-gateway`

Thin paid-resource server. This can be implemented as:

1. AWS CloudFront + Lambda@Edge in front of Convex HTTP actions.
2. AWS API Gateway + Lambda resource server calling Convex.
3. Next.js route using `@x402/next` as a fallback.
4. Hono/Express service using `@x402/hono` or `@x402/express` as a fallback.

Preferred hackathon architecture:

```text
AI Agent Action
  -> requests /paid/lot-intelligence/HV-HN-ZAF-L02
  -> receives 402
  -> pays with Harvverse demo agent wallet on Base Sepolia through x402
  -> retries request with payment payload
  -> x402 gateway verifies/settles
  -> gateway calls Convex internal HTTP action
  -> Convex returns lot intelligence JSON
  -> agent answers user
```

Convex remains the backend. The x402 gateway is only the payment gate and public paid API surface. The Android Solana wallet does not call or fund this endpoint directly.

## 8. On-Chain Program Design

### 8.1 Solana Reality Constraints

Solana accounts are not document databases.

Do not store:

- images
- full agronomic plans
- long chat transcripts
- arbitrary JSON blobs
- raw IoT streams

Do store:

- role enum
- public keys
- compact lot ids
- hashes of off-chain manifests
- status enums
- timestamps/slots
- numeric ticket and split fields
- transaction receipt state

### 8.2 Account Seeds

Use deterministic PDA seeds.

```text
ProgramConfig:
  seeds = ["config"]

UserRole:
  seeds = ["role", wallet]

FarmerProfile:
  seeds = ["farmer", farmer_wallet]

PartnerProfile:
  seeds = ["partner", partner_wallet]

Lot:
  seeds = ["lot", farmer_wallet, lot_id_hash]

Partnership:
  seeds = ["partnership", lot, partner_wallet]

MilestoneReceipt:
  seeds = ["milestone", partnership, milestone_index]

SettlementReceipt:
  seeds = ["settlement", partnership]
```

### 8.3 Account Types

#### `ProgramConfig`

Purpose:

- Stores global config and authority.

Fields:

```rust
pub struct ProgramConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub role_registration_enabled: bool,
    pub bump: u8,
}
```

#### `UserRole`

Purpose:

- Canonical on-chain role for wallet routing.

Fields:

```rust
pub enum RoleKind {
    Farmer,
    Partner,
}

pub struct UserRole {
    pub wallet: Pubkey,
    pub role: RoleKind,
    pub created_at: i64,
    pub bump: u8,
}
```

Constraints:

- `wallet` must sign `register_role`.
- One `UserRole` PDA per wallet.
- Role is immutable for hackathon demo.
- If future role changes are needed, add `request_role_change`, not direct mutation.

#### `FarmerProfile`

Purpose:

- On-chain anchor for farmer identity.

Fields:

```rust
pub struct FarmerProfile {
    pub farmer: Pubkey,
    pub display_name_hash: [u8; 32],
    pub metadata_uri_hash: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}
```

Notes:

- Display name and profile text live in Convex.
- `metadata_uri_hash` points to a Convex/HTTP manifest hash or content hash.

#### `PartnerProfile`

Purpose:

- On-chain anchor for partner identity.

Fields:

```rust
pub struct PartnerProfile {
    pub partner: Pubkey,
    pub display_name_hash: [u8; 32],
    pub metadata_uri_hash: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}
```

#### `Lot`

Purpose:

- Published coffee lot state.

Fields:

```rust
pub enum LotStatus {
    Draft,
    Published,
    Reserved,
    InCycle,
    Settled,
    Cancelled,
}

pub struct Lot {
    pub farmer: Pubkey,
    pub lot_id_hash: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub plan_hash: [u8; 32],
    pub media_manifest_hash: [u8; 32],
    pub sensor_manifest_hash: [u8; 32],
    pub ticket_usdc_cents: u64,
    pub farmer_share_bps: u16,
    pub partner_share_bps: u16,
    pub status: LotStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}
```

Hackathon values:

- `ticket_usdc_cents = 342500`
- `farmer_share_bps = 6000`
- `partner_share_bps = 4000`
- `lot_id_hash = sha256("HV-HN-ZAF-L02")`

#### `Partnership`

Purpose:

- Partner reservation and terms receipt.

Fields:

```rust
pub enum PartnershipStatus {
    Reserved,
    Active,
    Settled,
    Cancelled,
}

pub struct Partnership {
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub partner: Pubkey,
    pub terms_hash: [u8; 32],
    pub ticket_usdc_cents: u64,
    pub status: PartnershipStatus,
    pub reserved_at: i64,
    pub bump: u8,
}
```

Notes:

- For hackathon, this can be a receipt without SPL escrow.
- Production should add SPL token escrow accounts and token program CPIs.

#### `MilestoneReceipt`

Purpose:

- Compact record of milestone proof.

Fields:

```rust
pub struct MilestoneReceipt {
    pub partnership: Pubkey,
    pub milestone_index: u8,
    pub proof_hash: [u8; 32],
    pub recorded_by: Pubkey,
    pub recorded_at: i64,
    pub bump: u8,
}
```

Notes:

- Proof content lives in Convex.
- `recorded_by` must be the farmer for hackathon, or authority/admin in fallback mode.

#### `SettlementReceipt`

Purpose:

- Final settlement math receipt.

Fields:

```rust
pub struct SettlementReceipt {
    pub partnership: Pubkey,
    pub yield_qq: u16,
    pub price_per_lb_cents: u16,
    pub revenue_usdc_cents: u64,
    pub cost_usdc_cents: u64,
    pub profit_usdc_cents: u64,
    pub farmer_share_usdc_cents: u64,
    pub partner_share_usdc_cents: u64,
    pub settlement_hash: [u8; 32],
    pub settled_at: i64,
    pub bump: u8,
}
```

Hackathon demo settlement:

- `yield_qq = 6`
- `price_per_lb_cents = 350`
- `revenue_usdc_cents = 175000`
- `cost_usdc_cents = 149000`
- `profit_usdc_cents = 26000`
- `farmer_share_usdc_cents = 15600`
- `partner_share_usdc_cents = 10400`

### 8.4 Instructions

#### `initialize_config(authority, treasury)`

Creates `ProgramConfig`.

Acceptance:

- Authority signs.
- Config PDA is initialized.
- Role registration enabled.

#### `register_role(role: RoleKind)`

Creates `UserRole`.

Acceptance:

- User signs.
- PDA seed is `["role", signer]`.
- Fails if role account already exists.
- Emits `RoleRegistered`.

#### `create_farmer_profile(metadata_hash)`

Creates `FarmerProfile`.

Acceptance:

- Signer has `UserRole.role == Farmer`.
- Profile PDA is initialized.
- Metadata hash stored.

#### `create_partner_profile(metadata_hash)`

Creates `PartnerProfile`.

Acceptance:

- Signer has `UserRole.role == Partner`.
- Profile PDA is initialized.
- Metadata hash stored.

#### `create_lot(input)`

Creates `Lot` in `Draft` or `Published` state.

Acceptance:

- Signer has Farmer role.
- Farmer profile exists.
- `farmer_share_bps + partner_share_bps == 10000`.
- `ticket_usdc_cents > 0`.
- Hashes are nonzero.

#### `publish_lot(lot)`

Sets `Lot.status = Published`.

Acceptance:

- Signer is lot farmer.
- Lot is Draft.
- Required hashes are present.

#### `update_lot_hashes(input)`

Updates metadata, plan, media, or sensor hashes before reservation.

Acceptance:

- Signer is lot farmer.
- Lot is Draft or Published.
- Cannot update after Reserved.

#### `reserve_partnership(lot, terms_hash)`

Creates `Partnership` receipt and sets lot to Reserved.

Acceptance:

- Signer has Partner role.
- Lot is Published.
- Partner profile exists.
- Partnership PDA does not exist.
- Lot status becomes Reserved.
- Emits `PartnershipReserved`.

#### `record_milestone(partnership, milestone_index, proof_hash)`

Creates milestone receipt.

Acceptance:

- Signer is farmer or demo authority.
- Partnership exists.
- Milestone index is 1 through 6.
- Proof hash is nonzero.
- Duplicate milestone index fails.

#### `record_settlement(partnership, settlement_input)`

Creates `SettlementReceipt` and marks partnership and lot Settled.

Acceptance:

- Signer is farmer or demo authority.
- Partnership exists.
- Required milestone can be skipped in demo mode but must be documented.
- Settlement math values must match deterministic backend calculation.
- Emits `SettlementRecorded`.

### 8.5 Events

Anchor events should be emitted for every user-visible state transition so the apps can show proof and the web console can index activity.

```rust
#[event]
pub struct RoleRegistered {
    pub wallet: Pubkey,
    pub role: RoleKind,
    pub created_at: i64,
}

#[event]
pub struct LotCreated {
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub lot_id_hash: [u8; 32],
}

#[event]
pub struct LotPublished {
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub updated_at: i64,
}

#[event]
pub struct PartnershipReserved {
    pub partnership: Pubkey,
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub partner: Pubkey,
    pub ticket_usdc_cents: u64,
}

#[event]
pub struct MilestoneRecorded {
    pub partnership: Pubkey,
    pub milestone_index: u8,
    pub proof_hash: [u8; 32],
}

#[event]
pub struct SettlementRecorded {
    pub partnership: Pubkey,
    pub farmer_share_usdc_cents: u64,
    pub partner_share_usdc_cents: u64,
    pub settlement_hash: [u8; 32],
}
```

### 8.6 Program Errors

Required custom errors:

```rust
#[error_code]
pub enum HarvverseError {
    #[msg("Role already registered for this wallet")]
    RoleAlreadyRegistered,

    #[msg("Wallet does not have the required role")]
    InvalidRole,

    #[msg("Farmer profile is required")]
    FarmerProfileMissing,

    #[msg("Partner profile is required")]
    PartnerProfileMissing,

    #[msg("Lot status does not allow this operation")]
    InvalidLotStatus,

    #[msg("Partnership status does not allow this operation")]
    InvalidPartnershipStatus,

    #[msg("Share basis points must sum to 10000")]
    InvalidShareSplit,

    #[msg("Hash field cannot be zero")]
    EmptyHash,

    #[msg("Milestone index is out of range")]
    InvalidMilestoneIndex,

    #[msg("Milestone receipt already exists")]
    DuplicateMilestone,

    #[msg("Settlement math does not match expected values")]
    InvalidSettlementMath,
}
```

### 8.7 State Machines

Lot:

```text
Draft -> Published -> Reserved -> InCycle -> Settled
Draft -> Cancelled
Published -> Cancelled
```

Hackathon can skip `InCycle` and move:

```text
Published -> Reserved -> Settled
```

Partnership:

```text
Reserved -> Active -> Settled
Reserved -> Cancelled
```

Hackathon can use:

```text
Reserved -> Settled
```

Role:

```text
Unregistered -> Farmer
Unregistered -> Partner
```

No role mutation in hackathon scope.

## 9. Convex Backend Design

### 9.1 Why Convex

Convex should own mutable app data because:

- React Native and Next.js can both use Convex client libraries.
- Convex queries/mutations are typed and realtime-friendly.
- Convex mutations are transactional, useful for form save flows.
- Convex actions can call external services, including AI providers and x402 endpoints.
- Convex HTTP actions can expose public HTTP APIs and can be used as the origin behind an AWS/x402 gateway.
- Convex file storage can hold demo lot media.

### 9.2 Convex Agent Component Setup

Harvverse should use the Convex Agent component, not a hand-rolled chat table as the primary message system.

Required package:

```bash
npm install @convex-dev/agent
```

Required component registration:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(agent);

export default app;
```

Required follow-up:

```bash
npx convex dev
```

This generates `components.agent`, which is passed into `new Agent(...)`.

Agent definition:

```ts
// convex/agents/harvversePartnerAgent.ts
import { components } from "../_generated/api";
import { Agent, stepCountIs } from "@convex-dev/agent";
import { freeLotSummaryTool, paidLotIntelligenceTool } from "./tools";
import { getConfiguredLanguageModel } from "./model";

export const harvversePartnerAgent = new Agent(components.agent, {
	name: "Harvverse Partner Agent",
	languageModel: getConfiguredLanguageModel(),
	instructions: [
		"You explain verified coffee lots to partners.",
		"You never sign transactions.",
		"You never invent settlement math.",
		"Use free lot summary for general questions.",
		"Use paid lot intelligence for lot-specific ROI, risk, settlement, or reserve analysis.",
		"If a paid tool requires approval, wait for approval before continuing.",
	].join("\n"),
	tools: {
		freeLotSummary: freeLotSummaryTool,
		paidLotIntelligence: paidLotIntelligenceTool,
	},
	stopWhen: stepCountIs(5),
});
```

Model requirement:

- For Coinbase x AWS track alignment, prefer an AWS Bedrock-backed AI SDK model if the team can configure it quickly.
- If Bedrock setup blocks the demo, use any working AI SDK language model and keep the x402/AWS gateway proof intact.
- The model provider must be server-side only; no model keys in `apps/native` or `apps/web`.

Thread model:

- Each Partner + lot pair gets one Convex Agent thread.
- The Agent component stores the message history for that thread.
- Application tables store only thread mappings, budgets, and audit/payment metadata.
- Do not duplicate every chat message into a custom `chatMessages` table unless needed for analytics after the demo.

Async response model:

1. Client calls a Convex mutation to save the user message into the Agent thread.
2. Mutation schedules an internal action.
3. Internal action calls `agent.streamText` or `agent.generateText`.
4. Messages and tool call results are persisted by the Agent component.
5. Client subscribes to thread messages and stream deltas.

Streaming model:

- Use `agent.streamText(..., { saveStreamDeltas: true })` for the chat response.
- Expose a `listThreadMessages` query that combines `listUIMessages` and `syncStreams`.
- In React Native, use `useUIMessages(..., { stream: true })`.
- Use `useSmoothText` for polished token display if time allows.

Tool approval model:

- Any tool that spends x402 demo agent-wallet funds must require approval unless a preapproved session budget exists.
- Tool approval should pause generation and surface an approval request in the UI.
- Client uses `useUIMessages` to detect tool parts where `state === "approval-requested"`.
- Approval mutation calls `agent.approveToolCall`.
- Denial mutation calls `agent.denyToolCall`.
- After approval/denial, an internal action resumes generation with the approval message id as `promptMessageId`.

### 9.3 Schema

Suggested schema:

```ts
// convex/schema.ts
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
		spendingMode: v.union(
			v.literal("manual_approval"),
			v.literal("preapproved_session_budget"),
		),
		sessionBudgetUsdCents: v.number(),
		sessionSpentUsdCents: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_wallet", ["wallet"])
		.index("by_wallet_lot", ["wallet", "lotCode"])
		.index("by_thread", ["threadId"]),

	agentToolCalls: defineTable({
		threadId: v.string(),
		promptMessageId: v.optional(v.string()),
		approvalId: v.optional(v.string()),
		providerToolCallId: v.optional(v.string()),
		lotCode: v.string(),
		tool: v.string(),
		status: v.union(
			v.literal("requested"),
			v.literal("approval_requested"),
			v.literal("approved"),
			v.literal("denied"),
			v.literal("payment_required"),
			v.literal("paid"),
			v.literal("completed"),
			v.literal("failed"),
		),
		requiresApproval: v.boolean(),
		x402PaymentId: v.optional(v.id("x402Payments")),
		costUsdCents: v.number(),
		requestHash: v.string(),
		responseHash: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_thread", ["threadId"]),

	x402Payments: defineTable({
		toolCallId: v.optional(v.id("agentToolCalls")),
		network: v.string(),
		facilitator: v.string(),
		payer: v.string(),
		payTo: v.string(),
		amountAtomic: v.string(),
		txHash: v.optional(v.string()),
		status: v.union(
			v.literal("created"),
			v.literal("verified"),
			v.literal("settled"),
			v.literal("failed"),
		),
		raw: v.any(),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_tool_call", ["toolCallId"]),

	auditEvents: defineTable({
		actorWallet: v.optional(v.string()),
		kind: v.string(),
		entityType: v.string(),
		entityId: v.string(),
		data: v.any(),
		createdAt: v.number(),
	}).index("by_entity", ["entityType", "entityId"]),
});
```

### 9.4 Convex Functions

Queries:

```text
users.getByWallet(wallet)
lots.listPublished()
lots.getByCode(lotCode)
lots.listByFarmer(wallet)
partnerships.listByPartner(wallet)
agentThreads.getForWalletAndLot(wallet, lotCode)
agentThreads.listThreadMessages(threadId, paginationOpts, streamArgs)
agentTools.getToolCall(toolCallId)
```

Mutations:

```text
users.upsertAfterWalletConnect(wallet)
users.recordRoleRegistration(wallet, role, rolePda, tx)
farmers.saveProfile(input)
partners.saveProfile(input)
lots.createDraft(input)
lots.applyDemoAutofill(lotCode)
lots.recordOnChainLot(lotCode, lotPda, tx)
lots.markPublished(lotCode, tx)
partnerships.createPendingReservation(input)
partnerships.recordReservationTx(input)
agentThreads.getOrCreatePartnerLotThread(wallet, lotCode)
agentThreads.sendMessage(threadId, prompt)
agentApprovals.submitApproval(threadId, approvalId, approved, reason)
agentTools.createToolCallAudit(input)
agentTools.markApprovalRequested(input)
agentTools.markToolCallPaid(input)
agentTools.completeToolCall(input)
audit.record(input)
```

Actions:

```text
agentGeneration.generatePartnerResponse(threadId, promptMessageId)
agentGeneration.continueAfterApproval(threadId, lastApprovalMessageId)
agentTools.callPaidLotIntelligence(toolCallId, lotCode)
hash.computeManifestHash(payload)
```

HTTP actions:

```text
GET /internal/lot-intelligence/:lotCode
POST /internal/audit/x402
GET /health
```

Important:

- Use the Agent component thread/message storage for chat messages and tool-call results.
- `agentThreads.listThreadMessages` must call Agent helpers equivalent to `listUIMessages` and `syncStreams` so the mobile app can render persisted messages and streaming deltas.
- `agentThreads.sendMessage` must save the user prompt into the Agent thread and schedule `agentGeneration.generatePartnerResponse`.
- `agentGeneration.generatePartnerResponse` should call `harvversePartnerAgent.streamText` with stream deltas enabled.
- Tool approval must be used for x402 spending unless a session-level preapproved budget exists.
- `/internal/lot-intelligence/:lotCode` must require a shared secret header when called directly.
- x402 public paid endpoint should not expose Convex internals.
- Convex actions that use x402 packages may require `"use node"` if the packages depend on Node APIs.

## 10. x402 Agent Architecture

### 10.1 Product Requirement

The AI chat agent must be implemented as a Convex Agent with tools, threads, persisted messages, streaming deltas, and tool approval for x402 spending.

For the hackathon demo, x402 spending comes from a Harvverse-controlled, team-funded server-side agent wallet. The Partner's approval is an application-level permission for the backend to spend within a fixed demo policy. It is not an Android wallet signature, it does not move SOL or SPL tokens, and it does not expose any EVM/Base signing surface in the mobile app.

The x402 payment is not a separate ad hoc backend action. It is exposed to the model as a Convex Agent tool:

```text
paidLotIntelligence(lotCode, question, maxUsdCents)
```

This tool:

- requires approval when it will spend demo agent-wallet funds;
- checks session budget and allowlisted endpoint policy;
- performs the x402 paid request from server-side code;
- stores payment metadata in Convex;
- returns verified lot intelligence to the Agent as the tool result;
- lets the Agent continue generation from that tool result.

The user experience:

1. Partner asks: "Is Zafiro Parainema worth reserving?"
2. Client mutation saves the prompt into the Convex Agent thread.
3. Internal action calls `harvversePartnerAgent.streamText` with stream deltas enabled.
4. Agent decides it needs `paidLotIntelligence`.
5. Tool approval is persisted in the thread because the tool spends x402 funds.
6. Mobile UI shows approval card: price, network, endpoint, funding source, and reason.
7. Partner approves the backend tool call, or a preapproved session budget auto-approves it.
8. Server resumes generation.
9. Tool executes x402 payment from the Harvverse-funded server-side agent wallet.
10. Tool returns verified lot intelligence.
11. Agent answers with structured analysis.
12. UI shows message stream and payment proof.

### 10.2 Convex Agent Execution Flow

Server-side flow:

```text
agentThreads.sendMessage
  -> harvversePartnerAgent.saveMessage(threadId, prompt)
  -> scheduler.runAfter(0, generatePartnerResponse)

generatePartnerResponse
  -> harvversePartnerAgent.streamText(
       ctx,
       { threadId },
       { promptMessageId },
       { saveStreamDeltas: true }
     )
  -> result.consumeStream()
  -> if paid tool approval is needed, generation pauses

agentApprovals.submitApproval
  -> harvversePartnerAgent.approveToolCall or denyToolCall
  -> returns approval/denial messageId
  -> scheduler.runAfter(0, continueAfterApproval)

continueAfterApproval
  -> harvversePartnerAgent.streamText(
       ctx,
       { threadId },
       { promptMessageId: lastApprovalMessageId },
       { saveStreamDeltas: true }
     )
  -> result.consumeStream()
```

Client-side flow:

```text
useUIMessages(agentThreads.listThreadMessages, { threadId }, { stream: true })
  -> render user messages
  -> render streaming assistant messages
  -> render tool-call messages
  -> if tool part state is approval-requested:
       show Approve / Deny controls
```

The mobile app must not poll a custom `chatMessages` table. It should subscribe to the Agent thread messages and stream deltas.

### 10.3 Tool Policy

The LLM may choose tools, but tool execution must enforce deterministic policy. The model is allowed to request paid analysis; server code decides whether that tool may execute.

Tool set:

```text
freeLotSummary
  - free
  - reads public lot data from Convex
  - no approval

paidLotIntelligence
  - paid
  - calls x402 endpoint
  - approval required unless session budget covers it
  - returns premium lot intelligence JSON
```

Payment decision helper:

```ts
type AgentPaymentDecision =
	| { kind: "free"; reason: string }
	| {
			kind: "approval_required";
			tool: "paidLotIntelligence";
			maxUsdCents: number;
			reason: string;
	  }
	| {
			kind: "auto_approved";
			tool: "paidLotIntelligence";
			maxUsdCents: number;
			reason: string;
	  };

function decidePaidToolPolicy(args: {
	question: string;
	lotCode?: string;
	sessionBudgetUsdCents: number;
	sessionSpentUsdCents: number;
	requestedUsdCents: number;
}): AgentPaymentDecision {
	const {
		question,
		lotCode,
		sessionBudgetUsdCents,
		sessionSpentUsdCents,
		requestedUsdCents,
	} = args;

	if (!lotCode)
		return { kind: "free", reason: "No lot-specific data requested" };

	const paidIntents = [
		"roi",
		"risk",
		"settlement",
		"yield",
		"reserve",
		"investment",
		"price",
		"profit",
		"plan",
		"milestone",
	];

	const normalized = question.toLowerCase();
	const requiresPaidData = paidIntents.some((term) =>
		normalized.includes(term),
	);

	if (!requiresPaidData) {
		return { kind: "free", reason: "General explanation only" };
	}

	const remainingBudget = sessionBudgetUsdCents - sessionSpentUsdCents;
	if (remainingBudget >= requestedUsdCents) {
		return {
			kind: "auto_approved",
			tool: "paidLotIntelligence",
			maxUsdCents: requestedUsdCents,
			reason: "Within user-approved session budget",
		};
	}

	return {
		kind: "approval_required",
		tool: "paidLotIntelligence",
		maxUsdCents: requestedUsdCents,
		reason: "Lot-specific financial/agronomic analysis requires verified data",
	};
}
```

Paid tool definition requirement:

```ts
const paidLotIntelligenceTool = createTool({
	description:
		"Buy verified Harvverse lot intelligence for ROI, risk, settlement, and reserve analysis.",
	inputSchema: z.object({
		lotCode: z
			.string()
			.describe("The Harvverse lot code, e.g. HV-HN-ZAF-L02"),
		question: z
			.string()
			.describe("The partner question requiring paid lot intelligence"),
		maxUsdCents: z.number().describe("Maximum spend allowed for this call"),
	}),
	needsApproval: async (ctx, input) => {
		const policy = await ctx.runQuery(
			api.agentPolicy.evaluatePaidToolPolicy,
			input,
		);
		return policy.kind === "approval_required";
	},
	execute: async (ctx, input): Promise<PaidLotIntelligenceResult> => {
		return await ctx.runAction(
			api.agentTools.executePaidLotIntelligence,
			input,
		);
	},
});
```

Implementation note:

- The exact `createTool` option names must match the installed `@convex-dev/agent` version. The docs show Convex tools with zod-described schemas and either `inputSchema/execute` or `args/handler` style examples. The implementation should follow the package version generated by `npx convex dev`.

Demo price:

- Use `exact` scheme.
- Price: `$0.001` or `$0.01`.
- Network: Base Sepolia, CAIP-2 `eip155:84532`.
- Production network: Base mainnet, CAIP-2 `eip155:8453`.

Use `upto` only after P0. `exact` is simpler and sufficient for hackathon judging.

### 10.4 Paid Endpoint

Public x402 endpoint:

```text
GET /paid/lot-intelligence/:lotCode
```

Payment metadata:

```json
{
	"scheme": "exact",
	"price": "$0.001",
	"network": "eip155:84532",
	"description": "Verified Harvverse coffee lot intelligence for agent analysis",
	"mimeType": "application/json"
}
```

Response after payment:

```json
{
	"lotCode": "HV-HN-ZAF-L02",
	"farmName": "Zafiro",
	"variety": "Parainema",
	"location": {
		"country": "Honduras",
		"region": "Comayagua",
		"latitude": 14.9465,
		"longitude": -88.0863,
		"altitudeMeters": 1300
	},
	"ticket": {
		"totalUsdc": 3425,
		"agronomicPlanUsdc": 1490,
		"contingencyUsdc": 149,
		"harvverseCommissionUsdc": 164,
		"fiduciaryWorkingCapitalUsdc": 1622
	},
	"settlementPreview": {
		"yieldQQ": 6,
		"pricePerLbUsd": 3.5,
		"revenueUsd": 1750,
		"agronomicCostUsd": 1490,
		"profitUsd": 260,
		"farmerShareUsd": 156,
		"partnerShareUsd": 104
	},
	"riskFlags": [
		"Year-1 ROI is conservative and intentionally low",
		"Coffee cycle is compressed for demo",
		"Production requires fiduciary and fulfillment integration"
	],
	"recommendation": {
		"action": "reserve_as_phygital_partner",
		"confidence": 0.82,
		"reason": "Real lot, clear ticket breakdown, deterministic settlement math, and phygital delivery."
	}
}
```

### 10.5 x402 Gateway Options

#### Preferred: AWS CloudFront + Lambda@Edge Gateway

Use when AWS mentor support is available.

Flow:

```text
Agent
  -> CloudFront /paid/lot-intelligence/:lotCode
  -> Lambda@Edge checks x402 payment headers
  -> if missing: return 402 with payment requirements
  -> if present: call x402 Facilitator verify/settle
  -> on success: forward request to Convex HTTP action origin
  -> Convex returns premium lot intelligence
```

Why:

- Strong AWS track alignment.
- Matches AWS reference pattern for monetizing existing HTTP apps.
- Lets Convex remain origin/backend.
- Shows CloudFront + Lambda@Edge clearly in architecture.

Risk:

- Lambda@Edge implementation may be slower under hackathon pressure.
- x402 official middleware may not drop directly into Lambda@Edge without adaptation.

#### Practical P0: API Gateway + Lambda x402 Resource Server

Use if Lambda@Edge is too slow.

Flow:

```text
Agent
  -> API Gateway /paid/lot-intelligence/:lotCode
  -> Lambda using x402 middleware or manual facilitator calls
  -> Lambda calls Convex internal HTTP action with shared secret
```

Why:

- Easier to implement and debug.
- Still uses AWS infrastructure.
- Still demonstrates x402 and Base.

#### Fallback: Next.js x402 Route in `apps/web`

Use if AWS deployment blocks.

Flow:

```text
Agent
  -> apps/web /api/paid/lot-intelligence/:lotCode
  -> @x402/next middleware
  -> route calls Convex
```

Why:

- Fastest implementation given Turborepo.
- Official x402 seller docs include Next.js middleware.

Risk:

- Weaker AWS judging alignment unless deployed on AWS Amplify or behind CloudFront.

### 10.6 Demo Funding and Agent Wallet

For hackathon:

- Use a team-funded Base Sepolia agent wallet controlled by the Harvverse demo backend.
- Treat this as a small demo operating budget, not user custody, user deposits, or production billing.
- The Partner approves the tool call in the app, but does not sign an x402/Base transaction.
- The Partner's Solana Mobile wallet is never used to pay the x402 endpoint.
- Store private key only in server-side environment variables or AWS Secrets Manager.
- Never ship keys to mobile or web clients.
- Log the public payer address in Convex.
- Do not allow arbitrary URL payments.
- Allowlist paid endpoints:
    - `/paid/lot-intelligence/:lotCode`
    - optional `/paid/settlement-simulation/:lotCode`
- If this becomes a production product, replace the demo funding model with explicit user credits, subscription billing, or Solana USDC top-ups before allowing real spend.

### 10.7 Payment Safety

Controls:

- Max per tool call: `$0.01`.
- Max per session: `$0.05`.
- Max per wallet per day for demo: `$0.10`.
- Allowed networks: Base Sepolia for hackathon.
- Allowed payees: Harvverse receiving wallet only.
- Allowed tools: `lot_intelligence`.
- No arbitrary external x402 purchases in hackathon build.
- No user wallet fallback for x402 payments.
- No production spend unless a real user billing model is added.

## 11. Mobile App UX Requirements

### 11.1 Wallet Connection

Requirements:

- Android app must connect to an MWA-compatible wallet.
- After wallet connection, app fetches `UserRole` PDA.
- If missing, route to role selection.
- If `Farmer`, route to Farmer dashboard.
- If `Partner`, route to Partner dashboard.
- If Solana RPC fails, show retry and manual fallback, but do not assume role from Convex cache.

### 11.2 Role Selection

Screen:

- Title: "Choose your Harvverse role"
- Two options:
    - Farmer
    - Partner
- Each option includes role description.
- CTA: "Sign and register role"

Transaction:

- Calls `register_role`.
- Displays pending state.
- Displays signature after confirmation.
- Writes result into Convex cache.

### 11.3 Farmer Dashboard

Screens:

1. Farmer Home
2. Profile
3. Lot Editor
4. Media and Proof
5. Publish Review
6. Published Lot Detail

Farmer Home:

- Shows wallet.
- Shows Farmer role PDA.
- Shows list of lots.
- CTA: "Create lot".

Lot Editor fields:

- Lot code
- Farm name
- Country
- Region
- Latitude
- Longitude
- Altitude
- Variety
- Area in manzanas
- Ticket
- Farmer share
- Partner share
- Agronomic plan id
- Plan summary
- Sensor snapshot

Autofill buttons:

- "Autofill Zafiro demo lot"
- "Autofill agronomic plan"
- "Autofill demo sensor snapshot"

Autofill must populate:

- `lotCode = HV-HN-ZAF-L02`
- `farmName = Zafiro`
- `country = Honduras`
- `region = Comayagua`
- `latitude = 14.9465`
- `longitude = -88.0863`
- `altitudeMeters = 1300`
- `variety = Parainema`
- `areaManzanas = 1.0`
- `ticketUsdc = 3425`
- `farmerShareBps = 6000`
- `partnerShareBps = 4000`

Publish flow:

1. Save draft to Convex.
2. Compute metadata/plan/media/sensor hashes.
3. Send Solana `create_lot` or `publish_lot` transaction.
4. Store lot PDA and transaction signature in Convex.
5. Lot appears in partner catalog.

### 11.4 Partner Dashboard

Screens:

1. Partner Home
2. Lot Catalog
3. Lot Detail
4. AI Agent Chat
5. Partnership Review
6. Reservation Receipt
7. Settlement Preview

Lot Catalog:

- Lists published lots from Convex.
- Each lot must display whether on-chain lot PDA exists.
- Zafiro lot is the primary demo card.

Lot Detail:

- Images/proof from Convex.
- On-chain lot PDA.
- Farmer wallet.
- Ticket.
- Split.
- Geodata.
- Plan summary.
- CTA: "Ask AI Agent".
- CTA: "Reserve partnership".

AI Chat:

- Chat is backed by a Convex Agent thread for the current Partner + lot.
- General questions can be answered with the free `freeLotSummary` tool.
- Lot-specific financial/agronomic questions should cause the Agent to request the `paidLotIntelligence` tool.
- If `paidLotIntelligence` needs approval, the message stream must show an approval card before the tool executes.
- Approval card actions call `agentApprovals.submitApproval`.
- Approval is permission for the backend to spend from the Harvverse demo agent wallet within policy; it is not a Solana wallet transaction and not a Base wallet prompt in the Android app.
- After approval, generation resumes and the Agent answer streams into the same thread.
- UI displays:
    - tool requested
    - price
    - network
    - funding source: Harvverse demo agent wallet
    - approval status
    - payment status
    - x402 payment proof
    - answer

Partnership Review:

- Shows terms hash.
- Shows deterministic settlement preview.
- CTA: "Sign reservation".

Reservation:

- Calls `reserve_partnership`.
- Displays transaction signature.
- Creates/updates Convex partnership.

Settlement Preview:

- Shows math:

```text
Revenue = 6 qq x 83.3 lb/qq x $3.50 = $1,750
Cost = $1,490
Profit = $260
Farmer 60% = $156
Partner 40% = $104
```

## 12. Web App Requirements

The web app is not the primary track deliverable, but it is useful for debugging and judge inspection.

Screens:

- Connected wallet status.
- Role account inspector.
- Farmer lot table.
- Partner partnership table.
- x402 payment table.
- Agent tool call table.
- Convex data health.
- Solana program health.

Optional:

- Admin seed button for Zafiro lot.
- Admin reset for demo data.
- Direct link to Solana explorer.
- Direct link to x402 payment proof.

## 13. Route Map

### 13.1 Native App Routes

```text
/
  connect-wallet
  role-select
  farmer/
    home
    profile
    lots
    lots/new
    lots/:lotCode/edit
    lots/:lotCode/publish-review
    lots/:lotCode
  partner/
    home
    catalog
    lots/:lotCode
    lots/:lotCode/chat
    lots/:lotCode/reserve
    partnerships/:partnershipId
    partnerships/:partnershipId/settlement
```

Route guards:

- `role-select` requires connected wallet and no `UserRole` PDA.
- `farmer/*` requires `UserRole.role == Farmer`.
- `partner/*` requires `UserRole.role == Partner`.
- If role fetch is loading, show blocking loading state.
- If role fetch fails, show retry; do not continue from Convex cache.

### 13.2 Web App Routes

```text
/
  debug
  debug/roles
  debug/lots
  debug/partnerships
  debug/agent-tool-calls
  debug/x402-payments
  admin/seed-zafiro
```

### 13.3 Public HTTP Routes

```text
GET /paid/lot-intelligence/:lotCode
GET /health
```

### 13.4 Internal HTTP Routes

```text
GET /internal/lot-intelligence/:lotCode
POST /internal/audit/x402
```

Internal routes must reject requests without the internal shared secret.

## 14. Data Integrity and Hashing

### 14.1 Manifest Hashes

Use canonical JSON before hashing.

Examples:

```ts
type LotMetadataManifest = {
	lotCode: string;
	farmName: string;
	farmerWallet: string;
	location: {
		country: string;
		region: string;
		latitude: number;
		longitude: number;
		altitudeMeters: number;
	};
	variety: string;
	areaManzanas: number;
	profile: string;
};
```

Hash:

```ts
sha256(canonicalJson(manifest));
```

On-chain:

- Store `[u8; 32]`.

Convex:

- Store hex string.

### 14.2 Terms Hash

Terms hash must include:

- lot PDA
- farmer wallet
- partner wallet
- ticket cents
- split bps
- lot metadata hash
- plan hash
- phygital delivery text hash
- timestamp or nonce

This prevents a reservation receipt from being detached from the actual terms shown to the partner.

## 15. Security Requirements

### 15.1 Wallet and Role Security

- Role registration must be signed by the wallet being registered.
- App must not let Convex role cache override on-chain role.
- Program must enforce role constraints for farmer-only and partner-only instructions.
- User cannot create Farmer lot with Partner role.
- User cannot reserve Partnership with Farmer role.

### 15.2 Agent Payment Security

- Agent wallet private key never leaves server-side runtime.
- Agent wallet is funded by the Harvverse/team demo budget, not by the Android user's Solana wallet.
- Agent payments are controlled by deterministic policy.
- User approval is required for paid tool calls unless an explicit session budget is already approved.
- x402 gateway must allowlist routes and payee.
- Convex internal endpoint must require shared secret if not fully private.
- Log every payment attempt.
- Show failed payments in chat.

### 15.3 AI Safety

- AI cannot decide transaction fields.
- AI receives precomputed settlement math.
- AI cannot sign Solana transactions.
- AI cannot call arbitrary paid URLs.
- AI must disclose when data came from paid premium endpoint.

### 15.4 Demo Financial Safety

- Use devnet and testnet only.
- Use Base Sepolia for x402.
- Use Solana devnet for on-chain accounts unless mentors require otherwise.
- Do not represent the x402 payment as user-funded in the hackathon demo.
- Do not ask the mobile user to sign an EVM/Base transaction.
- Do not imply production investment eligibility.

## 16. Functional Requirements

### P0 Requirements

| ID         | Requirement                                    | Acceptance                                                                   |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| PRD-P0-001 | Android app connects Solana wallet using MWA   | Wallet public key visible in app                                             |
| PRD-P0-002 | New wallet sees role selection                 | No role PDA returns selection screen                                         |
| PRD-P0-003 | User can register Farmer role on-chain         | `UserRole` PDA exists with Farmer enum                                       |
| PRD-P0-004 | User can register Partner role on-chain        | `UserRole` PDA exists with Partner enum                                      |
| PRD-P0-005 | Existing role routes user automatically        | Farmer routes to Farmer dashboard, Partner routes to Partner dashboard       |
| PRD-P0-006 | Farmer can autofill Zafiro lot                 | Form populated with blinded demo data                                        |
| PRD-P0-007 | Farmer can publish lot                         | Convex lot status published and Solana lot PDA exists                        |
| PRD-P0-008 | Partner can browse published lots              | Zafiro appears in catalog                                                    |
| PRD-P0-009 | Partner can ask AI chat                        | Convex Agent thread stores prompt, response, and tool-call messages          |
| PRD-P0-010 | Paid agent request uses x402                   | Demo shows tool approval, 402, payment, and successful response              |
| PRD-P0-011 | Partner can reserve partnership                | Solana Partnership PDA exists or reservation transaction signature displayed |
| PRD-P0-012 | Settlement preview displays deterministic math | $156 farmer and $104 partner shown                                           |

### P1 Requirements

| ID         | Requirement                             | Acceptance                                                      |
| ---------- | --------------------------------------- | --------------------------------------------------------------- |
| PRD-P1-001 | Farmer uploads lot image                | Convex storage id and hash saved                                |
| PRD-P1-002 | Farmer records sensor snapshot          | Sensor manifest hash saved and stored on-chain                  |
| PRD-P1-003 | Web app shows debug tables              | Roles, lots, partnerships, payments visible                     |
| PRD-P1-004 | x402 payment event persisted            | `x402Payments` row includes network, amount, status             |
| PRD-P1-005 | Agent answer references paid tool proof | Agent thread shows tool call, approval state, and payment event |
| PRD-P1-006 | Record settlement receipt on Solana     | SettlementReceipt PDA exists                                    |

### P2 Requirements

| ID         | Requirement         | Acceptance                                       |
| ---------- | ------------------- | ------------------------------------------------ |
| PRD-P2-001 | SPL token escrow    | USDC escrow account owned by program PDA         |
| PRD-P2-002 | Multiple lots       | Catalog supports more than Zafiro                |
| PRD-P2-003 | Camera capture      | Android camera proof attached to lot             |
| PRD-P2-004 | GPS capture         | Android location proof attached to lot           |
| PRD-P2-005 | x402 `upto` billing | Agent authorizes max and actual usage is settled |

## 17. API Contracts

### 17.1 Paid Lot Intelligence

This public endpoint is called by the server-side agent buyer, not directly by the Android app. In the hackathon demo, the payment payload is funded by the Harvverse Base Sepolia agent wallet after the Partner approves the paid tool call in Convex.

```http
GET /paid/lot-intelligence/HV-HN-ZAF-L02
Accept: application/json
```

Without payment:

```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: <x402 payment requirements>
Content-Type: application/json
```

With valid payment:

```http
HTTP/1.1 200 OK
PAYMENT-RESPONSE: <x402 settlement response>
Content-Type: application/json
```

Body:

```json
{
	"lotCode": "HV-HN-ZAF-L02",
	"recommendation": {
		"action": "reserve_as_phygital_partner",
		"confidence": 0.82
	}
}
```

### 17.2 Internal Convex Lot Intelligence

```http
GET /internal/lot-intelligence/HV-HN-ZAF-L02
X-Harvverse-Internal-Secret: <secret>
```

Response:

```json
{
	"lot": {},
	"plan": {},
	"sensorSnapshot": {},
	"settlementPreview": {},
	"hashes": {}
}
```

### 17.3 Agent Chat

Client calls Convex action/mutation, not raw HTTP:

```ts
api.agentThreads.sendMessage({
	threadId,
	lotCode: "HV-HN-ZAF-L02",
	text: "What happens if yield is higher than expected?",
});
```

Expected side effects:

- User message is saved into the Convex Agent thread.
- Internal generation action is scheduled.
- Stream deltas are saved while the Agent responds.
- Tool-call messages are persisted in the thread.
- If paid intelligence is needed, an approval request is persisted before backend demo-wallet spend.
- After approval, the server-side agent wallet attempts the x402 call.
- Agent response is saved into the same thread.

## 18. Demo Narrative

### 18.1 Farmer Demo

1. Connect wallet.
2. No role found.
3. Select Farmer.
4. Sign role transaction.
5. Routed to Farmer dashboard.
6. Tap "Create lot".
7. Tap "Autofill Zafiro demo lot".
8. Tap "Autofill agronomic plan".
9. Tap "Publish lot".
10. App shows Solana lot receipt and published status.

### 18.2 Partner Demo

1. Connect different wallet.
2. No role found.
3. Select Partner.
4. Sign role transaction.
5. Routed to Partner dashboard.
6. Open Zafiro lot.
7. Ask: "Should I reserve this lot?"
8. Agent requests approval for paid lot intelligence.
9. Partner approves the backend tool call within the displayed demo budget.
10. Server-side Harvverse agent wallet pays x402 for premium lot intelligence on Base Sepolia.
11. Agent explains ticket, risks, settlement, and recommendation.
12. Partner taps "Reserve partnership".
13. Partner signs Solana transaction.
14. App shows partnership receipt.
15. App shows settlement preview.

## 19. Technical Fallbacks

### 19.1 If Anchor Program Is Not Fully Ready

Minimum acceptable:

- `register_role` works.
- Lot and partnership can be represented by signed memo transactions or simplified receipt accounts.
- Convex stores the rest with transaction signatures.

Do not fake role registration. Role registration is the core Solana proof.

### 19.2 If x402 Gateway Blocks

Minimum acceptable:

- Use official x402 Next.js or Express middleware locally or deployed.
- Show actual 402 and paid retry.
- Use AWS architecture slide and explain that Convex remains backend.

Last resort:

- Mock only the UI display after mentor approval.
- Clearly label as mocked. This is high risk for prize eligibility.

### 19.3 If AI Model Blocks

Fallback:

- Use deterministic template responses fed by paid lot intelligence JSON.
- The important track proof is x402 payment for the data, not model creativity.

## 20. Implementation Order

### Step 1: Program

- Rename/extend template program.
- Add role account and `register_role`.
- Add PDA helpers.
- Generate client.
- Confirm app can read role.

### Step 2: Mobile Routing

- MWA connect.
- Fetch role PDA.
- Role selection.
- Role registration transaction.
- Farmer/Partner dashboard routes.

### Step 3: Convex Backend

- Add schema.
- Add lots queries/mutations.
- Add chat schema.
- Add audit events.
- Add HTTP health route.

### Step 4: Farmer Lot

- Lot editor.
- Zafiro autofill.
- Plan autofill.
- Hash manifests.
- Create/publish lot transaction.

### Step 5: Partner Catalog

- Published lot query.
- Lot detail.
- Settlement preview.
- Reservation transaction.

### Step 6: x402 Paid Tool

- Implement paid endpoint.
- Implement server-side agent buyer call using the team-funded Base Sepolia demo wallet.
- Persist payment and tool call.
- Show payment proof in chat.

### Step 7: Polish and Submission

- README.
- Screenshots.
- Demo video.
- Technical architecture diagram.
- Track alignment section.

## 21. Open Technical Decisions

| Decision          | Recommendation                                  | Reason                                             |
| ----------------- | ----------------------------------------------- | -------------------------------------------------- |
| Solana network    | Devnet                                          | Compatible with hackathon demos and faucet funding |
| x402 network      | Base Sepolia                                    | Coinbase/AWS track alignment and testnet safety    |
| x402 scheme       | exact                                           | Simple fixed-price paid data endpoint              |
| x402 gateway      | API Gateway + Lambda if Lambda@Edge is too slow | Faster implementation while preserving AWS proof   |
| Backend           | Convex                                          | User requested; good fit for app state and media   |
| Role mutability   | Immutable for hackathon                         | Simpler routing and contract logic                 |
| Lot media         | Convex storage                                  | Solana should store hashes only                    |
| AI payment budget | Team-funded demo wallet, max $0.01 per tool call | Prevent accidental spend and avoid user custody    |
| Escrow            | Receipt-only for P0                             | Real token escrow is P2                            |

## 22. Testing Requirements

### 22.1 Anchor Tests

Minimum tests:

- `register_role` creates Farmer role.
- `register_role` creates Partner role.
- duplicate `register_role` fails.
- Partner cannot create lot.
- Farmer cannot reserve partnership.
- Farmer can create lot.
- Published lot can be reserved by Partner.
- Duplicate reservation fails.
- Settlement receipt records expected math.

### 22.2 Client Tests

Minimum tests:

- PDA helpers derive stable addresses for known wallet fixtures.
- role router returns `unregistered`, `farmer`, and `partner` states.
- manifest hash function returns deterministic hash independent of object key order.
- terms hash changes when ticket, split, partner, or lot changes.

### 22.3 Convex Tests

Minimum tests:

- user upsert by wallet is idempotent.
- role cache cannot be written without tx signature.
- lot draft can be created and published.
- Zafiro autofill writes expected values.
- agent thread mapping is created for Partner + lot.
- `sendMessage` saves the user message and schedules generation.
- `listThreadMessages` returns Agent messages plus stream deltas.
- paid tool call emits approval-requested state when no session budget exists.
- approval mutation approves or denies the pending tool call.
- agent tool call status transitions from requested to approval_requested to approved to paid to completed.
- x402 payment event links to tool call.

### 22.4 x402 Tests

Minimum tests:

- unpaid `GET /paid/lot-intelligence/:lotCode` returns 402.
- paid retry returns 200 and JSON.
- endpoint rejects unsupported lot code.
- endpoint rejects unsupported network.
- endpoint rejects payee mismatch.
- agent payment budget blocks excess spend.

### 22.5 Manual Demo Tests

Before submission, run:

- Farmer wallet first-run registration.
- Farmer Zafiro lot creation and publish.
- Partner wallet first-run registration.
- Partner catalog and detail view.
- Partner paid agent question.
- Partner reservation transaction.
- Settlement preview.
- Web debug view for roles, lots, partnerships, tool calls, and payments.

## 23. Definition of Done

The PRD is implemented enough for hackathon submission when:

- Android APK can be installed and opened.
- Wallet connects through Mobile Wallet Adapter.
- New wallet can register Farmer role on-chain.
- New wallet can register Partner role on-chain.
- Existing wallet is routed by reading the on-chain role.
- Farmer can publish the Zafiro demo lot.
- Partner can see the published lot.
- Partner can ask AI agent a lot-specific question.
- Convex Agent thread streams the answer through persisted message deltas.
- x402 paid endpoint returns 402 before payment and data after payment.
- Paid tool call shows approval before spend unless covered by explicit session budget.
- Agent response displays tool-call and payment proof.
- Partner can sign a reservation transaction.
- Settlement preview is displayed with correct math.
- README explains Solana, Convex, x402, AWS, and limitations honestly.

# Harvverse Gap Analysis Report

> **Scope:** Everything in the PRD (`plans/product-tech-design.md`) and design doc (`.kiro/specs/solana-mobile-app/design.md`) **excluding** the AI Agent chat, x402 paid endpoints, agent tools, agent threads, streaming, tool approval, and all agent-related Convex tables (`agentThreads`, `agentToolCalls`, `x402Payments`).
>
> **Date:** 2026-05-06
>
> **Methodology:** Full file-by-file read of `programs/anchor/`, `packages/solana-client/`, `packages/backend/convex/`, and `apps/native/` compared against PRD §1–§22 and the spec design document.

---

## 1. Anchor Program Gaps

### 1.1 `EmptyHash` Validation Never Enforced

| Field             | Value                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §8.4 `create_lot` acceptance: "Hashes are nonzero"; Requirement 14.5: "reject any hash field that is all zeros via error `EmptyHash`"                                                    |
| **Current State** | The `HarvverseError::EmptyHash` variant is defined in `errors.rs` but is never referenced in any instruction handler. `create_lot` accepts all-zero `[u8; 32]` hashes without complaint. |
| **Impact**        | A farmer can publish a lot with placeholder zero hashes, undermining the data-integrity guarantee the PRD promises.                                                                      |
| **Fix**           | Add `require!` checks in `create_lot.rs` (and optionally `update_lot_hashes.rs`) that reject `[0u8; 32]` for each hash field.                                                            |

```rust
// Example fix in create_lot.rs
fn is_zero(hash: &[u8; 32]) -> bool {
    hash.iter().all(|&b| b == 0)
}

require!(!is_zero(&input.metadata_hash), HarvverseError::EmptyHash);
require!(!is_zero(&input.plan_hash), HarvverseError::EmptyHash);
require!(!is_zero(&input.media_manifest_hash), HarvverseError::EmptyHash);
require!(!is_zero(&input.sensor_manifest_hash), HarvverseError::EmptyHash);
```

---

### 1.2 `SettlementRecorded` Event Missing Share Fields

| Field             | Value                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §8.5 event definition includes `farmer_share_usdc_cents: u64` and `partner_share_usdc_cents: u64`                |
| **Current State** | `events.rs` only emits `partnership_pda` and `settlement_hash`                                                   |
| **Impact**        | Off-chain indexers and the web debug console cannot see settlement shares from event logs alone.                 |
| **Fix**           | Add the two missing fields to the `SettlementRecorded` event struct and populate them in `record_settlement.rs`. |

```rust
#[event]
pub struct SettlementRecorded {
    pub partnership_pda: Pubkey,
    pub farmer_share_usdc_cents: u64,
    pub partner_share_usdc_cents: u64,
    pub settlement_hash: [u8; 32],
}
```

---

### 1.3 `LotPublished` Event Missing `updated_at` Field

| Field             | Value                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §8.5 / Design doc event definition includes `updated_at: i64`                                                        |
| **Current State** | Event only has `lot_pda` and `farmer`                                                                                |
| **Impact**        | Minor — timestamp is available from the transaction itself, but the PRD explicitly requires it in the event payload. |
| **Fix**           | Add `pub updated_at: i64` to the event and emit `lot.updated_at` in `publish_lot.rs`.                                |

---

### 1.4 `record_milestone` — No Milestone Index Range Validation

| Field             | Value                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §8.4: "Milestone index is 1 through 6"; Error `InvalidMilestoneIndex` defined in §8.6                                  |
| **Current State** | `record_milestone.rs` accepts any `u8` value (0–255). The `InvalidMilestoneIndex` error is not defined in `errors.rs`. |
| **Impact**        | Arbitrary milestone indices can be created, polluting the PDA space.                                                   |
| **Fix**           | Add `InvalidMilestoneIndex` to `errors.rs` and add a range check:                                                      |

```rust
require!(
    milestone_index >= 1 && milestone_index <= 6,
    HarvverseError::InvalidMilestoneIndex
);
```

---

### 1.5 `record_milestone` — No Signer Authorization Check

| Field             | Value                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §8.4: "Signer is farmer or demo authority"                                                                                            |
| **Current State** | The `recorder` field is an unconstrained `Signer`. Anyone with SOL can record a milestone for any partnership.                        |
| **Impact**        | Unauthorized users can create fake milestone proofs.                                                                                  |
| **Fix**           | Add `ProgramConfig` account to the context and validate that `recorder` is either `partnership.farmer` or `program_config.authority`. |

```rust
#[derive(Accounts)]
#[instruction(milestone_index: u8, proof_hash: [u8; 32])]
pub struct RecordMilestone<'info> {
    #[account(mut)]
    pub recorder: Signer<'info>,

    #[account(seeds = [b"config"], bump = program_config.bump)]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        constraint = partnership.status == PartnershipStatus::Reserved
            || partnership.status == PartnershipStatus::Active,
    )]
    pub partnership: Account<'info, Partnership>,

    // ... milestone_receipt init ...
    pub system_program: Program<'info, System>,
}

// In handler:
require!(
    recorder.key() == partnership.farmer || recorder.key() == program_config.authority,
    HarvverseError::InvalidSettlementSigner // or a new InvalidMilestoneRecorder error
);
```

---

### 1.6 `ticket_usdc_cents > 0` Uses Wrong Error Code

| Field             | Value                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §8.4: "ticket_usdc_cents > 0"                                                                                                                                       |
| **Current State** | `create_lot.rs` line: `require!(input.ticket_usdc_cents > 0, HarvverseError::InvalidShareSplit)`                                                                    |
| **Impact**        | Misleading error message when ticket is zero — user sees "share BPS must sum to 10000" instead of a ticket-specific message.                                        |
| **Fix**           | Either add a new `InvalidTicketAmount` error or use a more generic constraint error. Alternatively, use `EmptyHash` is wrong too — best to add a dedicated variant: |

```rust
#[msg("Ticket amount must be greater than zero")]
InvalidTicketAmount,
```

---

### 1.7 `price_per_lb_cents` Type Widened from PRD

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference**   | §8.3 `SettlementReceipt`: `price_per_lb_cents: u16`                                                                                                                         |
| **Current State**   | `SettlementInput` uses `price_per_lb_cents: u32`                                                                                                                            |
| **Impact**          | Low — u32 is a superset of u16 and doesn't break anything. But the IDL and generated client will expect u32, creating a mismatch if the PRD is taken as the canonical spec. |
| **Decision Needed** | Keep u32 (more future-proof) or revert to u16 (PRD compliance). Recommend keeping u32 and noting the deviation.                                                             |

---

### 1.8 No `DuplicateMilestone` Error Enforcement

| Field             | Value                                                                                                                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §8.6: `DuplicateMilestone` error defined; §8.4: "Duplicate milestone index fails"                                                                                                                                                                                                                           |
| **Current State** | The PDA `init` constraint with seeds `["milestone", partnership, milestone_index]` will naturally fail if the account already exists (Anchor returns `AccountAlreadyInUse`). However, the custom `DuplicateMilestone` error is not defined in `errors.rs` and the generic Anchor error is less informative. |
| **Impact**        | Low — duplicates are prevented by PDA uniqueness, but the error message is generic rather than domain-specific.                                                                                                                                                                                             |
| **Fix**           | Optional — add the error for better DX, or accept the Anchor default.                                                                                                                                                                                                                                       |

---

## 2. Solana Client Package Gaps

### 2.1 No `deriveUserRolePda` / `deriveFarmerProfilePda` / etc. as Standalone Functions

| Field               | Value                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference**   | Design doc §2 "Key Interfaces" lists `deriveUserRolePda(wallet)`, `deriveFarmerProfilePda(farmer)`, etc. as direct exports                                                                          |
| **Current State**   | These are re-exported from Codama-generated code as `findUserRolePda`, `findFarmerProfilePda`, etc. The naming convention is `find*Pda` (Codama style) rather than `derive*Pda` (design doc style). |
| **Impact**          | Low — functionally equivalent. The native app imports them as `findUserRolePda` and they work.                                                                                                      |
| **Decision Needed** | Add thin `derive*` aliases for design doc compliance, or accept the `find*` naming.                                                                                                                 |

---

### 2.2 No `fetchUserRole(rpc, wallet)` with Simplified Return Type

| Field               | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| **PRD Reference**   | Design doc: `fetchUserRole(rpc, wallet): Promise<UserRole                  | null>`                                                 |
| **Current State**   | `fetchUserRoleByWallet` returns `MaybeAccount<UserRole>                    | null`— the caller must check`.exists`and access`.data` |
| **Impact**          | Low — the native app already handles this correctly in `role-context.tsx`. |
| **Decision Needed** | Add a simplified wrapper that returns `UserRole                            | null` directly, or accept the current pattern.         |

---

## 3. Convex Backend Gaps

### 3.1 No HTTP Health Endpoint

| Field             | Value                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §13.3: `GET /health`; §9.4 queries list includes health                                                                                   |
| **Current State** | `packages/backend/convex/status.ts` exists but is a regular Convex query, not an HTTP action. No `httpRouter` or HTTP action file exists. |
| **Impact**        | Low for hackathon — judges won't hit a health endpoint. But the PRD lists it.                                                             |
| **Fix**           | Create `packages/backend/convex/http.ts` with an HTTP router exposing `GET /health`.                                                      |

```typescript
// packages/backend/convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
	path: "/health",
	method: "GET",
	handler: httpAction(async () => {
		return new Response(
			JSON.stringify({ status: "ok", timestamp: Date.now() }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	}),
});

export default http;
```

---

### 3.2 Partnership Table Missing `ticketUsdcCents`

| Field             | Value                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | On-chain `Partnership` stores `ticket_usdc_cents: u64`; the design implies Convex should mirror key fields                                          |
| **Current State** | The `partnerships` Convex table has no `ticketUsdcCents` field. The `createPendingReservation` mutation doesn't accept or store it.                 |
| **Impact**        | Low — the ticket can be looked up via the lot. But for self-contained partnership records and the settlement preview, having it directly is useful. |
| **Fix**           | Add `ticketUsdcCents: v.optional(v.number())` to the partnerships schema and pass it in `createPendingReservation`.                                 |

---

### 3.3 No `convex.config.ts` (Agent Component Registration)

| Field             | Value                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| **PRD Reference** | §9.2: Convex Agent component setup requires `convex.config.ts`                                  |
| **Current State** | File does not exist                                                                             |
| **Impact**        | Blocks AI agent integration (out of scope for this report but noted for when that work begins). |
| **Fix**           | Will be needed when implementing the agent spec.                                                |

---

### 3.4 Audit Events Not Wired into All Key Mutations

| Field             | Value                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §9.4: "audit.record" should be called for all key state transitions                                                                            |
| **Current State** | Audit events ARE wired into: `lots.createDraft`, `lots.markPublished`, `users.recordRoleRegistration`, `partnerships.createPendingReservation` |
| **Missing from**  | `farmerProfiles.upsert`, `partnerProfiles.upsert`, `lots.recordOnChainLot`, `partnerships.recordReservationTx`                                 |
| **Impact**        | Incomplete audit trail for profile creation and on-chain recording events.                                                                     |
| **Fix**           | Add `ctx.runMutation(internal.audit.recordInternal, {...})` calls to the missing mutations.                                                    |

---

## 4. Native App Gaps

### 4.1 No Lot Media Upload UI

| Field             | Value                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PRD Reference** | §11.3 "Media and Proof" screen; P1-001: "Farmer uploads lot image"                                                                                     |
| **Current State** | The Convex `lotMedia.addMedia` mutation exists, but there is no UI screen for uploading media. No camera capture, no file picker, no media management. |
| **Impact**        | P1 requirement — not blocking for P0 demo but reduces the "proof capture" narrative.                                                                   |
| **Fix**           | Create `apps/native/app/(farmer)/lots/[lotCode]/media.tsx` with image picker and Convex file storage upload.                                           |

---

### 4.2 No `lots/index.tsx` Route File for Farmer

| Field             | Value                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **PRD Reference** | §13.1 route map includes `farmer/lots`                                                                                               |
| **Current State** | `apps/native/app/(farmer)/_layout.tsx` references `lots/index` but the file doesn't exist. The farmer home screen shows lots inline. |
| **Impact**        | Low — if a user navigates to `/(farmer)/lots` directly, they'll get a 404. The home screen works as the lot list.                    |
| **Fix**           | Either create a simple `lots/index.tsx` that redirects to home, or remove the reference from the layout.                             |

---

### 4.3 No Explicit Wallet Disconnect Navigation Handler

| Field             | Value                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | Requirement 12.4: "WHEN a wallet disconnects, THE Native_App SHALL navigate back to the wallet connection screen"                                                                                                                                                                                                                                                                  |
| **Current State** | The `RoleProvider` resets state when `account` becomes null. The `index.tsx` router redirects to `/connect-wallet` when no account. But if the user is deep in `(farmer)/lots/[lotCode]/edit` and disconnects, the `RoleGuard` may not trigger immediate navigation — it depends on whether the guard re-renders and whether expo-router handles the redirect from a nested route. |
| **Impact**        | Medium — could leave the user on a broken screen after disconnect.                                                                                                                                                                                                                                                                                                                 |
| **Fix**           | Add a `useEffect` in `RoleGuard` or `_layout.tsx` that watches `account` and calls `router.replace("/connect-wallet")` when it becomes null.                                                                                                                                                                                                                                       |

---

### 4.4 Settlement Preview Rounding

| Field             | Value                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **PRD Reference** | §11.4: "Revenue = 6qq × 83.3 lb/qq × $3.50 = $1,750"                                                                     |
| **Current State** | Implementation: `6 * 83.3 * 3.5 = 1749.3` → displays as `$1,749`                                                         |
| **Impact**        | Cosmetic — the PRD rounds to $1,750. The math is correct but the display differs by $1.                                  |
| **Fix**           | Either round revenue to nearest dollar in display, or use `Math.ceil` for the revenue line, or accept the $1 difference. |

---

### 4.5 No `DisconnectWalletButton` on Farmer/Partner Home Screens (Functional but UX)

| Field             | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| **PRD Reference** | §11.3/§11.4 imply wallet management is accessible from dashboards |
| **Current State** | `DisconnectWalletButton` IS present on both home screens ✓        |
| **Impact**        | None — this is actually implemented.                              |

---

## 5. Web App Gaps

### 5.1 No Harvverse Debug/Admin Screens

| Field             | Value                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §12: Web app should have debug tables for roles, lots, partnerships, payments, agent tool calls, Convex health, Solana program health |
| **Current State** | `apps/web/` exists but contains only the original template code (wallet connect, counter example). No Harvverse-specific screens.     |
| **Impact**        | Medium for hackathon judging — judges may want to inspect state without the mobile app.                                               |
| **Fix**           | Create debug pages at `apps/web/app/debug/` with:                                                                                     |

```
apps/web/app/debug/
├── page.tsx              # Overview dashboard
├── roles/page.tsx        # All registered roles
├── lots/page.tsx         # All lots with status
├── partnerships/page.tsx # All partnerships
└── audit/page.tsx        # Audit event log
```

Each page queries Convex and displays a table. Optional: add Solana explorer links for PDAs.

---

### 5.2 No Admin Seed/Reset Actions

| Field             | Value                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §12: "Admin seed button for Zafiro lot", "Admin reset for demo data"                                                  |
| **Current State** | Not implemented                                                                                                       |
| **Impact**        | Low — the mobile app has autofill buttons that serve the same purpose.                                                |
| **Fix**           | Optional — add a "Seed Zafiro" button on the web debug page that calls `lots.createDraft` + `lots.applyDemoAutofill`. |

---

## 6. Testing Gaps

### 6.1 No Anchor Integration Tests

| Field              | Value                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **PRD Reference**  | §22.1: 9 minimum test cases listed                                                                   |
| **Current State**  | No test file exists in `programs/anchor/tests/`                                                      |
| **Impact**         | High — cannot verify program correctness without deploying. Blocks confidence in the on-chain logic. |
| **Required Tests** |                                                                                                      |

```
1. register_role creates Farmer role
2. register_role creates Partner role
3. Duplicate register_role fails
4. Partner cannot create lot (InvalidRole)
5. Farmer cannot reserve partnership (InvalidRole)
6. Farmer can create lot with valid input
7. Published lot can be reserved by Partner
8. Duplicate reservation fails (PDA already exists)
9. Settlement receipt records expected math
```

---

### 6.2 No Client Package Unit Tests

| Field              | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| **PRD Reference**  | §22.2: PDA stability, hash determinism, canonical JSON      |
| **Current State**  | No test files in `packages/solana-client/`                  |
| **Impact**         | Medium — hash and PDA logic is critical for data integrity. |
| **Required Tests** |                                                             |

```
1. deriveUserRolePda produces stable output for same wallet
2. deriveLotPda produces stable output for same farmer + lotIdHash
3. computeManifestHash is deterministic regardless of key order
4. canonicalJson sorts nested keys correctly
5. computeManifestHash changes when input changes
```

---

### 6.3 No Convex Function Tests

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| **PRD Reference**  | §22.3: Idempotency, status transitions, autofill             |
| **Current State**  | No test files in `packages/backend/`                         |
| **Impact**         | Medium — Convex functions are the off-chain source of truth. |
| **Required Tests** |                                                              |

```
1. upsertAfterWalletConnect is idempotent (multiple calls = one record)
2. createDraft creates lot with status "draft"
3. listPublished returns only published lots
4. applyDemoAutofill applies correct Zafiro data
5. markPublished transitions status correctly
6. recordRoleRegistration stores role, PDA, and tx
```

---

## 7. Cross-Cutting Gaps

### 7.1 No README Updates

| Field             | Value                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **PRD Reference** | §20 Step 7: "README explains Solana, Convex, x402, AWS, and limitations honestly"                                             |
| **Current State** | Root README likely still describes the template Vault program                                                                 |
| **Impact**        | High for hackathon submission — judges read the README first.                                                                 |
| **Fix**           | Update root `README.md` with: architecture diagram, setup instructions, demo walkthrough, track alignment, known limitations. |

---

### 7.2 No Demo Video / Screenshots

| Field             | Value                                                         |
| ----------------- | ------------------------------------------------------------- |
| **PRD Reference** | §20 Step 7: "Screenshots", "Demo video"                       |
| **Current State** | Not applicable to code — but noting for submission checklist. |

---

### 7.3 No `pnpm anchor:test` Passing (Checkpoint 2)

| Field             | Value                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| **PRD Reference** | Task 2 checkpoint: "Run `pnpm anchor:test` to verify all integration tests pass" |
| **Current State** | No tests exist, so this checkpoint cannot pass.                                  |
| **Impact**        | Blocks the formal checkpoint validation.                                         |

---

## 8. Priority Matrix

| Priority | Gap                                 | Effort | Impact                         |
| -------- | ----------------------------------- | ------ | ------------------------------ |
| **P0**   | 6.1 Anchor integration tests        | High   | High — proves program works    |
| **P0**   | 1.1 EmptyHash validation            | Low    | Medium — data integrity        |
| **P0**   | 1.4 Milestone index range check     | Low    | Medium — prevents garbage data |
| **P0**   | 1.5 Milestone signer authorization  | Medium | High — security                |
| **P0**   | 7.1 README update                   | Medium | High — hackathon submission    |
| **P1**   | 5.1 Web debug screens               | Medium | Medium — judge experience      |
| **P1**   | 1.2 SettlementRecorded event fields | Low    | Low — indexer convenience      |
| **P1**   | 1.3 LotPublished event updated_at   | Low    | Low — PRD compliance           |
| **P1**   | 3.4 Audit events in all mutations   | Low    | Low — completeness             |
| **P1**   | 4.3 Disconnect navigation handler   | Low    | Medium — UX robustness         |
| **P1**   | 6.2 Client unit tests               | Medium | Medium — confidence            |
| **P1**   | 6.3 Convex function tests           | Medium | Medium — confidence            |
| **P2**   | 1.6 Wrong error code for ticket=0   | Low    | Low — DX                       |
| **P2**   | 1.7 price_per_lb_cents type         | Low    | Low — cosmetic                 |
| **P2**   | 2.1 derive* vs find* naming         | Low    | Low — cosmetic                 |
| **P2**   | 2.2 Simplified fetchUserRole return | Low    | Low — cosmetic                 |
| **P2**   | 3.1 HTTP health endpoint            | Low    | Low — nice to have             |
| **P2**   | 3.2 Partnership ticketUsdcCents     | Low    | Low — convenience              |
| **P2**   | 4.1 Lot media upload UI             | Medium | Low (P1 feature)               |
| **P2**   | 4.2 lots/index.tsx route            | Low    | Low — edge case                |
| **P2**   | 4.4 Settlement rounding             | Low    | Low — cosmetic                 |
| **P2**   | 5.2 Admin seed/reset                | Low    | Low — nice to have             |

---

## 9. Recommended Execution Order

1. **Anchor program hardening** (gaps 1.1, 1.4, 1.5, 1.6) — ~1 hour
2. **Anchor event fixes** (gaps 1.2, 1.3) — ~30 min
3. **Anchor integration tests** (gap 6.1) — ~3 hours
4. **README update** (gap 7.1) — ~1 hour
5. **Convex audit wiring** (gap 3.4) — ~30 min
6. **Disconnect navigation** (gap 4.3) — ~30 min
7. **Web debug screens** (gap 5.1) — ~2 hours
8. **Client unit tests** (gap 6.2) — ~1 hour
9. **Convex function tests** (gap 6.3) — ~1 hour
10. **Remaining P2 items** — as time allows

**Total estimated effort for P0+P1 gaps: ~10 hours**

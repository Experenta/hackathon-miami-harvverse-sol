# Implementation Plan: Harvverse Solana Mobile App

## Overview

This plan implements the Harvverse Solana Mobile App in five phases following the PRD implementation order: (1) Anchor program replacing the template Vault, (2) Codama client generation and PDA helpers, (3) Convex backend setup, (4) Mobile app routing and wallet connection, (5) Farmer and Partner dashboard features. Each task builds incrementally on the previous, ensuring no orphaned code.

## Tasks

- [x]   1. Anchor Program — Replace Vault with Harvverse
    - [x] 1.1 Scaffold the harvverse Anchor program structure
        - Remove `programs/anchor/programs/vault/` directory
        - Create `programs/anchor/programs/harvverse/` with `Cargo.toml` and `src/lib.rs`
        - Update `programs/anchor/Anchor.toml` to reference `harvverse` instead of `vault` (keep same program ID `Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP` for devnet/localnet)
        - Update workspace `Cargo.toml` members to include `programs/harvverse`
        - Create module files: `src/state/mod.rs`, `src/instructions/mod.rs`, `src/events.rs`, `src/errors.rs`
        - Declare all modules in `lib.rs` with `declare_id!` macro
        - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.1, 11.2, 11.3_

    - [x] 1.2 Implement state account structs and enums
        - Create `src/state/program_config.rs` with `ProgramConfig` account: authority, treasury, role_registration_enabled, bump
        - Create `src/state/user_role.rs` with `UserRole` account: wallet, role (RoleKind enum: Farmer/Partner), created_at, bump
        - Create `src/state/farmer_profile.rs` with `FarmerProfile` account: farmer, display_name_hash, metadata_uri_hash, created_at, bump
        - Create `src/state/partner_profile.rs` with `PartnerProfile` account: partner, display_name_hash, metadata_uri_hash, created_at, bump
        - Create `src/state/lot.rs` with `Lot` account: farmer, lot_id_hash, metadata_hash, plan_hash, media_manifest_hash, sensor_manifest_hash, ticket_usdc_cents, farmer_share_bps, partner_share_bps, status (LotStatus enum), created_at, updated_at, bump
        - Create `src/state/partnership.rs` with `Partnership` account: lot, farmer, partner, terms_hash, ticket_usdc_cents, status (PartnershipStatus enum), reserved_at, bump
        - Create `src/state/milestone_receipt.rs` with `MilestoneReceipt` account: partnership, milestone_index, proof_hash, recorded_by, recorded_at, bump
        - Create `src/state/settlement_receipt.rs` with `SettlementReceipt` account: partnership, yield_qq, price_per_lb_cents, revenue_usdc_cents, cost_usdc_cents, profit_usdc_cents, farmer_share_usdc_cents, partner_share_usdc_cents, settlement_hash, settled_at, bump
        - Export all from `src/state/mod.rs`
        - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.7, 10.2, 11.1, 15.2_

    - [x] 1.3 Implement custom errors and events
        - Create `src/errors.rs` with `HarvverseError` enum: RoleAlreadyRegistered, InvalidRole, FarmerProfileMissing, PartnerProfileMissing, InvalidShareSplit, InvalidLotStatus, EmptyHash, InvalidAuthority, PartnershipAlreadyExists, ConfigAlreadyInitialized, InvalidSettlementSigner
        - Create `src/events.rs` with events: RoleRegistered, LotCreated, LotPublished, PartnershipReserved, MilestoneRecorded, SettlementRecorded
        - _Requirements: 1.3, 1.5, 2.2, 2.4, 2.5, 2.6, 2.7, 2.10, 3.3, 3.4, 3.5, 3.6, 3.8, 14.5_

    - [x] 1.4 Implement initialize_config and register_role instructions
        - Create `src/instructions/initialize_config.rs`: validates authority signer, creates ProgramConfig PDA with seeds `["config"]`, rejects if already exists
        - Create `src/instructions/register_role.rs`: validates wallet signer, creates UserRole PDA with seeds `["role", wallet]`, rejects if PDA already exists (RoleAlreadyRegistered), emits RoleRegistered event
        - Wire both instructions in `lib.rs` program module
        - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 11.2, 11.3_

    - [x] 1.5 Implement profile creation instructions
        - Create `src/instructions/create_farmer_profile.rs`: validates signer has Farmer UserRole PDA, creates FarmerProfile PDA with seeds `["farmer", farmer_wallet]`, stores display_name_hash and metadata_uri_hash
        - Create `src/instructions/create_partner_profile.rs`: validates signer has Partner UserRole PDA, creates PartnerProfile PDA with seeds `["partner", partner_wallet]`, stores display_name_hash and metadata_uri_hash
        - _Requirements: 10.1, 10.2, 10.3, 15.1, 15.2, 15.3_

    - [x] 1.6 Implement lot lifecycle instructions (create_lot, publish_lot, update_lot_hashes)
        - Create `src/instructions/create_lot.rs`: validates Farmer role + FarmerProfile exists, validates share split sums to 10000, validates ticket > 0, creates Lot PDA with seeds `["lot", farmer_wallet, lot_id_hash]` in Draft status, emits LotCreated event
        - Create `src/instructions/publish_lot.rs`: validates lot is in Draft status, sets status to Published, emits LotPublished event
        - Create `src/instructions/update_lot_hashes.rs`: validates lot is in Draft or Published status, updates specified hash fields, rejects if lot is Reserved or later
        - Define `CreateLotInput` and `UpdateLotHashesInput` structs
        - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 14.5_

    - [x] 1.7 Implement partnership and settlement instructions
        - Create `src/instructions/reserve_partnership.rs`: validates Partner role + PartnerProfile exists, validates lot is Published, creates Partnership PDA with seeds `["partnership", lot_pda, partner_wallet]`, sets lot status to Reserved, emits PartnershipReserved event
        - Create `src/instructions/record_milestone.rs`: creates MilestoneReceipt PDA with seeds `["milestone", partnership_pda, milestone_index]`, emits MilestoneRecorded event
        - Create `src/instructions/record_settlement.rs`: validates signer is farmer or authority, creates SettlementReceipt PDA with seeds `["settlement", partnership_pda]`, marks partnership and lot as Settled, emits SettlementRecorded event
        - Define `SettlementInput` struct
        - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

    - [ ]\* 1.8 Write Anchor integration tests for the harvverse program
        - Test `initialize_config` creates ProgramConfig PDA and rejects duplicate
        - Test `register_role` for Farmer and Partner, and rejection of duplicate registration
        - Test `create_farmer_profile` and `create_partner_profile` with role validation
        - Test `create_lot` with valid input, invalid share split, missing profile
        - Test `publish_lot` and `update_lot_hashes` with status validation
        - Test `reserve_partnership` with role/status validation
        - Test `record_settlement` with signer validation
        - _Requirements: 1.1-1.5, 2.1-2.10, 3.1-3.10, 10.1-10.3, 11.1-11.3, 15.1-15.3_

- [x]   2. Checkpoint — Anchor program builds and tests pass
    - Run `pnpm anchor:build` to verify the program compiles
    - Run `pnpm anchor:test` to verify all integration tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ]   3. Codama Client Generation and PDA Helpers
    - [ ] 3.1 Regenerate TypeScript client from harvverse IDL
        - Run `pnpm anchor:build` to produce the harvverse IDL JSON
        - Update Codama config to point to `harvverse` IDL instead of `vault`
        - Run `pnpm codama:js` to generate `packages/solana-client/src/generated/harvverse/`
        - Remove old `src/generated/vault/` directory
        - Update `packages/solana-client/src/index.ts` to export from `generated/harvverse` instead of `generated/vault`
        - Update `package.json` exports map to reference `generated/harvverse`
        - _Requirements: 4.1, 4.7_

    - [ ] 3.2 Implement PDA derivation helper functions
        - Create `packages/solana-client/src/harvverse/pda.ts` with functions: `deriveUserRolePda`, `deriveFarmerProfilePda`, `derivePartnerProfilePda`, `deriveLotPda`, `derivePartnershipPda`, `deriveMilestonePda`, `deriveSettlementReceiptPda`, `deriveProgramConfigPda`
        - Each function uses `getProgramDerivedAddress` from `@solana/kit` with the correct seeds from the PDA table
        - Export a default program ID constant from `packages/solana-client/src/harvverse/constants.ts`
        - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 10.5, 15.5_

    - [ ] 3.3 Implement account fetcher functions
        - Create `packages/solana-client/src/harvverse/fetchers.ts` with functions: `fetchUserRole`, `fetchLot`, `fetchPartnership`, `fetchFarmerProfile`, `fetchPartnerProfile`
        - Each fetcher derives the PDA, fetches the account data, decodes using the generated codec, and returns the typed account or null
        - _Requirements: 4.5_

    - [ ] 3.4 Implement transaction builder functions
        - Create `packages/solana-client/src/harvverse/transactions.ts` with builders: `buildRegisterRoleTx`, `buildCreateFarmerProfileTx`, `buildCreatePartnerProfileTx`, `buildCreateLotTx`, `buildPublishLotTx`, `buildUpdateLotHashesTx`, `buildReservePartnershipTx`, `buildRecordSettlementTx`
        - Each builder constructs the instruction with correct accounts and data, wraps in a transaction message
        - _Requirements: 4.7_

    - [ ] 3.5 Implement manifest hash utilities
        - Create `packages/solana-client/src/harvverse/hash.ts` with functions: `canonicalJson`, `computeManifestHash`, `computeManifestHashHex`
        - `canonicalJson` sorts keys recursively and produces deterministic JSON string
        - `computeManifestHash` applies SHA-256 to the canonical JSON bytes and returns `Uint8Array`
        - _Requirements: 4.8, 4.9, 14.1, 14.2, 14.3, 14.4_

    - [ ] 3.6 Create harvverse barrel export and types
        - Create `packages/solana-client/src/harvverse/types.ts` with shared TypeScript interfaces: `UserRole`, `Lot`, `Partnership`, `FarmerProfile`, `PartnerProfile`, `CreateLotTxInput`, `PublishLotTxInput`, `ReservePartnershipTxInput`, etc.
        - Create `packages/solana-client/src/harvverse/index.ts` re-exporting all modules (pda, fetchers, transactions, hash, constants, types)
        - Update `packages/solana-client/src/index.ts` to export `./harvverse`
        - _Requirements: 4.1-4.9_

    - [ ]\* 3.7 Write unit tests for PDA derivation and hash utilities
        - Test that `deriveUserRolePda` produces deterministic output for the same wallet
        - Test that `computeManifestHash` produces identical hashes for objects with different key ordering
        - Test that `canonicalJson` sorts nested keys correctly
        - Test all PDA derivation functions with known inputs produce expected addresses
        - _Requirements: 4.6, 4.9_

- [ ]   4. Checkpoint — Solana client package builds and type-checks
    - Run `pnpm build` to verify the full workspace builds
    - Run `pnpm typecheck` to verify no type errors
    - Ensure all tests pass, ask the user if questions arise.

- [ ]   5. Convex Backend Setup and Schema
    - [ ] 5.1 Initialize Convex in the workspace
        - Run `npx convex init` at the workspace root to create the `convex/` directory with `_generated/` and `tsconfig.json`
        - Add `convex` dependency to the root or `apps/native` package.json as appropriate
        - Configure Convex project URL in environment (`.env.local` or app config)
        - _Requirements: 9.1_

    - [ ] 5.2 Define the Convex schema (9 tables)
        - Create `convex/schema.ts` with all 9 tables: users, farmerProfiles, partnerProfiles, lots, lotMedia, agronomicPlans, sensorSnapshots, partnerships, auditEvents
        - Define all fields, validators, and indexes exactly as specified in the design document
        - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.13, 9.14_

    - [ ] 5.3 Implement users queries and mutations
        - Create `convex/users.ts` with: `getByWallet` query, `upsertAfterWalletConnect` mutation (idempotent by wallet), `recordRoleRegistration` mutation
        - `upsertAfterWalletConnect` creates a new user record if none exists for the wallet, otherwise updates `updatedAt`
        - _Requirements: 9.8, 9.9, 9.15_

    - [ ] 5.4 Implement lots queries and mutations
        - Create `convex/lots.ts` with: `listPublished` query, `getByCode` query, `listByFarmer` query, `createDraft` mutation, `applyDemoAutofill` mutation, `recordOnChainLot` mutation, `markPublished` mutation
        - `createDraft` sets status to "draft" with all lot fields
        - `applyDemoAutofill` applies Zafiro demo data to an existing draft lot
        - `recordOnChainLot` stores the lot PDA address and creation tx signature
        - `markPublished` updates status to "published" with the publish tx signature
        - _Requirements: 9.10, 9.11, 9.16, 9.17, 9.18, 9.19, 9.20_

    - [ ] 5.5 Implement partnerships queries and mutations
        - Create `convex/partnerships.ts` with: `listByPartner` query, `createPendingReservation` mutation, `recordReservationTx` mutation
        - `createPendingReservation` creates a partnership record with status "reserved"
        - `recordReservationTx` stores the partnership PDA and reservation tx signature
        - _Requirements: 9.12, 9.21, 9.22_

    - [ ] 5.6 Implement profile, media, sensor, plan, and audit functions
        - Create `convex/farmerProfiles.ts` with: `getByWallet` query, `upsert` mutation
        - Create `convex/partnerProfiles.ts` with: `getByWallet` query, `upsert` mutation
        - Create `convex/lotMedia.ts` with: `listByLot` query, `addMedia` mutation
        - Create `convex/sensorSnapshots.ts` with: `listByLot` query, `addSnapshot` mutation
        - Create `convex/agronomicPlans.ts` with: `getByLot` query, `upsertPlan` mutation
        - Create `convex/audit.ts` with: `record` mutation, `listByEntity` query
        - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.13, 9.14_

    - [ ]\* 5.7 Write unit tests for Convex functions
        - Test `upsertAfterWalletConnect` idempotency (multiple calls same wallet = one record)
        - Test `createDraft` creates lot with correct status
        - Test `listPublished` returns only published lots
        - Test `applyDemoAutofill` applies correct Zafiro data
        - _Requirements: 9.9, 9.10, 9.11, 9.18_

- [ ]   6. Checkpoint — Convex schema deploys and functions type-check
    - Run `npx convex dev --once` or equivalent to validate schema and function compilation
    - Run `pnpm typecheck` to verify no type errors in the workspace
    - Ensure all tests pass, ask the user if questions arise.

- [ ]   7. Mobile App — Routing, Providers, and Wallet Connection
    - [ ] 7.1 Update provider hierarchy with Convex and Role context
        - Install `convex` and `convex/react-native` (or `convex/react`) in `apps/native`
        - Update `apps/native/components/app-providers.tsx` to add ConvexProvider wrapping NetworkProvider
        - Create `apps/native/features/role/role-context.tsx` with RoleProvider that exposes role state, isLoading, error, refetch
        - Update provider nesting order: QueryClient > Convex > Network > MWA > Role > Stack
        - Update `apps/native/constants/app-config.ts` with Convex URL
        - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1_

    - [ ] 7.2 Implement wallet connection screen and MWA hook
        - Create `apps/native/features/wallet/use-wallet-connection.ts` hook wrapping MWA authorize/deauthorize
        - Create `apps/native/app/connect-wallet.tsx` screen with MWA connect button
        - On successful connection, call `users.upsertAfterWalletConnect` Convex mutation
        - _Requirements: 5.1, 6.5_

    - [ ] 7.3 Implement role fetching and routing logic
        - Create `apps/native/features/role/use-role.ts` hook that calls `fetchUserRole` from `@repo/solana-client` on wallet connect
        - Create `apps/native/components/loading-screen.tsx` for loading state during role fetch
        - Update `apps/native/app/index.tsx` to act as a router: redirect to `connect-wallet` if no wallet, show loading while fetching role, redirect to `role-select` if no role PDA, redirect to `(farmer)/home` or `(partner)/home` based on role
        - Display error with retry if RPC call fails (no Convex fallback)
        - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

    - [ ] 7.4 Implement role selection and registration screen
        - Create `apps/native/app/role-select.tsx` with Farmer and Partner options with descriptions
        - Create `apps/native/hooks/use-transaction.ts` hook for MWA sign+send flow with pending/error states
        - On role selection: build `registerRole` transaction using `buildRegisterRoleTx`, sign via MWA, show pending state with signature, on confirm call `users.recordRoleRegistration` Convex mutation, refetch role and route to dashboard
        - Handle transaction failure with error display and retry
        - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

    - [ ] 7.5 Set up expo-router route groups and role guard
        - Create `apps/native/app/(farmer)/_layout.tsx` with Farmer tab/stack layout
        - Create `apps/native/app/(partner)/_layout.tsx` with Partner tab/stack layout
        - Create `apps/native/components/role-guard.tsx` that checks role context and redirects if wrong role
        - Apply role guard in each route group layout
        - Handle wallet disconnect by navigating back to connect-wallet screen
        - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

    - [ ]\* 7.6 Write unit tests for role routing logic
        - Test that null role PDA routes to role-select
        - Test that Farmer role routes to farmer/home
        - Test that Partner role routes to partner/home
        - Test that RPC failure shows error with retry
        - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]   8. Checkpoint — App launches, connects wallet, and routes by role
    - Run `pnpm typecheck` to verify no type errors
    - Ensure all tests pass, ask the user if questions arise.

- [ ]   9. Farmer Dashboard — Lot Creation and Publishing
    - [ ] 9.1 Implement Farmer home screen
        - Create `apps/native/app/(farmer)/home.tsx` showing connected wallet address, Farmer role PDA, and lot list
        - Create `apps/native/features/farmer/use-farmer-lots.ts` hook querying `lots.listByFarmer` from Convex
        - Display lot cards with status badges (draft, published, reserved, settled)
        - Add "Create lot" button navigating to lots/new
        - _Requirements: 7.1_

    - [ ] 9.2 Implement Farmer profile creation
        - Create `apps/native/app/(farmer)/profile.tsx` screen with form: displayName, bio, country, region
        - On submit: compute metadata hash from profile fields, build `createFarmerProfile` transaction, sign via MWA
        - On confirm: save profile to Convex `farmerProfiles.upsert` mutation
        - _Requirements: 10.1, 10.2, 10.3, 10.4_

    - [ ] 9.3 Implement lot editor with demo autofill
        - Create `apps/native/app/(farmer)/lots/new.tsx` lot creation screen
        - Create `apps/native/features/farmer/lot-form.tsx` reusable form component with fields: lotCode, farmName, country, region, latitude, longitude, altitudeMeters, variety, areaManzanas, ticketUsdc, farmerShareBps, partnerShareBps
        - Create `apps/native/constants/demo-data.ts` with Zafiro autofill constants (HV-HN-ZAF-L02, Zafiro, Honduras, Comayagua, 14.9465, -88.0863, 1300, Parainema, 1.0, 3425, 6000, 4000)
        - Add "Autofill Zafiro demo lot" button that populates all fields
        - On save: call `lots.createDraft` Convex mutation
        - _Requirements: 7.2, 7.3, 7.4, 7.7_

    - [ ] 9.4 Implement agronomic plan and sensor snapshot autofill
        - Add "Autofill agronomic plan" button to lot editor that populates plan reference with demo plan ID and summary
        - Add "Autofill demo sensor snapshot" button that populates sensor fields with demo values (source=demo_autofill, representative temperature, humidity, soil pH, soil moisture)
        - On autofill: save to Convex `sensorSnapshots.addSnapshot` and `agronomicPlans.upsertPlan` mutations with source "demo_autofill"
        - Visually label autofill buttons as demo helpers
        - _Requirements: 13.1, 13.2, 13.3, 13.4_

    - [ ] 9.5 Implement lot publish flow with manifest hashing
        - Create `apps/native/app/(farmer)/lots/[lotCode]/publish-review.tsx` publish review screen
        - Create `apps/native/features/farmer/publish-flow.ts` with logic: compute metadata manifest hash, plan hash, media manifest hash, sensor manifest hash using `computeManifestHash` from `@repo/solana-client`
        - Build `create_lot` transaction (with all hashes and lot params), then `publish_lot` transaction
        - Present combined transaction for MWA signing
        - On confirm: call `lots.recordOnChainLot` and `lots.markPublished` Convex mutations
        - Display published lot with PDA address
        - _Requirements: 7.5, 7.6, 14.1, 14.2, 14.3, 14.4, 14.5_

    - [ ] 9.6 Implement lot edit screen for drafts
        - Create `apps/native/app/(farmer)/lots/[lotCode]/edit.tsx` for editing existing draft lots
        - Load lot data from Convex `lots.getByCode` query
        - Allow editing all fields and re-saving draft
        - _Requirements: 7.7_

    - [ ]\* 9.7 Write unit tests for publish flow hash computation
        - Test that metadata manifest hash is deterministic for same input
        - Test that hash changes when lot fields change
        - Test that autofill data produces expected hash values
        - _Requirements: 14.1, 14.6_

- [ ]   10. Checkpoint — Farmer can create, autofill, and publish lots
    - Run `pnpm typecheck` to verify no type errors
    - Ensure all tests pass, ask the user if questions arise.

- [ ]   11. Partner Dashboard — Catalog and Partnership Reservation
    - [ ] 11.1 Implement Partner home screen
        - Create `apps/native/app/(partner)/home.tsx` showing connected wallet address, Partner role PDA, and partnership list
        - Create `apps/native/features/partner/use-partnership.ts` hook querying `partnerships.listByPartner` from Convex
        - Display partnership cards with status badges
        - _Requirements: 8.1_

    - [ ] 11.2 Implement Partner profile creation
        - Create `apps/native/app/(partner)/profile.tsx` screen with form: displayName, organization
        - On submit: compute metadata hash, build `createPartnerProfile` transaction, sign via MWA
        - On confirm: save profile to Convex `partnerProfiles.upsert` mutation
        - _Requirements: 15.1, 15.2, 15.3, 15.4_

    - [ ] 11.3 Implement lot catalog screen
        - Create `apps/native/app/(partner)/catalog.tsx` listing all published lots
        - Create `apps/native/features/partner/use-lot-catalog.ts` hook querying `lots.listPublished` from Convex
        - Display lot cards with: farm name, variety, location, ticket amount
        - Tap navigates to lot detail
        - _Requirements: 8.1_

    - [ ] 11.4 Implement lot detail screen with on-chain verification
        - Create `apps/native/app/(partner)/lots/[lotCode]/index.tsx` showing full lot details: farm name, variety, location, ticket amount, share split, lot PDA address, farmer wallet
        - Fetch on-chain Lot PDA to verify it exists and matches Convex data
        - Display verification status (on-chain match / mismatch / not found)
        - Add "Reserve partnership" button navigating to reserve flow
        - _Requirements: 8.2, 8.3, 8.4_

    - [ ] 11.5 Implement settlement preview screen
        - Create `apps/native/app/(partner)/partnerships/[partnershipId]/settlement.tsx` displaying settlement math
        - Show: revenue = 6qq x 83.3 lb/qq x $3.50 = $1,750, cost = $1,490, profit = $260, farmer 60% = $156, partner 40% = $104
        - Use lot share BPS values for dynamic calculation display
        - _Requirements: 8.7_

    - [ ] 11.6 Implement partnership reservation flow
        - Create `apps/native/app/(partner)/lots/[lotCode]/reserve.tsx` partnership review screen
        - Create `apps/native/features/partner/reserve-flow.ts` with logic: compute terms hash from canonical JSON (lot PDA, farmer wallet, partner wallet, ticket_usdc_cents, farmer_share_bps, partner_share_bps, metadata hash, plan hash, timestamp)
        - Build `reserve_partnership` transaction with terms hash
        - Present for MWA signing
        - On confirm: call `partnerships.createPendingReservation` and `partnerships.recordReservationTx` Convex mutations
        - Display partnership receipt with PDA address
        - _Requirements: 8.4, 8.5, 8.6, 8.8_

    - [ ]\* 11.7 Write unit tests for terms hash computation and settlement math
        - Test that terms hash is deterministic for same inputs
        - Test settlement math calculation with known values
        - Test that different timestamps produce different terms hashes
        - _Requirements: 8.7, 8.8_

- [ ]   12. Checkpoint — Partner can browse, verify, and reserve lots
    - Run `pnpm typecheck` to verify no type errors
    - Ensure all tests pass, ask the user if questions arise.

- [ ]   13. Final Integration and Wiring
    - [ ] 13.1 Wire shared UI components
        - Create `apps/native/components/ui/button.tsx` shared button component
        - Create `apps/native/components/ui/card.tsx` shared card component
        - Create `apps/native/components/ui/form-field.tsx` shared form field component
        - Create `apps/native/components/ui/tx-status.tsx` transaction status display (pending, confirmed, failed)
        - Ensure consistent styling across Farmer and Partner screens
        - _Requirements: 6.3, 7.5, 8.5_

    - [ ] 13.2 Add Convex audit event recording
        - Wire audit event recording into key mutations: role registration, lot creation, lot publish, partnership reservation
        - Each audit event records: actorWallet, kind, entityType, entityId, data, createdAt
        - _Requirements: 9.14_

    - [ ] 13.3 Verify end-to-end type safety across packages
        - Run `pnpm typecheck` across the full workspace
        - Fix any type errors in the integration between `@repo/solana-client`, Convex functions, and native app
        - Ensure all imports resolve correctly
        - _Requirements: 4.1-4.9_

    - [ ]\* 13.4 Write integration tests for the full lot lifecycle
        - Test: register farmer role -> create profile -> create lot draft -> publish lot -> verify on-chain
        - Test: register partner role -> create profile -> browse catalog -> reserve partnership -> verify on-chain
        - _Requirements: 1.1-3.10, 7.1-8.8_

- [ ]   14. Final Checkpoint — Full workspace builds and type-checks
    - Run `pnpm build` to verify the full workspace builds
    - Run `pnpm typecheck` to verify no type errors
    - Run `pnpm anchor:test` to verify Anchor tests still pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between major phases
- The implementation order follows the PRD: Program -> Client -> Convex -> Mobile Routing -> Farmer -> Partner
- The existing Vault program ID (`Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP`) is reused for the harvverse program on devnet
- AI Agent chat and x402 endpoints are explicitly excluded from this implementation plan

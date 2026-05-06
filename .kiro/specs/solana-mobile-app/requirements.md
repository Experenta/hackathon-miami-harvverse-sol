# Requirements Document

## Introduction

This document defines the requirements for the Harvverse Solana Mobile App — the core hackathon deliverable covering on-chain role registration, lot marketplace, and partnership settlement on Solana devnet with a Convex off-chain backend and an Expo React Native Android app using Mobile Wallet Adapter.

The scope covers:

1. Anchor program extension (role registration, lot creation, partnership, settlement receipts)
2. Codama client generation and PDA helpers in `packages/solana-client`
3. Expo React Native Android app with MWA wallet connection, role-based routing, Farmer dashboard, and Partner dashboard
4. Convex backend for off-chain state (schema, queries, mutations for users, lots, partnerships, profiles, media, sensor snapshots)

Explicitly excluded (to be done in a separate spec):

- AI Agent chat functionality
- x402 paid endpoint and gateway
- Agent tools, threads, streaming, tool approval
- All agent-related Convex tables (agentThreads, agentToolCalls, x402Payments)

## Glossary

- **Harvverse_Program**: The Anchor Solana program deployed on devnet that stores role, lot, partnership, and settlement state
- **MWA**: Mobile Wallet Adapter — the Solana Mobile protocol for secure wallet communication on Android
- **PDA**: Program Derived Address — a deterministic Solana account address derived from seeds and a program ID
- **UserRole_PDA**: The on-chain account storing a wallet's registered role (Farmer or Partner)
- **Lot_PDA**: The on-chain account storing a published coffee lot's compact state and hashes
- **Partnership_PDA**: The on-chain account storing a partner's reservation receipt for a lot
- **SettlementReceipt_PDA**: The on-chain account storing final settlement math for a partnership
- **FarmerProfile_PDA**: The on-chain account storing a Farmer's profile anchor with seeds `["farmer", farmer_wallet]`
- **PartnerProfile_PDA**: The on-chain account storing a Partner's profile anchor with seeds `["partner", partner_wallet]`
- **Convex_Backend**: The Convex database and functions layer storing off-chain mutable app data (profiles, lot details, media, sensor snapshots)
- **Solana_Client**: The `@repo/solana-client` package containing Codama-generated client code and PDA derivation helpers
- **Native_App**: The Expo React Native Android application in `apps/native`
- **Farmer_Dashboard**: The set of screens available to wallets registered with the Farmer role
- **Partner_Dashboard**: The set of screens available to wallets registered with the Partner role
- **Demo_Autofill**: Explicit buttons that populate forms with known Zafiro lot demo data
- **Manifest_Hash**: A SHA-256 hash of canonical JSON representing off-chain data, stored on-chain as `[u8; 32]`
- **BPS**: Basis points — 1/100th of a percent; 10000 BPS equals 100%

## Requirements

### Requirement 1: Anchor Program Role Registration

**User Story:** As a new Harvverse user, I want to register my wallet role (Farmer or Partner) on-chain, so that the app can deterministically route me to the correct dashboard.

#### Acceptance Criteria

1. WHEN a wallet calls `register_role` with role Farmer, THE Harvverse_Program SHALL create a UserRole_PDA with seeds `["role", wallet]` containing the Farmer enum and the wallet public key
2. WHEN a wallet calls `register_role` with role Partner, THE Harvverse_Program SHALL create a UserRole_PDA with seeds `["role", wallet]` containing the Partner enum and the wallet public key
3. IF a wallet already has a UserRole_PDA, THEN THE Harvverse_Program SHALL reject the `register_role` instruction with error `RoleAlreadyRegistered`
4. THE Harvverse_Program SHALL require the wallet to be a signer of the `register_role` instruction
5. WHEN a role is registered, THE Harvverse_Program SHALL emit a `RoleRegistered` event containing the wallet address, role kind, and timestamp

### Requirement 2: Anchor Program Lot Lifecycle

**User Story:** As a Farmer, I want to create and publish coffee lots on-chain, so that Partners can discover and verify my lots through Solana state.

#### Acceptance Criteria

1. WHEN a Farmer calls `create_lot` with valid input, THE Harvverse_Program SHALL create a Lot_PDA with seeds `["lot", farmer_wallet, lot_id_hash]` in Draft status
2. THE Harvverse_Program SHALL validate that `farmer_share_bps + partner_share_bps` equals 10000 and reject with `InvalidShareSplit` otherwise
3. THE Harvverse_Program SHALL validate that `ticket_usdc_cents` is greater than zero
4. IF the signer does not have a UserRole_PDA with Farmer role, THEN THE Harvverse_Program SHALL reject the instruction with error `InvalidRole`
5. IF the signer does not have a FarmerProfile_PDA, THEN THE Harvverse_Program SHALL reject the instruction with error `FarmerProfileMissing`
6. WHEN a Farmer calls `publish_lot` on a Draft lot, THE Harvverse_Program SHALL set the lot status to Published and emit a `LotPublished` event
7. IF `publish_lot` is called on a lot that is not in Draft status, THEN THE Harvverse_Program SHALL reject with error `InvalidLotStatus`
8. WHEN a Farmer calls `update_lot_hashes` on a Draft or Published lot, THE Harvverse_Program SHALL update the specified hash fields
9. IF `update_lot_hashes` is called on a lot in Reserved or later status, THEN THE Harvverse_Program SHALL reject with error `InvalidLotStatus`
10. WHEN `create_lot` succeeds, THE Harvverse_Program SHALL emit a `LotCreated` event containing the lot PDA address, farmer wallet, and lot_id_hash

### Requirement 3: Anchor Program Partnership and Settlement

**User Story:** As a Partner, I want to reserve a partnership on a published lot and view settlement receipts on-chain, so that I have verifiable proof of the agreement and outcome.

#### Acceptance Criteria

1. WHEN a Partner calls `reserve_partnership` on a Published lot, THE Harvverse_Program SHALL create a Partnership_PDA with seeds `["partnership", lot_pda, partner_wallet]` in Reserved status
2. WHEN a partnership is reserved, THE Harvverse_Program SHALL set the lot status to Reserved
3. IF the signer does not have a UserRole_PDA with Partner role, THEN THE Harvverse_Program SHALL reject with error `InvalidRole`
4. IF the lot is not in Published status, THEN THE Harvverse_Program SHALL reject with error `InvalidLotStatus`
5. IF a Partnership_PDA already exists for the lot and partner, THEN THE Harvverse_Program SHALL reject the instruction
6. WHEN `reserve_partnership` succeeds, THE Harvverse_Program SHALL emit a `PartnershipReserved` event containing the partnership PDA, lot PDA, farmer wallet, partner wallet, and ticket amount
7. WHEN `record_settlement` is called with valid settlement input, THE Harvverse_Program SHALL create a SettlementReceipt_PDA with seeds `["settlement", partnership_pda]` containing yield, price, revenue, cost, profit, and share amounts
8. WHEN a settlement is recorded, THE Harvverse_Program SHALL emit a `SettlementRecorded` event and mark the partnership and lot as Settled
9. THE Harvverse_Program SHALL require `record_settlement` to be signed by the farmer wallet OR the program authority (demo mode)
10. IF the signer of `reserve_partnership` does not have a PartnerProfile_PDA, THEN THE Harvverse_Program SHALL reject with error `PartnerProfileMissing`

### Requirement 4: Codama Client Generation and PDA Helpers

**User Story:** As a developer, I want generated TypeScript client code and PDA derivation helpers, so that the mobile and web apps can interact with the Harvverse program using typed interfaces.

#### Acceptance Criteria

1. THE Solana_Client SHALL export a `deriveUserRolePda(wallet)` function that returns the deterministic PDA address for a given wallet
2. THE Solana_Client SHALL export a `deriveLotPda(farmer, lotIdHash)` function that returns the deterministic Lot PDA address
3. THE Solana_Client SHALL export a `derivePartnershipPda(lotPda, partner)` function that returns the deterministic Partnership PDA address
4. THE Solana_Client SHALL export a `deriveSettlementReceiptPda(partnershipPda)` function that returns the deterministic SettlementReceipt PDA address
5. THE Solana_Client SHALL export a `fetchUserRole(rpc, wallet)` function that returns the on-chain UserRole account or null
6. FOR ALL valid wallet addresses, calling `deriveUserRolePda` twice with the same input SHALL produce the same output (deterministic derivation)
7. THE Solana_Client SHALL export transaction builder functions for `registerRole`, `createLot`, `publishLot`, and `reservePartnership`
8. THE Solana_Client SHALL export a `computeManifestHash(payload)` function that produces a deterministic SHA-256 hash from canonical JSON input
9. FOR ALL valid JSON objects, `computeManifestHash` called with semantically equivalent objects differing only in key order SHALL produce the same hash (canonical JSON round-trip)

### Requirement 5: MWA Wallet Connection and Role Routing

**User Story:** As a mobile user, I want to connect my Solana wallet via MWA and be automatically routed to the correct dashboard based on my on-chain role, so that I have a seamless role-based experience.

#### Acceptance Criteria

1. WHEN the Native_App launches without a connected wallet, THE Native_App SHALL display a wallet connection screen with an MWA connect button
2. WHEN a wallet connects successfully, THE Native_App SHALL fetch the UserRole_PDA for that wallet from Solana devnet
3. WHEN the UserRole_PDA does not exist for the connected wallet, THE Native_App SHALL route to the role selection screen
4. WHEN the UserRole_PDA exists with Farmer role, THE Native_App SHALL route to the Farmer_Dashboard
5. WHEN the UserRole_PDA exists with Partner role, THE Native_App SHALL route to the Partner_Dashboard
6. IF the Solana RPC call to fetch the UserRole_PDA fails, THEN THE Native_App SHALL display an error with a retry option and SHALL NOT fall back to Convex cached role
7. WHILE the role PDA fetch is in progress, THE Native_App SHALL display a loading indicator that blocks navigation

### Requirement 6: Role Selection and Registration

**User Story:** As a new user with no on-chain role, I want to select and register my role (Farmer or Partner) by signing a Solana transaction, so that my role is permanently recorded on-chain.

#### Acceptance Criteria

1. THE Native_App SHALL display a role selection screen with two options: Farmer and Partner, each with a description
2. WHEN the user selects a role and taps "Sign and register role", THE Native_App SHALL construct and send a `register_role` transaction via MWA for signing
3. WHILE the transaction is pending confirmation, THE Native_App SHALL display a pending state with the transaction signature
4. WHEN the transaction confirms, THE Native_App SHALL refetch the UserRole_PDA and route to the appropriate dashboard
5. WHEN the transaction confirms, THE Native_App SHALL call the Convex_Backend `users.recordRoleRegistration` mutation to cache the role, PDA address, and transaction signature
6. IF the transaction fails, THEN THE Native_App SHALL display the error and allow retry

### Requirement 7: Farmer Dashboard and Lot Creation

**User Story:** As a Farmer, I want to create coffee lots with demo autofill, edit lot details, and publish lots to the marketplace, so that Partners can discover and fund my lots.

#### Acceptance Criteria

1. THE Farmer_Dashboard SHALL display a home screen showing the connected wallet address, Farmer role PDA, and a list of the farmer's lots from Convex
2. WHEN the Farmer taps "Create lot", THE Native_App SHALL navigate to the lot editor screen with empty fields
3. WHEN the Farmer taps "Autofill Zafiro demo lot", THE Native_App SHALL populate the form with: lotCode=HV-HN-ZAF-L02, farmName=Zafiro, country=Honduras, region=Comayagua, latitude=14.9465, longitude=-88.0863, altitudeMeters=1300, variety=Parainema, areaManzanas=1.0, ticketUsdc=3425, farmerShareBps=6000, partnerShareBps=4000
4. WHEN the Farmer saves a lot draft, THE Native_App SHALL call the Convex_Backend `lots.createDraft` mutation to persist the lot data
5. WHEN the Farmer taps "Publish lot", THE Native_App SHALL compute manifest hashes, construct a `create_lot` or `publish_lot` Solana transaction, and present it for MWA signing
6. WHEN the publish transaction confirms, THE Native_App SHALL call Convex_Backend mutations to record the lot PDA, transaction signature, and update status to published
7. THE lot editor SHALL include fields for: lot code, farm name, country, region, latitude, longitude, altitude, variety, area in manzanas, ticket USDC, farmer share BPS, and partner share BPS

### Requirement 8: Partner Dashboard and Lot Catalog

**User Story:** As a Partner, I want to browse published lots, view lot details with on-chain verification, and reserve partnerships by signing Solana transactions, so that I can invest in verified coffee lots.

#### Acceptance Criteria

1. THE Partner_Dashboard SHALL display a lot catalog listing all lots with status "published" from the Convex_Backend
2. WHEN the Partner taps a lot card, THE Native_App SHALL navigate to a lot detail screen showing: farm name, variety, location, ticket amount, share split, on-chain lot PDA address, and farmer wallet
3. THE lot detail screen SHALL display whether the on-chain Lot_PDA exists and matches the Convex data
4. WHEN the Partner taps "Reserve partnership", THE Native_App SHALL navigate to a partnership review screen showing the terms hash and settlement preview
5. WHEN the Partner confirms reservation, THE Native_App SHALL construct a `reserve_partnership` transaction and present it for MWA signing
6. WHEN the reservation transaction confirms, THE Native_App SHALL call Convex_Backend mutations to record the partnership PDA, transaction signature, and update status
7. THE Partner_Dashboard SHALL include a settlement preview screen displaying: revenue = 6qq × 83.3 lb/qq × $3.50 = $1,750, cost = $1,490, profit = $260, farmer 60% = $156, partner 40% = $104
8. WHEN a partnership reservation is constructed, THE Native_App SHALL compute the terms hash from canonical JSON containing: lot PDA, farmer wallet, partner wallet, ticket_usdc_cents, farmer_share_bps, partner_share_bps, lot metadata hash, plan hash, and a timestamp

### Requirement 9: Convex Backend Schema and Core Functions

**User Story:** As a developer, I want a Convex backend with typed schema, queries, and mutations for users, lots, partnerships, and profiles, so that the mobile app has a reliable off-chain data layer.

#### Acceptance Criteria

1. THE Convex_Backend SHALL define a `users` table with fields: wallet, role, rolePda, roleTx, createdAt, updatedAt, indexed by wallet
2. THE Convex_Backend SHALL define a `lots` table with fields: lotCode, lotPda, farmerWallet, status, farmName, variety, region, country, latitude, longitude, altitudeMeters, areaManzanas, ticketUsdcCents, farmerShareBps, partnerShareBps, metadataHash, planHash, mediaManifestHash, sensorManifestHash, createdAt, updatedAt, indexed by lotCode, farmerWallet, and status
3. THE Convex_Backend SHALL define a `partnerships` table with fields: partnershipPda, lotCode, lotPda, farmerWallet, partnerWallet, termsHash, reserveTx, status, createdAt, updatedAt, indexed by partnerWallet and lotCode
4. THE Convex_Backend SHALL define a `farmerProfiles` table with fields: wallet, farmerProfilePda, displayName, bio, country, region, metadataHash, createdAt, updatedAt, indexed by wallet
5. THE Convex_Backend SHALL define a `partnerProfiles` table with fields: wallet, partnerProfilePda, displayName, organization, metadataHash, createdAt, updatedAt, indexed by wallet
6. THE Convex_Backend SHALL define a `lotMedia` table with fields: lotCode, storageId, kind, caption, hash, createdAt, indexed by lotCode
7. THE Convex_Backend SHALL define a `sensorSnapshots` table with fields: lotCode, source, temperatureC, humidityPct, soilPh, soilMoisturePct, payload, hash, createdAt, indexed by lotCode
8. THE Convex_Backend SHALL expose a `users.upsertAfterWalletConnect` mutation that creates or updates a user record idempotently by wallet address
9. FOR ALL wallet addresses, calling `users.upsertAfterWalletConnect` multiple times with the same wallet SHALL result in exactly one user record (idempotent upsert)
10. THE Convex_Backend SHALL expose a `lots.listPublished` query that returns all lots with status "published"
11. THE Convex_Backend SHALL expose a `lots.createDraft` mutation that creates a new lot in "draft" status
12. THE Convex_Backend SHALL expose a `partnerships.createPendingReservation` mutation that creates a partnership record linked to a lot and partner wallet
13. THE Convex_Backend SHALL define an `agronomicPlans` table with fields: lotCode, planId, planJson, hash, createdAt, indexed by lotCode
14. THE Convex_Backend SHALL define an `auditEvents` table with fields: actorWallet, kind, entityType, entityId, data, createdAt, indexed by entityType and entityId
15. THE Convex_Backend SHALL expose a `users.getByWallet(wallet)` query that returns the user record for a given wallet address
16. THE Convex_Backend SHALL expose a `lots.getByCode(lotCode)` query that returns the lot record for a given lot code
17. THE Convex_Backend SHALL expose a `lots.listByFarmer(wallet)` query that returns all lots belonging to a farmer wallet
18. THE Convex_Backend SHALL expose a `lots.applyDemoAutofill(lotCode)` mutation that applies Zafiro demo data to an existing draft lot
19. THE Convex_Backend SHALL expose a `lots.recordOnChainLot(lotCode, lotPda, tx)` mutation that records the on-chain lot PDA address and creation transaction signature
20. THE Convex_Backend SHALL expose a `lots.markPublished(lotCode, tx)` mutation that updates the lot status to published with the transaction signature
21. THE Convex_Backend SHALL expose a `partnerships.recordReservationTx(partnershipId, partnershipPda, tx)` mutation that records the partnership PDA and reservation transaction signature
22. THE Convex_Backend SHALL expose a `partnerships.listByPartner(wallet)` query that returns all partnerships for a given partner wallet

### Requirement 10: Farmer Profile Creation

**User Story:** As a Farmer, I want to create an on-chain profile anchored to my wallet, so that Partners can verify my identity through the Solana program.

#### Acceptance Criteria

1. WHEN a Farmer submits profile information, THE Native_App SHALL call `create_farmer_profile` via a Solana transaction with the metadata hash
2. THE Harvverse_Program SHALL create a FarmerProfile_PDA with seeds `["farmer", farmer_wallet]` containing the farmer's public key and metadata hash
3. IF the signer does not have a UserRole_PDA with Farmer role, THEN THE Harvverse_Program SHALL reject with error `InvalidRole`
4. WHEN the profile transaction confirms, THE Native_App SHALL save the profile details (displayName, bio, country, region) to the Convex_Backend `farmerProfiles` table
5. THE Solana_Client SHALL export a `deriveFarmerProfilePda(farmer)` function that returns the deterministic FarmerProfile PDA address

### Requirement 11: Program Configuration Initialization

**User Story:** As the program deployer, I want to initialize the program configuration with an authority and treasury, so that the program can enforce admin constraints.

#### Acceptance Criteria

1. WHEN `initialize_config` is called by the authority, THE Harvverse_Program SHALL create a ProgramConfig PDA with seeds `["config"]` containing the authority pubkey, treasury pubkey, and role_registration_enabled flag set to true
2. IF the ProgramConfig PDA already exists, THEN THE Harvverse_Program SHALL reject the instruction
3. THE Harvverse_Program SHALL require the authority to be a signer of `initialize_config`

### Requirement 12: Expo Router Role-Based Navigation

**User Story:** As a mobile user, I want the app navigation to enforce role-based access, so that Farmers cannot access Partner screens and Partners cannot access Farmer screens.

#### Acceptance Criteria

1. THE Native_App SHALL use expo-router with route groups: `(farmer)` for Farmer screens and `(partner)` for Partner screens
2. WHILE a wallet with Farmer role is connected, THE Native_App SHALL restrict navigation to Farmer route group only
3. WHILE a wallet with Partner role is connected, THE Native_App SHALL restrict navigation to Partner route group only
4. WHEN a wallet disconnects, THE Native_App SHALL navigate back to the wallet connection screen
5. THE Native_App SHALL define routes matching: farmer/home, farmer/lots, farmer/lots/new, farmer/lots/[lotCode]/edit, farmer/lots/[lotCode]/publish-review, partner/home, partner/catalog, partner/lots/[lotCode], partner/lots/[lotCode]/reserve, partner/partnerships/[partnershipId], partner/partnerships/[partnershipId]/settlement

### Requirement 13: Demo Autofill for Agronomic Plan and Sensor Snapshot

**User Story:** As a Farmer using the demo, I want autofill buttons for agronomic plan and sensor snapshot data, so that I can quickly demonstrate the full lot creation flow without manual data entry.

#### Acceptance Criteria

1. WHEN the Farmer taps "Autofill agronomic plan", THE Native_App SHALL populate the plan reference field with a demo agronomic plan ID and summary text
2. WHEN the Farmer taps "Autofill demo sensor snapshot", THE Native_App SHALL populate sensor fields with demo values: source=demo_autofill, and representative temperature, humidity, soil pH, and soil moisture values
3. WHEN autofill is used, THE Native_App SHALL save the autofilled data to the Convex_Backend `sensorSnapshots` table with source field set to "demo_autofill"
4. THE Native_App SHALL visually label autofill buttons as demo helpers so they are not mistaken for real automation

### Requirement 14: Data Integrity via Manifest Hashing

**User Story:** As a system participant, I want off-chain data to be anchored on-chain via SHA-256 hashes, so that the integrity of lot metadata, plans, media, and sensor data can be verified against the blockchain.

#### Acceptance Criteria

1. WHEN a lot is published, THE Native_App SHALL compute a metadata manifest hash from canonical JSON of the lot's core fields (lotCode, farmName, farmerWallet, location, variety, areaManzanas)
2. WHEN a lot is published, THE Native_App SHALL compute a plan hash from the agronomic plan data
3. WHEN a lot is published, THE Native_App SHALL compute a media manifest hash from the lot's media references
4. WHEN a lot is published, THE Native_App SHALL compute a sensor manifest hash from the lot's sensor snapshot data
5. THE Harvverse_Program SHALL store all hash fields as `[u8; 32]` and reject any hash field that is all zeros via error `EmptyHash`
6. FOR ALL valid lot metadata objects, computing the manifest hash and then verifying it against the on-chain stored hash SHALL confirm data integrity (hash verification round-trip)

### Requirement 15: Partner Profile Creation

**User Story:** As a Partner, I want to create an on-chain profile anchored to my wallet, so that Farmers and the program can verify my identity before I reserve partnerships.

#### Acceptance Criteria

1. WHEN a Partner submits profile information, THE Native_App SHALL call `create_partner_profile` via a Solana transaction with the metadata hash
2. THE Harvverse_Program SHALL create a PartnerProfile_PDA with seeds `["partner", partner_wallet]` containing the partner's public key and metadata hash
3. IF the signer does not have a UserRole_PDA with Partner role, THEN THE Harvverse_Program SHALL reject with error `InvalidRole`
4. WHEN the profile transaction confirms, THE Native_App SHALL save the profile details (displayName, organization) to the Convex_Backend `partnerProfiles` table
5. THE Solana_Client SHALL export a `derivePartnerProfilePda(partner)` function that returns the deterministic PartnerProfile PDA address

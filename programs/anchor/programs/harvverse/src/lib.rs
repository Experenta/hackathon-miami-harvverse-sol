use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::create_farmer_profile::*;
pub use instructions::create_lot::*;
pub use instructions::create_partner_profile::*;
pub use instructions::initialize_config::*;
pub use instructions::publish_lot::*;
pub use instructions::record_milestone::*;
pub use instructions::record_settlement::*;
pub use instructions::register_role::*;
pub use instructions::reserve_partnership::*;
pub use instructions::update_lot_hashes::*;

declare_id!("Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP");

/// Input struct for create_lot instruction.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateLotInput {
    pub lot_id_hash: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub plan_hash: [u8; 32],
    pub media_manifest_hash: [u8; 32],
    pub sensor_manifest_hash: [u8; 32],
    pub ticket_usdc_cents: u64,
    pub farmer_share_bps: u16,
    pub partner_share_bps: u16,
}

/// Input struct for update_lot_hashes instruction.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateLotHashesInput {
    pub metadata_hash: Option<[u8; 32]>,
    pub plan_hash: Option<[u8; 32]>,
    pub media_manifest_hash: Option<[u8; 32]>,
    pub sensor_manifest_hash: Option<[u8; 32]>,
}

/// Input struct for record_settlement instruction.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SettlementInput {
    pub yield_qq: u16,
    pub price_per_lb_cents: u32,
    pub revenue_usdc_cents: u64,
    pub cost_usdc_cents: u64,
    pub profit_usdc_cents: u64,
    pub farmer_share_usdc_cents: u64,
    pub partner_share_usdc_cents: u64,
    pub settlement_hash: [u8; 32],
}

/// Role kind enum for register_role instruction.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum RoleKind {
    Farmer,
    Partner,
}

#[program]
pub mod harvverse {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, treasury: Pubkey) -> Result<()> {
        instructions::initialize_config::handler(ctx, treasury)
    }

    pub fn register_role(ctx: Context<RegisterRole>, role: RoleKind) -> Result<()> {
        instructions::register_role::handler(ctx, role)
    }

    pub fn create_farmer_profile(
        ctx: Context<CreateFarmerProfile>,
        display_name_hash: [u8; 32],
        metadata_uri_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_farmer_profile::handler(ctx, display_name_hash, metadata_uri_hash)
    }

    pub fn create_partner_profile(
        ctx: Context<CreatePartnerProfile>,
        display_name_hash: [u8; 32],
        metadata_uri_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_partner_profile::handler(ctx, display_name_hash, metadata_uri_hash)
    }

    pub fn create_lot(ctx: Context<CreateLot>, input: CreateLotInput) -> Result<()> {
        instructions::create_lot::handler(ctx, input)
    }

    pub fn publish_lot(ctx: Context<PublishLot>) -> Result<()> {
        instructions::publish_lot::handler(ctx)
    }

    pub fn update_lot_hashes(ctx: Context<UpdateLotHashes>, input: UpdateLotHashesInput) -> Result<()> {
        instructions::update_lot_hashes::handler(ctx, input)
    }

    pub fn reserve_partnership(ctx: Context<ReservePartnership>, terms_hash: [u8; 32]) -> Result<()> {
        instructions::reserve_partnership::handler(ctx, terms_hash)
    }

    pub fn record_milestone(
        ctx: Context<RecordMilestone>,
        milestone_index: u8,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        instructions::record_milestone::handler(ctx, milestone_index, proof_hash)
    }

    pub fn record_settlement(ctx: Context<RecordSettlement>, input: SettlementInput) -> Result<()> {
        instructions::record_settlement::handler(ctx, input)
    }
}

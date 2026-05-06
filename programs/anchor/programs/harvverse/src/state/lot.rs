use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum LotStatus {
    Draft,
    Published,
    Reserved,
    InCycle,
    Settled,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
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

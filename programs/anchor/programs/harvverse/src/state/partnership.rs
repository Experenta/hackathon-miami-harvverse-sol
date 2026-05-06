use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum PartnershipStatus {
    Reserved,
    Active,
    Settled,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
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

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct FarmerProfile {
    pub farmer: Pubkey,
    pub display_name_hash: [u8; 32],
    pub metadata_uri_hash: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}

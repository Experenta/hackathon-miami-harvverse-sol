use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PartnershipEscrow {
    pub partnership: Pubkey,
    pub mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub deposited_amount: u64,
    pub released_amount: u64,
    pub release_amounts: [u64; 6],
    pub released_bitmap: u8,
    pub reserve_amount: u64,
    pub created_at: i64,
    pub bump: u8,
    pub vault_authority_bump: u8,
}

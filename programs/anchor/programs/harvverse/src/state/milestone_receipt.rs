use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MilestoneReceipt {
    pub partnership: Pubkey,
    pub milestone_index: u8,
    pub proof_hash: [u8; 32],
    pub recorded_by: Pubkey,
    pub recorded_at: i64,
    pub bump: u8,
}

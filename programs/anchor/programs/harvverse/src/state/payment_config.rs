use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PaymentConfig {
    pub authority: Pubkey,
    pub mock_usdc_mint: Pubkey,
    pub faucet_amount: u64,
    pub decimals: u8,
    pub bump: u8,
    pub mint_authority_bump: u8,
}

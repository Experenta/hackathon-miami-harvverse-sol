use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct SettlementReceipt {
    pub partnership: Pubkey,
    pub yield_qq: u16,
    pub price_per_lb_cents: u32,
    pub revenue_usdc_cents: u64,
    pub cost_usdc_cents: u64,
    pub profit_usdc_cents: u64,
    pub farmer_share_usdc_cents: u64,
    pub partner_share_usdc_cents: u64,
    pub settlement_hash: [u8; 32],
    pub settled_at: i64,
    pub bump: u8,
}

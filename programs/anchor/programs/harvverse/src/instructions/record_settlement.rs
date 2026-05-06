use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::events::SettlementRecorded;
use crate::state::*;
use crate::SettlementInput;

#[derive(Accounts)]
pub struct RecordSettlement<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = program_config.bump,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        mut,
        constraint = partnership.status == PartnershipStatus::Reserved
            || partnership.status == PartnershipStatus::Active,
    )]
    pub partnership: Account<'info, Partnership>,

    #[account(
        mut,
        constraint = lot.key() == partnership.lot,
    )]
    pub lot: Account<'info, Lot>,

    #[account(
        init,
        payer = signer,
        space = 8 + SettlementReceipt::INIT_SPACE,
        seeds = [b"settlement", partnership.key().as_ref()],
        bump,
    )]
    pub settlement_receipt: Account<'info, SettlementReceipt>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RecordSettlement>, input: SettlementInput) -> Result<()> {
    let signer_key = ctx.accounts.signer.key();

    require!(
        signer_key == ctx.accounts.partnership.farmer
            || signer_key == ctx.accounts.program_config.authority,
        HarvverseError::InvalidSettlementSigner
    );

    let partnership_key = ctx.accounts.partnership.key();

    let settlement_receipt = &mut ctx.accounts.settlement_receipt;
    settlement_receipt.partnership = partnership_key;
    settlement_receipt.yield_qq = input.yield_qq;
    settlement_receipt.price_per_lb_cents = input.price_per_lb_cents;
    settlement_receipt.revenue_usdc_cents = input.revenue_usdc_cents;
    settlement_receipt.cost_usdc_cents = input.cost_usdc_cents;
    settlement_receipt.profit_usdc_cents = input.profit_usdc_cents;
    settlement_receipt.farmer_share_usdc_cents = input.farmer_share_usdc_cents;
    settlement_receipt.partner_share_usdc_cents = input.partner_share_usdc_cents;
    settlement_receipt.settlement_hash = input.settlement_hash;
    settlement_receipt.settled_at = Clock::get()?.unix_timestamp;
    settlement_receipt.bump = ctx.bumps.settlement_receipt;

    ctx.accounts.partnership.status = PartnershipStatus::Settled;

    let lot = &mut ctx.accounts.lot;
    lot.status = LotStatus::Settled;
    lot.updated_at = Clock::get()?.unix_timestamp;

    emit!(SettlementRecorded {
        partnership_pda: partnership_key,
        settlement_hash: input.settlement_hash,
    });

    Ok(())
}

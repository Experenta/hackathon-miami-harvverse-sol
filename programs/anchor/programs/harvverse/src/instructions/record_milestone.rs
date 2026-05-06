use anchor_lang::prelude::*;

use crate::events::MilestoneRecorded;
use crate::state::*;

#[derive(Accounts)]
#[instruction(milestone_index: u8, proof_hash: [u8; 32])]
pub struct RecordMilestone<'info> {
    #[account(mut)]
    pub recorder: Signer<'info>,

    #[account(
        constraint = partnership.status == PartnershipStatus::Reserved
            || partnership.status == PartnershipStatus::Active,
    )]
    pub partnership: Account<'info, Partnership>,

    #[account(
        init,
        payer = recorder,
        space = 8 + MilestoneReceipt::INIT_SPACE,
        seeds = [b"milestone", partnership.key().as_ref(), &[milestone_index]],
        bump,
    )]
    pub milestone_receipt: Account<'info, MilestoneReceipt>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RecordMilestone>,
    milestone_index: u8,
    proof_hash: [u8; 32],
) -> Result<()> {
    let milestone_receipt = &mut ctx.accounts.milestone_receipt;

    milestone_receipt.partnership = ctx.accounts.partnership.key();
    milestone_receipt.milestone_index = milestone_index;
    milestone_receipt.proof_hash = proof_hash;
    milestone_receipt.recorded_by = ctx.accounts.recorder.key();
    milestone_receipt.recorded_at = Clock::get()?.unix_timestamp;
    milestone_receipt.bump = ctx.bumps.milestone_receipt;

    emit!(MilestoneRecorded {
        partnership_pda: ctx.accounts.partnership.key(),
        milestone_index,
        proof_hash,
    });

    Ok(())
}

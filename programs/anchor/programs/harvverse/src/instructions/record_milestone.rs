use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::events::MilestoneRecorded;
use crate::state::*;

#[derive(Accounts)]
#[instruction(milestone_index: u8, proof_hash: [u8; 32])]
pub struct RecordMilestone<'info> {
    #[account(mut)]
    pub recorder: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = program_config.bump,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    #[account(
        constraint = partnership.status == PartnershipStatus::Active @ HarvverseError::InvalidLotStatus,
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
    require!(
        (1..=6).contains(&milestone_index),
        HarvverseError::InvalidMilestoneIndex
    );
    require!(proof_hash != [0u8; 32], HarvverseError::EmptyHash);

    let recorder_key = ctx.accounts.recorder.key();
    require!(
        recorder_key == ctx.accounts.partnership.farmer
            || recorder_key == ctx.accounts.program_config.authority,
        HarvverseError::InvalidMilestoneSigner
    );

    let milestone_receipt = &mut ctx.accounts.milestone_receipt;
    let timestamp = Clock::get()?.unix_timestamp;

    milestone_receipt.partnership = ctx.accounts.partnership.key();
    milestone_receipt.milestone_index = milestone_index;
    milestone_receipt.proof_hash = proof_hash;
    milestone_receipt.recorded_by = recorder_key;
    milestone_receipt.recorded_at = timestamp;
    milestone_receipt.bump = ctx.bumps.milestone_receipt;

    emit!(MilestoneRecorded {
        partnership_pda: ctx.accounts.partnership.key(),
        milestone_index,
        proof_hash,
        recorder: recorder_key,
        timestamp,
    });

    Ok(())
}

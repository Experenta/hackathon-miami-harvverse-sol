use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::events::LotPublished;
use crate::state::*;

#[derive(Accounts)]
pub struct PublishLot<'info> {
    pub farmer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lot", farmer.key().as_ref(), lot.lot_id_hash.as_ref()],
        bump = lot.bump,
        constraint = lot.status == LotStatus::Draft @ HarvverseError::InvalidLotStatus,
    )]
    pub lot: Account<'info, Lot>,
}

pub fn handler(ctx: Context<PublishLot>) -> Result<()> {
    let lot = &mut ctx.accounts.lot;
    lot.status = LotStatus::Published;
    lot.updated_at = Clock::get()?.unix_timestamp;

    emit!(LotPublished {
        lot_pda: lot.key(),
        farmer: ctx.accounts.farmer.key(),
    });

    Ok(())
}

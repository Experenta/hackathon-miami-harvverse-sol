use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::state::*;
use crate::UpdateLotHashesInput;

#[derive(Accounts)]
pub struct UpdateLotHashes<'info> {
    pub farmer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lot", farmer.key().as_ref(), lot.lot_id_hash.as_ref()],
        bump = lot.bump,
        constraint = lot.status == LotStatus::Draft || lot.status == LotStatus::Published @ HarvverseError::InvalidLotStatus,
    )]
    pub lot: Account<'info, Lot>,
}

pub fn handler(ctx: Context<UpdateLotHashes>, input: UpdateLotHashesInput) -> Result<()> {
    let lot = &mut ctx.accounts.lot;

    if let Some(metadata_hash) = input.metadata_hash {
        lot.metadata_hash = metadata_hash;
    }
    if let Some(plan_hash) = input.plan_hash {
        lot.plan_hash = plan_hash;
    }
    if let Some(media_manifest_hash) = input.media_manifest_hash {
        lot.media_manifest_hash = media_manifest_hash;
    }
    if let Some(sensor_manifest_hash) = input.sensor_manifest_hash {
        lot.sensor_manifest_hash = sensor_manifest_hash;
    }

    lot.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
}

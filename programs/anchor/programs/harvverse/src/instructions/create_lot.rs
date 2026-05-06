use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::events::LotCreated;
use crate::state::*;
use crate::{CreateLotInput, RoleKind};

#[derive(Accounts)]
#[instruction(input: CreateLotInput)]
pub struct CreateLot<'info> {
    #[account(mut)]
    pub farmer: Signer<'info>,

    #[account(
        seeds = [b"role", farmer.key().as_ref()],
        bump = user_role.bump,
        constraint = user_role.role == RoleKind::Farmer @ HarvverseError::InvalidRole,
    )]
    pub user_role: Account<'info, UserRole>,

    #[account(
        seeds = [b"farmer", farmer.key().as_ref()],
        bump = farmer_profile.bump,
    )]
    pub farmer_profile: Account<'info, FarmerProfile>,

    #[account(
        init,
        payer = farmer,
        space = 8 + Lot::INIT_SPACE,
        seeds = [b"lot", farmer.key().as_ref(), input.lot_id_hash.as_ref()],
        bump,
    )]
    pub lot: Account<'info, Lot>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateLot>, input: CreateLotInput) -> Result<()> {
    require!(
        input.farmer_share_bps + input.partner_share_bps == 10000,
        HarvverseError::InvalidShareSplit
    );
    require!(input.ticket_usdc_cents > 0, HarvverseError::InvalidShareSplit);

    let lot = &mut ctx.accounts.lot;
    lot.farmer = ctx.accounts.farmer.key();
    lot.lot_id_hash = input.lot_id_hash;
    lot.metadata_hash = input.metadata_hash;
    lot.plan_hash = input.plan_hash;
    lot.media_manifest_hash = input.media_manifest_hash;
    lot.sensor_manifest_hash = input.sensor_manifest_hash;
    lot.ticket_usdc_cents = input.ticket_usdc_cents;
    lot.farmer_share_bps = input.farmer_share_bps;
    lot.partner_share_bps = input.partner_share_bps;
    lot.status = LotStatus::Draft;
    lot.created_at = Clock::get()?.unix_timestamp;
    lot.updated_at = lot.created_at;
    lot.bump = ctx.bumps.lot;

    emit!(LotCreated {
        lot_pda: lot.key(),
        farmer: ctx.accounts.farmer.key(),
        lot_id_hash: input.lot_id_hash,
    });

    Ok(())
}

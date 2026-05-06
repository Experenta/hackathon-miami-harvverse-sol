use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::state::*;
use crate::RoleKind;

#[derive(Accounts)]
pub struct CreateFarmerProfile<'info> {
    #[account(mut)]
    pub farmer: Signer<'info>,

    #[account(
        seeds = [b"role", farmer.key().as_ref()],
        bump = user_role.bump,
        constraint = user_role.role == RoleKind::Farmer @ HarvverseError::InvalidRole,
    )]
    pub user_role: Account<'info, UserRole>,

    #[account(
        init,
        payer = farmer,
        space = 8 + FarmerProfile::INIT_SPACE,
        seeds = [b"farmer", farmer.key().as_ref()],
        bump,
    )]
    pub farmer_profile: Account<'info, FarmerProfile>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateFarmerProfile>,
    display_name_hash: [u8; 32],
    metadata_uri_hash: [u8; 32],
) -> Result<()> {
    let farmer_profile = &mut ctx.accounts.farmer_profile;
    farmer_profile.farmer = ctx.accounts.farmer.key();
    farmer_profile.display_name_hash = display_name_hash;
    farmer_profile.metadata_uri_hash = metadata_uri_hash;
    farmer_profile.created_at = Clock::get()?.unix_timestamp;
    farmer_profile.bump = ctx.bumps.farmer_profile;

    Ok(())
}

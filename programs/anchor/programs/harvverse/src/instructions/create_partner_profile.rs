use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::state::*;
use crate::RoleKind;

#[derive(Accounts)]
pub struct CreatePartnerProfile<'info> {
    #[account(mut)]
    pub partner: Signer<'info>,

    #[account(
        seeds = [b"role", partner.key().as_ref()],
        bump = user_role.bump,
        constraint = user_role.role == RoleKind::Partner @ HarvverseError::InvalidRole,
    )]
    pub user_role: Account<'info, UserRole>,

    #[account(
        init,
        payer = partner,
        space = 8 + PartnerProfile::INIT_SPACE,
        seeds = [b"partner", partner.key().as_ref()],
        bump,
    )]
    pub partner_profile: Account<'info, PartnerProfile>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreatePartnerProfile>,
    display_name_hash: [u8; 32],
    metadata_uri_hash: [u8; 32],
) -> Result<()> {
    let partner_profile = &mut ctx.accounts.partner_profile;
    partner_profile.partner = ctx.accounts.partner.key();
    partner_profile.display_name_hash = display_name_hash;
    partner_profile.metadata_uri_hash = metadata_uri_hash;
    partner_profile.created_at = Clock::get()?.unix_timestamp;
    partner_profile.bump = ctx.bumps.partner_profile;

    Ok(())
}

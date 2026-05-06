use anchor_lang::prelude::*;

use crate::errors::HarvverseError;
use crate::events::PartnershipReserved;
use crate::state::*;
use crate::RoleKind;

#[derive(Accounts)]
pub struct ReservePartnership<'info> {
    #[account(mut)]
    pub partner: Signer<'info>,

    #[account(
        seeds = [b"role", partner.key().as_ref()],
        bump = user_role.bump,
        constraint = user_role.role == RoleKind::Partner @ HarvverseError::InvalidRole,
    )]
    pub user_role: Account<'info, UserRole>,

    #[account(
        seeds = [b"partner", partner.key().as_ref()],
        bump = partner_profile.bump,
    )]
    pub partner_profile: Account<'info, PartnerProfile>,

    #[account(
        mut,
        constraint = lot.status == LotStatus::Published @ HarvverseError::InvalidLotStatus,
    )]
    pub lot: Account<'info, Lot>,

    #[account(
        init,
        payer = partner,
        space = 8 + Partnership::INIT_SPACE,
        seeds = [b"partnership", lot.key().as_ref(), partner.key().as_ref()],
        bump,
    )]
    pub partnership: Account<'info, Partnership>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ReservePartnership>, terms_hash: [u8; 32]) -> Result<()> {
    let partnership = &mut ctx.accounts.partnership;
    let lot = &mut ctx.accounts.lot;

    partnership.lot = lot.key();
    partnership.farmer = lot.farmer;
    partnership.partner = ctx.accounts.partner.key();
    partnership.terms_hash = terms_hash;
    partnership.ticket_usdc_cents = lot.ticket_usdc_cents;
    partnership.status = PartnershipStatus::Reserved;
    partnership.reserved_at = Clock::get()?.unix_timestamp;
    partnership.bump = ctx.bumps.partnership;

    lot.status = LotStatus::Reserved;
    lot.updated_at = Clock::get()?.unix_timestamp;

    emit!(PartnershipReserved {
        partnership_pda: partnership.key(),
        lot_pda: lot.key(),
        farmer: lot.farmer,
        partner: ctx.accounts.partner.key(),
        ticket_usdc_cents: lot.ticket_usdc_cents,
    });

    Ok(())
}

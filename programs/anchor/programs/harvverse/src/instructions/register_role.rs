use anchor_lang::prelude::*;

use crate::events::*;
use crate::state::*;
use crate::RoleKind;

#[derive(Accounts)]
pub struct RegisterRole<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        init,
        payer = wallet,
        space = 8 + UserRole::INIT_SPACE,
        seeds = [b"role", wallet.key().as_ref()],
        bump,
    )]
    pub user_role: Account<'info, UserRole>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterRole>, role: RoleKind) -> Result<()> {
    let user_role = &mut ctx.accounts.user_role;
    user_role.wallet = ctx.accounts.wallet.key();
    user_role.role = role.clone();
    user_role.created_at = Clock::get()?.unix_timestamp;
    user_role.bump = ctx.bumps.user_role;

    emit!(RoleRegistered {
        wallet: ctx.accounts.wallet.key(),
        role,
        timestamp: user_role.created_at,
    });

    Ok(())
}

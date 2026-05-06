use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub program_config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>, treasury: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.program_config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = treasury;
    config.role_registration_enabled = true;
    config.bump = ctx.bumps.program_config;
    Ok(())
}

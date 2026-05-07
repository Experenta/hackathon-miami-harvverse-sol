use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::errors::HarvverseError;
use crate::events::MockUsdcInitialized;
use crate::state::*;
use crate::InitializeMockUsdcInput;

const MOCK_USDC_DECIMALS: u8 = 6;
const DEMO_TICKET_BASE_UNITS: u64 = 3_425_000_000;

#[derive(Accounts)]
#[instruction(input: InitializeMockUsdcInput)]
pub struct InitializeMockUsdc<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = program_config.bump,
        constraint = program_config.authority == authority.key() @ HarvverseError::InvalidAuthority,
    )]
    pub program_config: Box<Account<'info, ProgramConfig>>,

    #[account(
        init,
        payer = authority,
        space = 8 + PaymentConfig::INIT_SPACE,
        seeds = [b"payment_config"],
        bump,
    )]
    pub payment_config: Box<Account<'info, PaymentConfig>>,

    #[account(
        init,
        payer = authority,
        mint::decimals = input.decimals,
        mint::authority = mock_usdc_mint_authority,
        mint::freeze_authority = mock_usdc_mint_authority,
        seeds = [b"mock_usdc_mint"],
        bump,
    )]
    pub mock_usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        seeds = [b"mock_usdc_mint_authority"],
        bump,
    )]
    /// CHECK: PDA authority used only as a CPI signer for the mockUSDC mint.
    pub mock_usdc_mint_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeMockUsdc>, input: InitializeMockUsdcInput) -> Result<()> {
    require!(
        input.decimals == MOCK_USDC_DECIMALS,
        HarvverseError::InvalidMockUsdcMint
    );
    require!(
        input.faucet_amount > DEMO_TICKET_BASE_UNITS,
        HarvverseError::InvalidFaucetAmount
    );

    let payment_config = &mut ctx.accounts.payment_config;
    payment_config.authority = ctx.accounts.authority.key();
    payment_config.mock_usdc_mint = ctx.accounts.mock_usdc_mint.key();
    payment_config.faucet_amount = input.faucet_amount;
    payment_config.decimals = input.decimals;
    payment_config.bump = ctx.bumps.payment_config;
    payment_config.mint_authority_bump = ctx.bumps.mock_usdc_mint_authority;

    emit!(MockUsdcInitialized {
        mint: ctx.accounts.mock_usdc_mint.key(),
        authority: ctx.accounts.authority.key(),
        decimals: input.decimals,
        faucet_amount: input.faucet_amount,
    });

    Ok(())
}

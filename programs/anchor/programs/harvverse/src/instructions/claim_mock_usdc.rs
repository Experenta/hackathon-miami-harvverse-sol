use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::errors::HarvverseError;
use crate::events::MockUsdcClaimed;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimMockUsdc<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        seeds = [b"payment_config"],
        bump = payment_config.bump,
    )]
    pub payment_config: Box<Account<'info, PaymentConfig>>,

    #[account(
        mut,
        constraint = mock_usdc_mint.key() == payment_config.mock_usdc_mint @ HarvverseError::InvalidMockUsdcMint,
        constraint = mock_usdc_mint.decimals == payment_config.decimals @ HarvverseError::InvalidMockUsdcMint,
    )]
    pub mock_usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        seeds = [b"mock_usdc_mint_authority"],
        bump = payment_config.mint_authority_bump,
    )]
    /// CHECK: PDA authority used only as a CPI signer for the mockUSDC mint.
    pub mock_usdc_mint_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mock_usdc_mint,
        associated_token::authority = claimant,
    )]
    pub claimant_mock_usdc_ata: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<ClaimMockUsdc>) -> Result<()> {
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"mock_usdc_mint_authority",
        &[ctx.accounts.payment_config.mint_authority_bump],
    ]];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mock_usdc_mint.to_account_info(),
                to: ctx.accounts.claimant_mock_usdc_ata.to_account_info(),
                authority: ctx.accounts.mock_usdc_mint_authority.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.payment_config.faucet_amount,
    )?;

    emit!(MockUsdcClaimed {
        claimant: ctx.accounts.claimant.key(),
        mint: ctx.accounts.mock_usdc_mint.key(),
        amount: ctx.accounts.payment_config.faucet_amount,
    });

    Ok(())
}

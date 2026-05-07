use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};

use crate::errors::HarvverseError;
use crate::events::FundsReleased;
use crate::state::*;
use crate::ReleaseMilestoneFundsInput;

#[derive(Accounts)]
pub struct ReleaseMilestoneFunds<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = program_config.bump,
    )]
    pub program_config: Box<Account<'info, ProgramConfig>>,

    #[account(
        mut,
        constraint = partnership.status == PartnershipStatus::Active @ HarvverseError::InvalidLotStatus,
    )]
    pub partnership: Box<Account<'info, Partnership>>,

    #[account(
        mut,
        seeds = [b"escrow", partnership.key().as_ref()],
        bump = partnership_escrow.bump,
        constraint = partnership_escrow.partnership == partnership.key() @ HarvverseError::InvalidPaymentConfig,
    )]
    pub partnership_escrow: Box<Account<'info, PartnershipEscrow>>,

    #[account(
        constraint = required_milestone_receipt.partnership == partnership.key() @ HarvverseError::InvalidMilestoneProof,
    )]
    pub required_milestone_receipt: Box<Account<'info, MilestoneReceipt>>,

    #[account(
        seeds = [b"vault_authority", partnership.key().as_ref()],
        bump = partnership_escrow.vault_authority_bump,
    )]
    /// CHECK: PDA authority used only as a CPI signer for the escrow vault.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = vault_token_account.key() == partnership_escrow.vault_token_account @ HarvverseError::InvalidTokenAccount,
        constraint = vault_token_account.mint == partnership_escrow.mint @ HarvverseError::InvalidTokenAccount,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mock_usdc_mint,
        associated_token::authority = partnership.farmer,
    )]
    pub farmer_mock_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = mock_usdc_mint.key() == partnership_escrow.mint @ HarvverseError::InvalidMockUsdcMint,
    )]
    pub mock_usdc_mint: Box<Account<'info, Mint>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<ReleaseMilestoneFunds>,
    input: ReleaseMilestoneFundsInput,
) -> Result<()> {
    let release_index = input.release_index;
    require!(
        (1..=5).contains(&release_index),
        HarvverseError::InvalidReleaseSchedule
    );

    let required_milestone_index = release_index + 1;
    require!(
        ctx.accounts.required_milestone_receipt.milestone_index == required_milestone_index,
        HarvverseError::InvalidMilestoneProof
    );

    let signer_key = ctx.accounts.signer.key();
    require!(
        signer_key == ctx.accounts.partnership.farmer
            || signer_key == ctx.accounts.program_config.authority,
        HarvverseError::InvalidReleaseSigner
    );

    let release_bit = 1u8 << release_index;
    require!(
        ctx.accounts.partnership_escrow.released_bitmap & release_bit == 0,
        HarvverseError::ReleaseAlreadyClaimed
    );

    let amount = ctx.accounts.partnership_escrow.release_amounts[release_index as usize];
    require!(
        ctx.accounts.vault_token_account.amount >= amount,
        HarvverseError::InsufficientVaultBalance
    );

    let partnership_key = ctx.accounts.partnership.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"vault_authority",
        partnership_key.as_ref(),
        &[ctx.accounts.partnership_escrow.vault_authority_bump],
    ]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault_token_account.to_account_info(),
                mint: ctx.accounts.mock_usdc_mint.to_account_info(),
                to: ctx.accounts.farmer_mock_usdc_ata.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.mock_usdc_mint.decimals,
    )?;

    let escrow = &mut ctx.accounts.partnership_escrow;
    escrow.released_bitmap |= release_bit;
    escrow.released_amount = escrow
        .released_amount
        .checked_add(amount)
        .ok_or(HarvverseError::MathOverflow)?;

    emit!(FundsReleased {
        partnership_pda: partnership_key,
        release_index,
        recipient: ctx.accounts.partnership.farmer,
        amount,
        released_amount: escrow.released_amount,
        vault_remaining: ctx
            .accounts
            .vault_token_account
            .amount
            .checked_sub(amount)
            .ok_or(HarvverseError::MathOverflow)?,
    });

    Ok(())
}

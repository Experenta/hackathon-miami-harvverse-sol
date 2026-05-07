use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};

use crate::errors::HarvverseError;
use crate::events::PartnershipReserved;
use crate::state::*;
use crate::{ReservePartnershipInput, RoleKind};

const CENTS_TO_MOCK_USDC_BASE_UNITS: u64 = 10_000;

#[derive(Accounts)]
pub struct ReservePartnership<'info> {
    #[account(mut)]
    pub partner: Signer<'info>,

    #[account(
        seeds = [b"role", partner.key().as_ref()],
        bump = user_role.bump,
        constraint = user_role.role == RoleKind::Partner @ HarvverseError::InvalidRole,
    )]
    pub user_role: Box<Account<'info, UserRole>>,

    #[account(
        seeds = [b"partner", partner.key().as_ref()],
        bump = partner_profile.bump,
    )]
    pub partner_profile: Box<Account<'info, PartnerProfile>>,

    #[account(
        mut,
        constraint = lot.status == LotStatus::Published @ HarvverseError::InvalidLotStatus,
    )]
    pub lot: Box<Account<'info, Lot>>,

    #[account(
        init,
        payer = partner,
        space = 8 + Partnership::INIT_SPACE,
        seeds = [b"partnership", lot.key().as_ref(), partner.key().as_ref()],
        bump,
    )]
    pub partnership: Box<Account<'info, Partnership>>,

    #[account(
        seeds = [b"payment_config"],
        bump = payment_config.bump,
    )]
    pub payment_config: Box<Account<'info, PaymentConfig>>,

    #[account(
        constraint = mock_usdc_mint.key() == payment_config.mock_usdc_mint @ HarvverseError::InvalidMockUsdcMint,
        constraint = mock_usdc_mint.decimals == payment_config.decimals @ HarvverseError::InvalidMockUsdcMint,
    )]
    pub mock_usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mock_usdc_mint,
        associated_token::authority = partner,
    )]
    pub partner_mock_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = partner,
        space = 8 + PartnershipEscrow::INIT_SPACE,
        seeds = [b"escrow", partnership.key().as_ref()],
        bump,
    )]
    pub partnership_escrow: Box<Account<'info, PartnershipEscrow>>,

    #[account(
        seeds = [b"vault_authority", partnership.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA authority used only as a CPI signer for the escrow vault.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = partner,
        associated_token::mint = mock_usdc_mint,
        associated_token::authority = vault_authority,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ReservePartnership>, input: ReservePartnershipInput) -> Result<()> {
    let lot_key = ctx.accounts.lot.key();
    let partnership_key = ctx.accounts.partnership.key();
    let partner_key = ctx.accounts.partner.key();
    let farmer_key = ctx.accounts.lot.farmer;
    let now = Clock::get()?.unix_timestamp;

    require!(
        input.ticket_usdc_cents == ctx.accounts.lot.ticket_usdc_cents,
        HarvverseError::InvalidTicketAmount
    );
    require!(
        input.ticket_usdc_cents > 0,
        HarvverseError::InvalidTicketAmount
    );

    let ticket_base_units = input
        .ticket_usdc_cents
        .checked_mul(CENTS_TO_MOCK_USDC_BASE_UNITS)
        .ok_or(HarvverseError::MathOverflow)?;

    let mut release_total = 0u64;
    for amount in input.release_amounts {
        release_total = release_total
            .checked_add(amount)
            .ok_or(HarvverseError::MathOverflow)?;
    }
    require!(
        release_total <= ticket_base_units,
        HarvverseError::InvalidReleaseSchedule
    );

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.partner_mock_usdc_ata.to_account_info(),
                mint: ctx.accounts.mock_usdc_mint.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.partner.to_account_info(),
            },
        ),
        ticket_base_units,
        ctx.accounts.payment_config.decimals,
    )?;

    let partnership = &mut ctx.accounts.partnership;
    partnership.lot = lot_key;
    partnership.farmer = farmer_key;
    partnership.partner = partner_key;
    partnership.terms_hash = input.terms_hash;
    partnership.ticket_usdc_cents = input.ticket_usdc_cents;
    partnership.status = PartnershipStatus::Active;
    partnership.reserved_at = now;
    partnership.bump = ctx.bumps.partnership;

    let escrow = &mut ctx.accounts.partnership_escrow;
    escrow.partnership = partnership_key;
    escrow.mint = ctx.accounts.mock_usdc_mint.key();
    escrow.vault_token_account = ctx.accounts.vault_token_account.key();
    escrow.deposited_amount = ticket_base_units;
    escrow.released_amount = 0;
    escrow.release_amounts = input.release_amounts;
    escrow.released_bitmap = 0;
    escrow.reserve_amount = ticket_base_units
        .checked_sub(release_total)
        .ok_or(HarvverseError::MathOverflow)?;
    escrow.created_at = now;
    escrow.bump = ctx.bumps.partnership_escrow;
    escrow.vault_authority_bump = ctx.bumps.vault_authority;

    let lot = &mut ctx.accounts.lot;
    lot.status = LotStatus::InCycle;
    lot.updated_at = now;

    emit!(PartnershipReserved {
        partnership_pda: partnership_key,
        lot_pda: lot_key,
        farmer: farmer_key,
        partner: partner_key,
        ticket_usdc_cents: input.ticket_usdc_cents,
        mint: ctx.accounts.mock_usdc_mint.key(),
        escrow_vault: ctx.accounts.vault_token_account.key(),
        deposited_amount: ticket_base_units,
    });

    Ok(())
}

use anchor_lang::prelude::*;

declare_id!("HD1Bsrbw5tBKpLF3WE2gtnrDDYagNQgwHKAd9E3JZqst");

#[program]
pub mod harvverse {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        treasury: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.role_registration_enabled = true;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn register_role(ctx: Context<RegisterRole>, role: RoleKind) -> Result<()> {
        require!(
            ctx.accounts.config.role_registration_enabled,
            HarvverseError::InvalidRole
        );

        let user_role = &mut ctx.accounts.user_role;
        user_role.wallet = ctx.accounts.user.key();
        user_role.role = role;
        user_role.created_at = Clock::get()?.unix_timestamp;
        user_role.bump = ctx.bumps.user_role;

        emit!(RoleRegistered {
            wallet: user_role.wallet,
            role: user_role.role,
            created_at: user_role.created_at,
        });

        Ok(())
    }

    pub fn create_farmer_profile(
        ctx: Context<CreateFarmerProfile>,
        display_name_hash: [u8; 32],
        metadata_uri_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.user_role.role == RoleKind::Farmer,
            HarvverseError::InvalidRole
        );

        let farmer_profile = &mut ctx.accounts.farmer_profile;
        farmer_profile.farmer = ctx.accounts.farmer.key();
        farmer_profile.display_name_hash = display_name_hash;
        farmer_profile.metadata_uri_hash = metadata_uri_hash;
        farmer_profile.created_at = Clock::get()?.unix_timestamp;
        farmer_profile.bump = ctx.bumps.farmer_profile;

        Ok(())
    }

    pub fn create_partner_profile(
        ctx: Context<CreatePartnerProfile>,
        display_name_hash: [u8; 32],
        metadata_uri_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.user_role.role == RoleKind::Partner,
            HarvverseError::InvalidRole
        );

        let partner_profile = &mut ctx.accounts.partner_profile;
        partner_profile.partner = ctx.accounts.partner.key();
        partner_profile.display_name_hash = display_name_hash;
        partner_profile.metadata_uri_hash = metadata_uri_hash;
        partner_profile.created_at = Clock::get()?.unix_timestamp;
        partner_profile.bump = ctx.bumps.partner_profile;

        Ok(())
    }

    pub fn create_lot(
        ctx: Context<CreateLot>,
        lot_id_hash: [u8; 32],
        metadata_hash: [u8; 32],
        plan_hash: [u8; 32],
        media_manifest_hash: [u8; 32],
        sensor_manifest_hash: [u8; 32],
        ticket_usdc_cents: u64,
        farmer_share_bps: u16,
        partner_share_bps: u16,
    ) -> Result<()> {
        require!(
            ctx.accounts.user_role.role == RoleKind::Farmer,
            HarvverseError::InvalidRole
        );
        require!(
            farmer_share_bps as u32 + partner_share_bps as u32 == 10_000,
            HarvverseError::InvalidShareSplit
        );
        require!(ticket_usdc_cents > 0, HarvverseError::InvalidTicketAmount);
        require!(lot_id_hash != [0u8; 32], HarvverseError::EmptyHash);
        require!(metadata_hash != [0u8; 32], HarvverseError::EmptyHash);
        require!(plan_hash != [0u8; 32], HarvverseError::EmptyHash);
        require!(media_manifest_hash != [0u8; 32], HarvverseError::EmptyHash);
        require!(sensor_manifest_hash != [0u8; 32], HarvverseError::EmptyHash);

        let now = Clock::get()?.unix_timestamp;
        let lot = &mut ctx.accounts.lot;
        lot.farmer = ctx.accounts.farmer.key();
        lot.lot_id_hash = lot_id_hash;
        lot.metadata_hash = metadata_hash;
        lot.plan_hash = plan_hash;
        lot.media_manifest_hash = media_manifest_hash;
        lot.sensor_manifest_hash = sensor_manifest_hash;
        lot.ticket_usdc_cents = ticket_usdc_cents;
        lot.farmer_share_bps = farmer_share_bps;
        lot.partner_share_bps = partner_share_bps;
        lot.status = LotStatus::Draft;
        lot.created_at = now;
        lot.updated_at = now;
        lot.bump = ctx.bumps.lot;

        emit!(LotCreated {
            lot: lot.key(),
            farmer: lot.farmer,
            lot_id_hash: lot.lot_id_hash,
        });

        Ok(())
    }

    pub fn publish_lot(ctx: Context<PublishLot>) -> Result<()> {
        require!(
            ctx.accounts.user_role.role == RoleKind::Farmer,
            HarvverseError::InvalidRole
        );
        require!(
            ctx.accounts.lot.farmer == ctx.accounts.farmer.key(),
            HarvverseError::InvalidRole
        );
        require!(
            ctx.accounts.lot.status == LotStatus::Draft,
            HarvverseError::InvalidLotStatus
        );

        let lot = &mut ctx.accounts.lot;
        lot.status = LotStatus::Published;
        lot.updated_at = Clock::get()?.unix_timestamp;

        emit!(LotPublished {
            lot: lot.key(),
            farmer: lot.farmer,
            updated_at: lot.updated_at,
        });

        Ok(())
    }

    pub fn reserve_partnership(
        ctx: Context<ReservePartnership>,
        terms_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.user_role.role == RoleKind::Partner,
            HarvverseError::InvalidRole
        );
        require!(
            ctx.accounts.lot.status == LotStatus::Published,
            HarvverseError::InvalidLotStatus
        );

        let now = Clock::get()?.unix_timestamp;
        let lot_key = ctx.accounts.lot.key();
        let lot_farmer = ctx.accounts.lot.farmer;
        let lot_ticket = ctx.accounts.lot.ticket_usdc_cents;
        let partner_key = ctx.accounts.partner.key();
        let partnership_bump = ctx.bumps.partnership;

        let partnership = &mut ctx.accounts.partnership;
        partnership.lot = lot_key;
        partnership.farmer = lot_farmer;
        partnership.partner = partner_key;
        partnership.terms_hash = terms_hash;
        partnership.ticket_usdc_cents = lot_ticket;
        partnership.status = PartnershipStatus::Reserved;
        partnership.reserved_at = now;
        partnership.bump = partnership_bump;
        let partnership_key = partnership.key();

        let lot = &mut ctx.accounts.lot;
        lot.status = LotStatus::Reserved;
        lot.updated_at = now;

        emit!(PartnershipReserved {
            partnership: partnership_key,
            lot: lot_key,
            farmer: lot_farmer,
            partner: partner_key,
            ticket_usdc_cents: lot_ticket,
        });

        Ok(())
    }

    pub fn record_milestone(
        ctx: Context<RecordMilestone>,
        milestone_index: u8,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            milestone_index >= 1 && milestone_index <= 6,
            HarvverseError::InvalidMilestoneIndex
        );
        require!(proof_hash != [0u8; 32], HarvverseError::EmptyHash);
        require!(
            matches!(
                ctx.accounts.partnership.status,
                PartnershipStatus::Reserved | PartnershipStatus::Active
            ),
            HarvverseError::InvalidPartnershipStatus
        );

        let now = Clock::get()?.unix_timestamp;
        let partnership_key = ctx.accounts.partnership.key();
        let signer_key = ctx.accounts.signer.key();
        let bump = ctx.bumps.milestone;

        let milestone = &mut ctx.accounts.milestone;
        milestone.partnership = partnership_key;
        milestone.milestone_index = milestone_index;
        milestone.proof_hash = proof_hash;
        milestone.recorded_by = signer_key;
        milestone.recorded_at = now;
        milestone.bump = bump;

        emit!(MilestoneRecorded {
            partnership: partnership_key,
            milestone_index,
            proof_hash,
        });

        Ok(())
    }

    pub fn record_settlement(
        ctx: Context<RecordSettlement>,
        yield_qq: u16,
        price_per_lb_cents: u16,
        revenue_usdc_cents: u64,
        cost_usdc_cents: u64,
        profit_usdc_cents: u64,
        farmer_share_usdc_cents: u64,
        partner_share_usdc_cents: u64,
        settlement_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            matches!(
                ctx.accounts.partnership.status,
                PartnershipStatus::Reserved | PartnershipStatus::Active
            ),
            HarvverseError::InvalidPartnershipStatus
        );

        let expected_revenue =
            (yield_qq as u64) * 833 * (price_per_lb_cents as u64) / 10;
        let expected_profit = if expected_revenue > cost_usdc_cents {
            expected_revenue - cost_usdc_cents
        } else {
            0
        };
        let expected_farmer = expected_profit * 60 / 100;
        let expected_partner = expected_profit - expected_farmer;

        require!(
            revenue_usdc_cents == expected_revenue,
            HarvverseError::InvalidSettlementMath
        );
        require!(
            profit_usdc_cents == expected_profit,
            HarvverseError::InvalidSettlementMath
        );
        require!(
            farmer_share_usdc_cents == expected_farmer,
            HarvverseError::InvalidSettlementMath
        );
        require!(
            partner_share_usdc_cents == expected_partner,
            HarvverseError::InvalidSettlementMath
        );

        let now = Clock::get()?.unix_timestamp;
        let partnership_key = ctx.accounts.partnership.key();
        let bump = ctx.bumps.settlement;

        let settlement = &mut ctx.accounts.settlement;
        settlement.partnership = partnership_key;
        settlement.yield_qq = yield_qq;
        settlement.price_per_lb_cents = price_per_lb_cents;
        settlement.revenue_usdc_cents = revenue_usdc_cents;
        settlement.cost_usdc_cents = cost_usdc_cents;
        settlement.profit_usdc_cents = profit_usdc_cents;
        settlement.farmer_share_usdc_cents = farmer_share_usdc_cents;
        settlement.partner_share_usdc_cents = partner_share_usdc_cents;
        settlement.settlement_hash = settlement_hash;
        settlement.settled_at = now;
        settlement.bump = bump;

        ctx.accounts.partnership.status = PartnershipStatus::Settled;

        let lot = &mut ctx.accounts.lot;
        lot.status = LotStatus::Settled;
        lot.updated_at = now;

        emit!(SettlementRecorded {
            partnership: partnership_key,
            farmer_share_usdc_cents,
            partner_share_usdc_cents,
            settlement_hash,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, ProgramConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterRole<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + UserRole::INIT_SPACE,
        seeds = [b"role", user.key().as_ref()],
        bump,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateFarmerProfile<'info> {
    #[account(
        init,
        payer = farmer,
        space = 8 + FarmerProfile::INIT_SPACE,
        seeds = [b"farmer", farmer.key().as_ref()],
        bump,
    )]
    pub farmer_profile: Account<'info, FarmerProfile>,
    #[account(
        seeds = [b"role", farmer.key().as_ref()],
        bump = user_role.bump,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePartnerProfile<'info> {
    #[account(
        init,
        payer = partner,
        space = 8 + PartnerProfile::INIT_SPACE,
        seeds = [b"partner", partner.key().as_ref()],
        bump,
    )]
    pub partner_profile: Account<'info, PartnerProfile>,
    #[account(
        seeds = [b"role", partner.key().as_ref()],
        bump = user_role.bump,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(mut)]
    pub partner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lot_id_hash: [u8; 32])]
pub struct CreateLot<'info> {
    #[account(
        init,
        payer = farmer,
        space = 8 + Lot::INIT_SPACE,
        seeds = [b"lot", farmer.key().as_ref(), lot_id_hash.as_ref()],
        bump,
    )]
    pub lot: Account<'info, Lot>,
    #[account(
        seeds = [b"farmer", farmer.key().as_ref()],
        bump = farmer_profile.bump,
    )]
    pub farmer_profile: Account<'info, FarmerProfile>,
    #[account(
        seeds = [b"role", farmer.key().as_ref()],
        bump = user_role.bump,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishLot<'info> {
    #[account(
        mut,
        seeds = [b"lot", farmer.key().as_ref(), lot.lot_id_hash.as_ref()],
        bump = lot.bump,
    )]
    pub lot: Account<'info, Lot>,
    #[account(
        seeds = [b"role", farmer.key().as_ref()],
        bump = user_role.bump,
    )]
    pub user_role: Account<'info, UserRole>,
    pub farmer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReservePartnership<'info> {
    #[account(
        init,
        payer = partner,
        space = 8 + Partnership::INIT_SPACE,
        seeds = [b"partnership", lot.key().as_ref(), partner.key().as_ref()],
        bump,
    )]
    pub partnership: Account<'info, Partnership>,
    #[account(
        mut,
        seeds = [b"lot", lot.farmer.as_ref(), lot.lot_id_hash.as_ref()],
        bump = lot.bump,
    )]
    pub lot: Account<'info, Lot>,
    #[account(
        seeds = [b"partner", partner.key().as_ref()],
        bump = partner_profile.bump,
    )]
    pub partner_profile: Account<'info, PartnerProfile>,
    #[account(
        seeds = [b"role", partner.key().as_ref()],
        bump = user_role.bump,
    )]
    pub user_role: Account<'info, UserRole>,
    #[account(mut)]
    pub partner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct RecordMilestone<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + MilestoneReceipt::INIT_SPACE,
        seeds = [b"milestone", partnership.key().as_ref(), &[milestone_index]],
        bump,
    )]
    pub milestone: Account<'info, MilestoneReceipt>,
    pub partnership: Account<'info, Partnership>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordSettlement<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + SettlementReceipt::INIT_SPACE,
        seeds = [b"settlement", partnership.key().as_ref()],
        bump,
    )]
    pub settlement: Account<'info, SettlementReceipt>,
    #[account(mut)]
    pub partnership: Account<'info, Partnership>,
    #[account(
        mut,
        address = partnership.lot,
    )]
    pub lot: Account<'info, Lot>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub role_registration_enabled: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserRole {
    pub wallet: Pubkey,
    pub role: RoleKind,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct FarmerProfile {
    pub farmer: Pubkey,
    pub display_name_hash: [u8; 32],
    pub metadata_uri_hash: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PartnerProfile {
    pub partner: Pubkey,
    pub display_name_hash: [u8; 32],
    pub metadata_uri_hash: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Lot {
    pub farmer: Pubkey,
    pub lot_id_hash: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub plan_hash: [u8; 32],
    pub media_manifest_hash: [u8; 32],
    pub sensor_manifest_hash: [u8; 32],
    pub ticket_usdc_cents: u64,
    pub farmer_share_bps: u16,
    pub partner_share_bps: u16,
    pub status: LotStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Partnership {
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub partner: Pubkey,
    pub terms_hash: [u8; 32],
    pub ticket_usdc_cents: u64,
    pub status: PartnershipStatus,
    pub reserved_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MilestoneReceipt {
    pub partnership: Pubkey,
    pub milestone_index: u8,
    pub proof_hash: [u8; 32],
    pub recorded_by: Pubkey,
    pub recorded_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SettlementReceipt {
    pub partnership: Pubkey,
    pub yield_qq: u16,
    pub price_per_lb_cents: u16,
    pub revenue_usdc_cents: u64,
    pub cost_usdc_cents: u64,
    pub profit_usdc_cents: u64,
    pub farmer_share_usdc_cents: u64,
    pub partner_share_usdc_cents: u64,
    pub settlement_hash: [u8; 32],
    pub settled_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RoleKind {
    Farmer,
    Partner,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum LotStatus {
    Draft,
    Published,
    Reserved,
    InCycle,
    Settled,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PartnershipStatus {
    Reserved,
    Active,
    Settled,
    Cancelled,
}

#[event]
pub struct RoleRegistered {
    pub wallet: Pubkey,
    pub role: RoleKind,
    pub created_at: i64,
}

#[event]
pub struct LotCreated {
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub lot_id_hash: [u8; 32],
}

#[event]
pub struct LotPublished {
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub updated_at: i64,
}

#[event]
pub struct PartnershipReserved {
    pub partnership: Pubkey,
    pub lot: Pubkey,
    pub farmer: Pubkey,
    pub partner: Pubkey,
    pub ticket_usdc_cents: u64,
}

#[event]
pub struct MilestoneRecorded {
    pub partnership: Pubkey,
    pub milestone_index: u8,
    pub proof_hash: [u8; 32],
}

#[event]
pub struct SettlementRecorded {
    pub partnership: Pubkey,
    pub farmer_share_usdc_cents: u64,
    pub partner_share_usdc_cents: u64,
    pub settlement_hash: [u8; 32],
}

#[error_code]
pub enum HarvverseError {
    #[msg("Role already registered for this wallet")]
    RoleAlreadyRegistered,
    #[msg("Wallet does not have the required role")]
    InvalidRole,
    #[msg("Farmer profile is required")]
    FarmerProfileMissing,
    #[msg("Partner profile is required")]
    PartnerProfileMissing,
    #[msg("Lot status does not allow this operation")]
    InvalidLotStatus,
    #[msg("Partnership status does not allow this operation")]
    InvalidPartnershipStatus,
    #[msg("Share basis points must sum to 10000")]
    InvalidShareSplit,
    #[msg("Hash field cannot be zero")]
    EmptyHash,
    #[msg("Milestone index is out of range")]
    InvalidMilestoneIndex,
    #[msg("Milestone receipt already exists")]
    DuplicateMilestone,
    #[msg("Settlement math does not match expected values")]
    InvalidSettlementMath,
    #[msg("Ticket amount must be greater than zero")]
    InvalidTicketAmount,
}

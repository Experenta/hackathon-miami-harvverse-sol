use anchor_lang::prelude::*;

use crate::RoleKind;

#[event]
pub struct RoleRegistered {
    pub wallet: Pubkey,
    pub role: RoleKind,
    pub timestamp: i64,
}

#[event]
pub struct LotCreated {
    pub lot_pda: Pubkey,
    pub farmer: Pubkey,
    pub lot_id_hash: [u8; 32],
}

#[event]
pub struct LotPublished {
    pub lot_pda: Pubkey,
    pub farmer: Pubkey,
}

#[event]
pub struct PartnershipReserved {
    pub partnership_pda: Pubkey,
    pub lot_pda: Pubkey,
    pub farmer: Pubkey,
    pub partner: Pubkey,
    pub ticket_usdc_cents: u64,
    pub mint: Pubkey,
    pub escrow_vault: Pubkey,
    pub deposited_amount: u64,
}

#[event]
pub struct MilestoneRecorded {
    pub partnership_pda: Pubkey,
    pub milestone_index: u8,
    pub proof_hash: [u8; 32],
    pub recorder: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SettlementRecorded {
    pub partnership_pda: Pubkey,
    pub settlement_hash: [u8; 32],
}

#[event]
pub struct MockUsdcInitialized {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub decimals: u8,
    pub faucet_amount: u64,
}

#[event]
pub struct MockUsdcClaimed {
    pub claimant: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct FundsReleased {
    pub partnership_pda: Pubkey,
    pub release_index: u8,
    pub recipient: Pubkey,
    pub amount: u64,
    pub released_amount: u64,
    pub vault_remaining: u64,
}

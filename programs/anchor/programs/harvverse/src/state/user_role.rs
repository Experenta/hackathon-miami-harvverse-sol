use anchor_lang::prelude::*;

use crate::RoleKind;

#[account]
#[derive(InitSpace)]
pub struct UserRole {
    pub wallet: Pubkey,
    pub role: RoleKind,
    pub created_at: i64,
    pub bump: u8,
}

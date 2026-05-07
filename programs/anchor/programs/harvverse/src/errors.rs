use anchor_lang::prelude::*;

#[error_code]
pub enum HarvverseError {
    #[msg("Role already registered for this wallet")]
    RoleAlreadyRegistered,

    #[msg("Invalid role for this operation")]
    InvalidRole,

    #[msg("Farmer profile required for this operation")]
    FarmerProfileMissing,

    #[msg("Partner profile required for this operation")]
    PartnerProfileMissing,

    #[msg("Farmer and partner share BPS must sum to 10000")]
    InvalidShareSplit,

    #[msg("Lot is not in the required status for this operation")]
    InvalidLotStatus,

    #[msg("Hash field cannot be all zeros")]
    EmptyHash,

    #[msg("Invalid authority signer")]
    InvalidAuthority,

    #[msg("Partnership already exists for this lot and partner")]
    PartnershipAlreadyExists,

    #[msg("Program config already initialized")]
    ConfigAlreadyInitialized,

    #[msg("Settlement must be signed by farmer or authority")]
    InvalidSettlementSigner,

    #[msg("Invalid payment configuration")]
    InvalidPaymentConfig,

    #[msg("Invalid mockUSDC mint")]
    InvalidMockUsdcMint,

    #[msg("Invalid mockUSDC faucet amount")]
    InvalidFaucetAmount,

    #[msg("Invalid ticket amount")]
    InvalidTicketAmount,

    #[msg("Invalid release schedule")]
    InvalidReleaseSchedule,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Arithmetic overflow")]
    MathOverflow,

    #[msg("Release must be signed by farmer or authority")]
    InvalidReleaseSigner,

    #[msg("Release has already been claimed")]
    ReleaseAlreadyClaimed,

    #[msg("Vault balance is too low for this release")]
    InsufficientVaultBalance,

    #[msg("Invalid milestone index")]
    InvalidMilestoneIndex,

    #[msg("Milestone must be signed by farmer or authority")]
    InvalidMilestoneSigner,

    #[msg("Milestone proof account does not match the requested release")]
    InvalidMilestoneProof,
}

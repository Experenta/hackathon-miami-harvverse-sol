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
}

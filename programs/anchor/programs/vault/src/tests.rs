#[cfg(test)]
mod tests {
    use crate::ID as PROGRAM_ID;
    use litesvm::LiteSVM;
    use solana_sdk::{
        hash::hash,
        instruction::{AccountMeta, Instruction},
        signature::Keypair,
        signer::Signer,
        transaction::Transaction,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    fn create_say_hello_ix(signer: &solana_sdk::pubkey::Pubkey) -> Instruction {
        let discriminator = &hash(b"global:say_hello").to_bytes()[..8];

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![AccountMeta::new_readonly(*signer, true)],
            data: discriminator.to_vec(),
        }
    }

    #[test]
    fn test_say_hello_succeeds() {
        let mut svm = LiteSVM::new();

        let program_bytes = include_bytes!("../../../target/deploy/vault.so");
        svm.add_program(PROGRAM_ID, program_bytes).unwrap();

        let user = Keypair::new();
        svm.airdrop(&user.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let instruction = create_say_hello_ix(&user.pubkey());
        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&user.pubkey()),
            &[&user],
            svm.latest_blockhash(),
        );

        let result = svm.send_transaction(transaction);
        assert!(result.is_ok(), "say_hello should succeed");
    }
}

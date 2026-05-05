use anchor_lang::prelude::*;

#[cfg(test)]
mod tests;

declare_id!("Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP");

#[program]
pub mod vault {
    use super::*;

    pub fn say_hello(ctx: Context<SayHello>) -> Result<()> {
        msg!("Hello, world! Signer: {}", ctx.accounts.signer.key());
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SayHello<'info> {
    pub signer: Signer<'info>,
}

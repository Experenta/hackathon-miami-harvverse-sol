# Local Development

This guide covers the local workflow for the Harvverse Solana program in this
Turborepo.

## Canonical Program ID

Devnet and localnet are intentionally pinned to the same program ID:

```txt
Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP
```

The app can switch between devnet and localnet by changing the selected cluster.
The program address stays the same. Chain state is separate, so each cluster
needs its own accounts and `ProgramConfig`.

## Local Architecture

The local development loop uses:

- `solana-test-validator` at `http://localhost:8899` and `ws://localhost:8900`
- `programs/anchor` for the Anchor program
- `packages/solana-client` for shared RPC helpers and generated Harvverse client
- `apps/web` for browser-based localnet testing
- `apps/native` for Android emulator testing with `http://10.0.2.2:8899`

## Prerequisites

Install and verify:

```bash
pnpm --version
node --version
rustc --version
cargo --version
solana --version
anchor --version
```

For Android/mobile work, use JDK 17 when building the native app:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

## First-Time Setup

From the repository root:

```bash
pnpm install
pnpm run setup
```

`pnpm run setup` builds the Anchor program and regenerates the TypeScript client
from `programs/anchor/target/idl/harvverse.json` into:

```txt
packages/solana-client/src/generated/harvverse
```

## One-Command Local Web Development

From the repository root:

```bash
pnpm dev:local
```

This starts the full local loop:

1. Starts `solana-test-validator --reset --ledger programs/anchor/.anchor/localnet-ledger`
2. Creates the CLI wallet if `~/.config/solana/id.json` does not exist
3. Waits for localnet RPC readiness
4. Airdrops SOL to the CLI wallet on localnet
5. Runs `pnpm codama:js`
6. Runs `pnpm anchor:deploy:local`
7. Initializes Harvverse `ProgramConfig` on localnet if missing
8. Starts the web app
9. Watches Anchor files for rebuild/redeploy/reinitialize

The local validator starts with `--reset` by default. To reuse the existing
local ledger:

```bash
LOCALNET_RESET=0 pnpm dev:local
```

After the web app starts, open:

```txt
http://localhost:3000
```

Select `localnet`, connect your browser wallet, and fund it with the app
airdrop button or:

```bash
pnpm localnet:airdrop 5 <BROWSER_WALLET_ADDRESS>
```

## Manual Localnet Flow

Use separate terminals when you want more control.

Terminal 1:

```bash
solana-test-validator --reset --ledger programs/anchor/.anchor/localnet-ledger
```

Terminal 2:

```bash
solana airdrop 10 --url localhost
pnpm codama:js
pnpm anchor:deploy:local
pnpm harvverse:config:local --send
```

Terminal 3:

```bash
pnpm dev:web
```

## Devnet Preparation

Devnet uses the same program ID, but it has independent state. Deployment and
configuration are explicit:

```bash
pnpm anchor:deploy:devnet
pnpm harvverse:config:devnet
```

The config command dry-runs and simulates by default. If simulation succeeds and
you intend to initialize devnet `ProgramConfig`, run:

```bash
pnpm harvverse:config:devnet --send
```

The config transaction uses:

- Cluster: `devnet`
- Program: `Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP`
- Fee payer: local Solana CLI wallet
- Treasury: local Solana CLI wallet unless `--treasury` is supplied
- Instruction: `initialize_config`

## Useful Inspection Commands

Check the deployed local program:

```bash
solana program show Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP --url localhost
```

Check the deployed devnet program:

```bash
solana program show Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP --url devnet
```

Check or simulate config initialization:

```bash
pnpm harvverse:config:local
pnpm harvverse:config:devnet
```

## Common Notes

- Localnet reset wipes deployed programs, accounts, balances, and transaction history.
- After every localnet reset, deploy and initialize again. `pnpm dev:local` handles this.
- Devnet and localnet share the program ID, not the account state.
- If you change Rust program code, run `pnpm codama:js` before testing app transactions.

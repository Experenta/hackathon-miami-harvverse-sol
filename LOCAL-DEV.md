# Local Development

This guide describes the local workflow for building, deploying, testing, and debugging Solana programs in this Turborepo.

In Solana terms, the smart contracts are programs. This repo currently has one Anchor program, `vault`, and both the web app and generated TypeScript client are set up to talk to it. The crate is still named `vault`, but the current instruction is a simple Hello World flow.

## Local Architecture

The local development loop uses these pieces:

- `solana-test-validator` - local Solana validator, RPC at `http://localhost:8899`, WebSocket at `ws://localhost:8900`.
- `programs/anchor` - Anchor workspace that builds and deploys the Rust program.
- `packages/solana-client` - shared Solana helpers and Codama-generated TypeScript program client.
- `apps/web` - Next.js dApp that can select `localnet`, connect a wallet, airdrop, and send the Hello World instruction.

The current local/devnet program ID is:

```txt
Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP
```

For app transactions to succeed, this exact program ID must be deployed to whichever cluster the app is using.

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

The local chain and web workflow do not require the Android app to be running.

## First-Time Setup

From the repository root:

```bash
pnpm install
pnpm run setup
```

`pnpm run setup` builds the Anchor program and regenerates the TypeScript client from the Anchor IDL.

Do not use `pnpm setup`; that is a pnpm built-in command. Use `pnpm run setup`.

## Recommended Terminal Layout

Use separate terminals so logs stay readable:

- Terminal 1: local validator
- Terminal 2: deploy, rebuild, test, and inspect commands
- Terminal 3: web app
- Terminal 4: optional Solana logs

For the common web-plus-localnet workflow, you can use the one-command setup instead:

```bash
pnpm dev:local
```

This Turbo-backed root task starts the local validator, funds the local CLI wallet, builds the Anchor program, regenerates the generated TypeScript client, deploys to localnet, launches the web app, and watches Anchor files for rebuild/redeploy.

Use the manual terminal layout when you want finer control over each process.

## One-Command Local Web Development

From the repository root:

```bash
pnpm dev:local
```

This runs:

1. `solana-test-validator --reset --ledger programs/anchor/.anchor/localnet-ledger`
2. CLI wallet creation if `~/.config/solana/id.json` does not exist
3. local validator readiness check
4. CLI wallet airdrop on localnet
5. `pnpm codama:js`
6. `pnpm anchor:deploy:local`
7. `pnpm --filter web dev`
8. Anchor file watcher

When files under `programs/anchor` or `codama.json` change, the web app stays open while the script reruns:

```bash
pnpm codama:js
pnpm anchor:deploy:local
```

The local validator starts with `--reset` by default. To reuse the existing local ledger:

```bash
LOCALNET_RESET=0 pnpm dev:local
```

After the web app starts, open:

```txt
http://localhost:3000
```

Then select `localnet` in the app, connect your browser wallet, and fund it with the app `Airdrop` button or:

```bash
pnpm localnet:airdrop 5 <BROWSER_WALLET_ADDRESS>
```

## Start A Fresh Local Chain

From the repository root:

```bash
solana-test-validator --reset --ledger programs/anchor/.anchor/localnet-ledger
```

Keep this process running.

The validator exposes:

```txt
RPC: http://localhost:8899
WS:  ws://localhost:8900
```

The `--reset` flag wipes local chain state, including deployed programs, accounts, balances, and transaction history. After every reset, deploy the program again before using the app.

The ledger path is under `programs/anchor/.anchor`, which is ignored by git.

## Configure The CLI For Localnet

In a second terminal:

```bash
solana config set --url localhost
solana config get
```

Make sure the RPC URL is:

```txt
http://localhost:8899
```

If your CLI keypair does not exist yet:

```bash
solana-keygen new -o ~/.config/solana/id.json
```

Fund the CLI wallet so it can deploy programs:

```bash
solana airdrop 10
solana balance
```

This funds the CLI wallet only. Your browser wallet is a separate account and needs its own localnet SOL.

## Build, Deploy, And Generate Client

From the repository root:

```bash
pnpm codama:js
```

This runs through Turbo. It builds the Anchor program first, then Codama reads:

```txt
programs/anchor/target/idl/vault.json
```

and writes the generated TypeScript client to:

```txt
packages/solana-client/src/generated/vault
```

Deploy the program to the running local validator:

```bash
pnpm anchor:deploy:local
```

Verify the deployed program:

```bash
solana program show Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP --url localhost
```

## Launch The Web App Against Localnet

From the repository root:

```bash
pnpm dev:web
```

Open the Next.js URL, usually:

```txt
http://localhost:3000
```

In the app:

1. Select `localnet` from the cluster dropdown.
2. Connect your browser wallet.
3. Click `Airdrop` to fund the connected browser wallet on localnet.
4. Use the Hello World panel to send the `say_hello` instruction.

If your wallet extension asks for a network, use localnet/custom RPC:

```txt
http://localhost:8899
```

## Local Contract Development Loop

Use this loop when changing Anchor program code:

1. Edit Rust source under:

```txt
programs/anchor/programs/vault/src
```

1. Build and regenerate the client:

```bash
pnpm codama:js
```

1. Redeploy to the running local validator:

```bash
pnpm anchor:deploy:local
```

1. Refresh the web app and test the interaction again.
2. Run validation:

```bash
pnpm anchor:test
pnpm check
```

`pnpm anchor:test` uses LiteSVM and does not need `solana-test-validator`. Use the local validator when testing app-to-program behavior through real RPC.

## Fast Validator Boot With Program Preloaded

For quick local app testing after a build, you can start the validator with the program already loaded:

```bash
pnpm anchor:build
solana-test-validator \
  --reset \
  --ledger programs/anchor/.anchor/localnet-ledger \
  --bpf-program Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP programs/anchor/target/deploy/vault.so
```

This is useful when you want a clean chain with the program available immediately. If you use this flow, you do not need to run `anchor deploy` for that validator session.

Still run `pnpm codama:js` when the IDL or generated TypeScript client needs to change.

## Debugging Program Behavior

Use program logs while sending transactions from the web app:

```bash
solana logs --url localhost
```

You can also rely on the validator terminal; it prints transaction and program logs directly.

Useful inspection commands:

```bash
solana balance --url localhost
solana balance <WALLET_ADDRESS> --url localhost
solana program show Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP --url localhost
solana account <ACCOUNT_ADDRESS> --url localhost
solana transaction <SIGNATURE> --url localhost
```

When debugging Anchor errors, add temporary `msg!` calls in the Rust program, rebuild, redeploy, and watch `solana logs`.

Example:

```rust
msg!("hello debug");
```

Remove noisy debug logs before finalizing program changes.

## Testing Strategy

Use both test layers:

- LiteSVM tests for fast program behavior checks.
- Local validator tests for app, wallet, RPC, airdrop, deployment, and generated-client integration.

Fast program tests:

```bash
pnpm anchor:test
```

Full local app test:

```bash
solana-test-validator --reset --ledger programs/anchor/.anchor/localnet-ledger
pnpm codama:js
pnpm anchor:deploy:local
pnpm dev:web
```

Then test through the browser on `localnet`.

## Program ID Workflow

If you are only changing instruction logic, accounts, errors, or tests, keep the same program ID.

If you intentionally create a new program ID:

```bash
cd programs/anchor
solana-keygen new -o target/deploy/vault-keypair.json
solana address -k target/deploy/vault-keypair.json
```

Then update the new ID in:

- `programs/anchor/Anchor.toml` under `[programs.localnet]`
- `programs/anchor/Anchor.toml` under `[programs.devnet]` if devnet should use the same ID
- `programs/anchor/programs/vault/src/lib.rs` in `declare_id!("...")`

After changing the program ID:

```bash
pnpm codama:js
pnpm anchor:deploy:local
pnpm build
```

The generated client embeds the program ID, so regenerate it any time the ID changes.

## Local Wallet Funding

Fund the CLI wallet:

```bash
solana airdrop 10 --url localhost
```

Fund a browser wallet manually:

```bash
pnpm localnet:airdrop 5 <BROWSER_WALLET_ADDRESS>
```

Fund any localnet wallet address:

```bash
pnpm localnet:airdrop <AMOUNT_IN_SOL> <WALLET_ADDRESS>
```

For example, to fund this wallet with 5 localnet SOL:

```bash
pnpm localnet:airdrop 5 7Ei6MijGKBqpVKgdYfzJyV2DAs3vB2WgWL6NVor8aKJS
```

The script runs the localnet airdrop and then prints the target wallet balance. The equivalent raw Solana CLI command is:

```bash
solana airdrop <AMOUNT_IN_SOL> <WALLET_ADDRESS> --url localhost
```

Or use the web app `Airdrop` button after selecting `localnet`.

If you reset the validator, all local balances are wiped.

## Common Problems

### Program Not Found

Symptoms:

- Transaction simulation fails before reaching your instruction.
- Explorer or logs show the program account is missing.

Fix:

```bash
solana program show Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP --url localhost
pnpm anchor:deploy:local
```

Also confirm the web app cluster dropdown is set to `localnet`.

### Generated Client Uses An Old Program ID

Check:

```bash
rg "VAULT_PROGRAM_ADDRESS|declare_id|Bwed" programs/anchor packages/solana-client/src/generated/vault
```

Fix:

```bash
pnpm codama:js
pnpm build
```

### Browser Wallet Has No SOL

The CLI wallet airdrop does not fund the browser wallet.

Fix:

```bash
solana airdrop 5 <BROWSER_WALLET_ADDRESS> --url localhost
```

or use the app `Airdrop` button on `localnet`.

### Validator Was Reset

A reset wipes deployed programs and accounts.

Fix:

```bash
pnpm codama:js
pnpm anchor:deploy:local
```

Then refresh the web app.

### Port 8899 Is Already In Use

Find the process:

```bash
lsof -nP -iTCP:8899 -sTCP:LISTEN
```

Stop the old validator, or start a new validator on a different RPC port and update the app RPC config before using it.

### Android Emulator Cannot Reach Localhost

The web app can use `http://localhost:8899` directly from the browser on the same machine.

Android emulators usually need the host machine at:

```txt
http://10.0.2.2:8899
```

The current Hello World flow is wired into the web app. If the mobile app later gets localnet program features, add environment-aware RPC selection for emulator/device networking instead of hard-coding `localhost`.

## Clean Reset Checklist

Use this when local state feels inconsistent:

1. Stop the web app.
2. Stop `solana-test-validator`.
3. Restart the validator:

```bash
solana-test-validator --reset --ledger programs/anchor/.anchor/localnet-ledger
```

1. In another terminal:

```bash
solana config set --url localhost
solana airdrop 10
pnpm codama:js
pnpm anchor:deploy:local
pnpm dev:web
```

1. Open the app, select `localnet`, reconnect the wallet, and airdrop local SOL to the browser wallet.

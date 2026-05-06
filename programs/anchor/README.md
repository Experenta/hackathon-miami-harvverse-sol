# Anchor Hello World Program

This directory contains the Anchor Rust workspace for the Solana program used by this Turborepo.

The frontend apps do not deploy programs directly:

- `programs/anchor` contains the Anchor program source and build output.
- `packages/solana-client` contains shared Solana helpers and the Codama-generated TypeScript client.
- `apps/web` imports the generated Hello World instruction from `@repo/solana-client`.
- `apps/native` is set up to interact with deployed Solana programs through Solana Kit and Mobile Wallet Adapter.

## Current Program

The included Anchor program is a simple Hello World contract. This checkout is currently synced to the local generated program keypair:

```txt
Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP
```

Devnet is the default provider cluster for this Anchor workspace. A matching localnet program entry is also present for local validator work. The generated TypeScript client uses the same program ID, so app transactions only succeed on clusters where that ID has been deployed.

## Repository Commands

Run these from the repository root:

```bash
pnpm anchor:build
pnpm anchor:test
pnpm codama:js
pnpm run setup
```

`pnpm run setup` runs the Turbo `codegen:program` task, which depends on `@repo/anchor-program#anchor:build`.

```bash
turbo run codegen:program
```

The Anchor build writes the IDL to:

```txt
programs/anchor/target/idl/harvverse.json
```

Codama reads that IDL through the root `codama.json` file and regenerates the client at:

```txt
packages/solana-client/src/generated/harvverse
```

## Prerequisites

Anchor and Solana CLI tools must be installed locally before running the program commands:

- Anchor CLI
- Solana CLI
- Rust/Cargo
- pnpm

## Program Overview

The program exposes one instruction:

- **say_hello**: Requires the connected wallet as a signer and writes `Hello, world!` plus the signer address to the program logs.

It does not create accounts, derive PDAs, or move SOL.

## Deploying Your Own Program

Use this flow when replacing the template devnet program with your own deployment.

### 1. Generate a program keypair

From the repository root:

```bash
cd programs/anchor
solana-keygen new -o target/deploy/harvverse-keypair.json
```

### 2. Get the new program ID

```bash
solana address -k target/deploy/harvverse-keypair.json
```

### 3. Update program IDs

Update the new program ID in:

- `programs/anchor/Anchor.toml` under `[programs.devnet]`
- `programs/anchor/Anchor.toml` under `[programs.localnet]` if you use local validator deployments
- `programs/anchor/programs/harvverse/src/lib.rs` in `declare_id!("...")`

### 4. Build and deploy

From `programs/anchor`:

```bash
anchor build
solana airdrop 2 --url devnet
anchor deploy --provider.cluster devnet
```

### 5. Regenerate the TypeScript client

Return to the repository root:

```bash
cd ../..
pnpm codama:js
pnpm build
```

Commit the updated generated files under `packages/solana-client/src/generated/harvverse` with the program changes.

## Testing

From the repository root:

```bash
pnpm anchor:test
```

The tests use LiteSVM and live in:

```txt
programs/anchor/programs/harvverse/src/tests.rs
```

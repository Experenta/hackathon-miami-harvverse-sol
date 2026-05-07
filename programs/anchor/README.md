# Harvverse Anchor Program

This directory contains the Anchor Rust workspace for the Harvverse Solana
program used by the web and native apps.

The frontend apps do not deploy programs directly:

- `programs/anchor` contains the Anchor program source and build output.
- `packages/solana-client` contains shared Solana helpers and the Codama-generated TypeScript client.
- `apps/web` and `apps/native` import helpers from `@repo/solana-client`.

## Canonical Program ID

Devnet and localnet intentionally use the same program ID:

```txt
Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP
```

This ID must stay synchronized in:

- `programs/anchor/Anchor.toml`
- `programs/anchor/programs/harvverse/src/lib.rs`
- `packages/solana-client/src/generated/harvverse`

The deployed app can switch between devnet and localnet by changing only the RPC
cluster. Program state is still cluster-specific, so devnet and localnet each
need their own initialized accounts.

## Repository Commands

Run these from the repository root:

```bash
pnpm anchor:build
pnpm codama:js
pnpm build
```

Localnet development:

```bash
pnpm dev:local
```

That command starts a local validator, builds, regenerates the TypeScript
client, deploys the canonical program ID to localnet, initializes
`ProgramConfig` if missing, launches the web app, and watches Anchor files.

Devnet deployment:

```bash
pnpm anchor:deploy:devnet
pnpm harvverse:config:devnet
```

`pnpm harvverse:config:devnet` is a dry-run by default. If simulation succeeds
and you intend to create the devnet `ProgramConfig`, run:

```bash
pnpm harvverse:config:devnet --send
```

## Build Outputs

The Anchor build writes the IDL to:

```txt
programs/anchor/target/idl/harvverse.json
```

Codama reads that IDL through the root `codama.json` file and regenerates the
client at:

```txt
packages/solana-client/src/generated/harvverse
```

## Prerequisites

Anchor and Solana CLI tools must be installed locally before running the program
commands:

- Anchor CLI
- Solana CLI
- Rust/Cargo
- pnpm

## Tests

From the repository root:

```bash
pnpm anchor:test
```

The tests use LiteSVM and live with the Harvverse program source.

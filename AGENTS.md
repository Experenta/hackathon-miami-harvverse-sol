# Agent Notes

## Project Setup

This repo is a Solana dApp Turborepo composed from two Solana Foundation templates:

- `mobile/kit-expo-minimal` for the Expo React Native Android app in `apps/native`.
- `kit/nextjs-anchor` for the Anchor program, Codama client generation, and Next.js web dApp flow.

## Workspace Layout

- `apps/web` - Next.js 16 dApp using `@solana/kit`, wallet-standard, Tailwind CSS, and `@repo/solana-client`.
- `apps/native` - Expo React Native app using Solana Kit, Mobile Wallet Adapter, React Query, and network/account feature examples.
- `programs/anchor` - Anchor Rust workspace containing the template Vault program.
- `packages/solana-client` - Shared Solana helpers plus the Codama-generated Vault client under `src/generated/vault`.
- `packages/ui` - Existing shared React Native UI package from the original Turborepo starter.
- `packages/typescript-config` - Shared TypeScript configs.

## Important Workflow

The UI apps interact with already deployed Solana programs. They should not deploy programs directly.

Use these commands from the repo root:

```bash
pnpm install
pnpm dev:web
pnpm dev:native
pnpm android
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check
pnpm ci
```

Anchor and Codama workflow:

```bash
pnpm anchor:build
pnpm anchor:test
pnpm codama:js
pnpm run setup
```

`pnpm run setup` requires local Anchor CLI and Solana CLI installs. It builds `programs/anchor` and regenerates `packages/solana-client/src/generated/vault`.

## Current Program

The included template Vault program and generated client currently target:

```txt
Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP
```

Devnet is the default Anchor provider cluster. `programs/anchor/Anchor.toml` also includes a matching localnet entry so local validator deployments can use the same program ID.

When changing the Anchor program, rebuild it and regenerate the client before updating app code:

```bash
pnpm anchor:build
pnpm codama:js
pnpm build
```

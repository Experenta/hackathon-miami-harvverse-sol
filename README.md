# Harvverse Miami Tracks

Solana dApp Turborepo with:

- `apps/web` - Next.js 16 web dApp using `@solana/kit`, wallet-standard, Tailwind, and the Harvverse Anchor client.
- `apps/native` - Expo React Native Android app using Solana Kit and Mobile Wallet Adapter.
- `programs/anchor` - Anchor Rust workspace with the Harvverse role, lot, and partnership program.
- `packages/backend` - shared Convex backend and generated API types consumed by web and native apps.
- `packages/solana-client` - shared Solana helpers plus the Codama-generated TypeScript client.
- `packages/ui` - existing shared React Native UI package from the original starter.

## What Is Set Up Here

This repository combines two Solana Foundation starter templates into one Turborepo:

- `mobile/kit-expo-minimal` provides the Expo React Native mobile app, Solana Kit setup, Mobile Wallet Adapter provider, network selector, wallet connect/disconnect flow, message signing, transaction signing, and balance/network examples.
- `kit/nextjs-anchor` provides the Anchor program, Codama-generated TypeScript client, and a Next.js web dApp that can connect a browser wallet, show balances, request airdrops, and send Harvverse program instructions.

The smart contract workflow is intentionally separate from the mobile app. Anchor code lives in `programs/anchor`, generated TypeScript program bindings live in `packages/solana-client`, and apps consume those bindings instead of deploying programs directly from the UI.

The current Anchor program is the Harvverse marketplace program. Devnet and localnet are intentionally pinned to the same canonical program ID:

```txt
Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP
```

Devnet is the default Anchor provider cluster in this checkout. The shared Solana client and web app can also point at localnet, testnet, or mainnet, but program transactions only work on clusters where this exact program ID has been deployed and initialized.

## Setup

```bash
pnpm install
```

To configure Convex, run the backend setup command and follow the Convex login/project prompts:

```bash
pnpm convex:setup
```

This creates `packages/backend/.env.local`. Copy its `CONVEX_URL` value into:

```txt
apps/web/.env.local     -> NEXT_PUBLIC_CONVEX_URL=...
apps/native/.env.local  -> EXPO_PUBLIC_CONVEX_URL=...
```

Once these env values are set, both apps are wrapped with a Convex React provider. Import generated API references from the shared backend package:

```ts
import { api } from "@havverse/backend/convex/_generated/api";
```

To build the Anchor program and regenerate the TypeScript client:

```bash
pnpm run setup
```

`pnpm run setup` requires the Anchor CLI and Solana CLI to be installed locally. It builds `programs/anchor` and writes generated client files to `packages/solana-client/src/generated/harvverse`.

## Development

```bash
pnpm dev
pnpm dev:convex
pnpm dev:web
pnpm dev:native
pnpm android
```

Useful package-specific commands:

```bash
pnpm --filter web dev
pnpm --filter native start
pnpm --filter native android:build
pnpm anchor:build
pnpm anchor:deploy:devnet
pnpm anchor:deploy:local
pnpm anchor:test
pnpm codama:js
pnpm harvverse:config:devnet
```

## Verification

```bash
pnpm check
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
```

`pnpm check` runs cached lint, typecheck, and formatting tasks through Turbo. `pnpm build` typechecks the native app and shared Solana client, builds the shared UI package, and creates the production Next.js build. Android project generation stays explicit through `pnpm android:build`.

For CI-style local validation, run:

```bash
pnpm ci
```

## Program Workflow

The Harvverse program and generated client currently target the same canonical program ID on devnet and localnet:

```txt
Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP
```

After changing the Anchor program:

```bash
pnpm anchor:build
pnpm codama:js
pnpm build
```

`pnpm codama:js` runs through Turbo and depends on the Anchor build, so it is the normal command for refreshing the generated TypeScript client after Rust program changes. The web app imports Harvverse instructions and Solana helpers from `@repo/solana-client`. The mobile app is scaffolded from `mobile/kit-expo-minimal` and is ready for Solana Kit/Mobile Wallet Adapter interactions against deployed programs.

To test locally with the canonical program ID:

```bash
pnpm dev:local
```

That command starts a local validator, builds and deploys the same `Bwedfg...` program, initializes the Harvverse `ProgramConfig` PDA if it is missing, and launches the web app.

To prepare devnet, dry-run the config bootstrap first:

```bash
pnpm anchor:deploy:devnet
pnpm harvverse:config:devnet
```

If the dry-run simulation succeeds and you intend to create the devnet `ProgramConfig`, run:

```bash
pnpm harvverse:config:devnet --send
```

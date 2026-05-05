#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const [amount, address] = process.argv.slice(2);

if (!amount || !address) {
  console.error(
    "Usage: pnpm localnet:airdrop <AMOUNT_IN_SOL> <WALLET_ADDRESS>",
  );
  process.exit(1);
}

if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
  console.error("AMOUNT_IN_SOL must be a positive number.");
  process.exit(1);
}

const solanaBinDirs = [
  `${process.env.HOME}/.local/share/solana/install/active_release/bin`,
  `${process.env.HOME}/.cargo/bin`,
  process.env.PATH ?? "",
].join(":");

const env = {
  ...process.env,
  PATH: solanaBinDirs,
};

const airdrop = spawnSync(
  "solana",
  ["airdrop", amount, address, "--url", "localhost"],
  {
    env,
    stdio: "inherit",
  },
);

if (airdrop.status !== 0) {
  process.exit(airdrop.status ?? 1);
}

const balance = spawnSync(
  "solana",
  ["balance", address, "--url", "localhost"],
  {
    env,
    stdio: "inherit",
  },
);

process.exit(balance.status ?? 0);

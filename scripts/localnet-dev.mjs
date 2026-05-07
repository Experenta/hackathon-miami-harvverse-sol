#!/usr/bin/env node

import { existsSync, mkdirSync, statSync, watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const ledgerDir = "programs/anchor/.anchor/localnet-ledger";
const localnetUrl = "localhost";
const validatorUrl = "http://localhost:8899";
const keypairPath = `${process.env.HOME}/.config/solana/id.json`;
const resetLedger = process.env.LOCALNET_RESET !== "0";
const appTarget = process.argv.includes("--android") ? "android" : "web";

const solanaPath = [
  `${process.env.HOME}/.local/share/solana/install/active_release/bin`,
  `${process.env.HOME}/.cargo/bin`,
  `${process.env.HOME}/.avm/bin`,
  process.env.PATH ?? "",
].join(":");

const env = {
  ...process.env,
  NO_DNA: process.env.NO_DNA ?? "1",
  PATH: solanaPath,
};

const children = new Set();
let deployRunning = false;
let deployQueued = false;
let shuttingDown = false;

if (process.argv.includes("--help")) {
  console.log(`Usage:
  pnpm dev:local
  pnpm dev:local:android

Starts the local Solana validator, funds the CLI wallet, builds and deploys the
Anchor program, launches the selected app, and redeploys when Anchor files
change.

Environment:
  LOCALNET_RESET=0   Reuse the existing local ledger instead of starting with --reset.

Options:
  --android          Launch the native Android app instead of the web app.
`);
  process.exit(0);
}

function log(message) {
  console.log(`\n[localnet] ${message}`);
}

function run(command, args, options = {}) {
  log(`$ ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function spawnChild(name, command, args, options = {}) {
  log(`starting ${name}: ${[command, ...args].join(" ")}`);
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
    ...options,
  });

  children.add(child);

  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(`[localnet] ${name} exited with ${signal ?? code}`);
      shutdown(1);
    }
  });

  return child;
}

function ensureCliKeypair() {
  if (existsSync(keypairPath)) return;

  mkdirSync(dirname(keypairPath), { recursive: true });
  run("solana-keygen", [
    "new",
    "--no-bip39-passphrase",
    "--silent",
    "-o",
    keypairPath,
  ]);
}

async function waitForValidator() {
  log(`waiting for validator at ${validatorUrl}`);

  for (let attempt = 1; attempt <= 90; attempt += 1) {
    const result = spawnSync(
      "solana",
      ["cluster-version", "--url", localnetUrl],
      {
        cwd: rootDir,
        env,
        stdio: "ignore",
      },
    );

    if (result.status === 0) return;

    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }

  throw new Error(`validator did not become ready at ${validatorUrl}`);
}

function fundCliWallet() {
  run("solana", ["airdrop", "10", "--url", localnetUrl]);
  run("solana", ["balance", "--url", localnetUrl]);
}

function buildGenerateDeploy(reason) {
  if (deployRunning) {
    deployQueued = true;
    log(`deploy already running; queued another run for ${reason}`);
    return;
  }

  deployRunning = true;
  deployQueued = false;

  try {
    log(`build, generate, and deploy (${reason})`);
    run("pnpm", ["codama:js"]);
    run("pnpm", ["anchor:deploy:local"]);
    run("node", [
      "packages/solana-client/scripts/harvverse-config.mjs",
      "--cluster",
      "localnet",
      "--send",
    ]);
    run("node", [
      "packages/solana-client/scripts/harvverse-mock-usdc.mjs",
      "--cluster",
      "localnet",
      "--send",
    ]);
  } catch (error) {
    console.error(`[localnet] ${error.message}`);
  } finally {
    deployRunning = false;
  }

  if (deployQueued && !shuttingDown) {
    buildGenerateDeploy("queued changes");
  }
}

function watchAnchorFiles() {
  const watchTargets = [
    "programs/anchor/Anchor.toml",
    "programs/anchor/Cargo.toml",
    "programs/anchor/programs",
    "codama.json",
  ];

  let timer;

  for (const target of watchTargets) {
    const absoluteTarget = resolve(rootDir, target);
    if (!existsSync(absoluteTarget)) continue;

    const isDirectory = statSync(absoluteTarget).isDirectory();

    watch(absoluteTarget, { recursive: isDirectory }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        buildGenerateDeploy("Anchor file change");
      }, 500);
    });
  }

  log("watching Anchor files for rebuild and redeploy");
}

function startValidator() {
  const args = ["--ledger", ledgerDir];
  if (resetLedger) args.unshift("--reset");
  spawnChild("validator", "solana-test-validator", args);
}

function startApp() {
  if (appTarget === "android") {
    spawnChild("android", "pnpm", ["--filter", "native", "android"]);
    return;
  }

  spawnChild("web", "pnpm", ["--filter", "web", "dev"]);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  log("shutting down local dev processes");

  for (const child of children) {
    child.kill("SIGINT");
  }

  setTimeout(() => {
    for (const child of children) {
      child.kill("SIGTERM");
    }
    process.exit(exitCode);
  }, 1500).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  ensureCliKeypair();
  startValidator();
  await waitForValidator();
  fundCliWallet();
  buildGenerateDeploy("startup");
  startApp();
  watchAnchorFiles();
} catch (error) {
  console.error(`[localnet] ${error.message}`);
  shutdown(1);
}

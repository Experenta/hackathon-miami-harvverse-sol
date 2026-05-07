#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import process from "node:process";
import {
  AccountRole,
  appendTransactionMessageInstruction,
  compileTransaction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getAddressDecoder,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getBytesEncoder,
  getProgramDerivedAddress,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";

const HARVVERSE_PROGRAM_ID = "Bwedfg1JZvA5HfV5dCA2cyJhQf2Bkbop6K8eMdt1vKWP";
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const DEFAULT_WALLET_PATH = "~/.config/solana/id.json";
const INITIALIZE_CONFIG_DISCRIMINATOR = new Uint8Array([
  208, 127, 21, 1, 194, 190, 196, 70,
]);
const PROGRAM_CONFIG_DISCRIMINATOR = new Uint8Array([
  196, 210, 90, 231, 144, 149, 140, 63,
]);

const CLUSTERS = {
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    explorerSuffix: "?cluster=devnet",
  },
  localnet: {
    rpcUrl: "http://localhost:8899",
    explorerSuffix: "?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899",
  },
};

function printHelp() {
  console.log(`Usage:
  pnpm harvverse:config --cluster devnet
  pnpm harvverse:config --cluster devnet --send
  pnpm harvverse:config --cluster localnet --send

Checks the canonical Harvverse ProgramConfig PDA for:
  ${HARVVERSE_PROGRAM_ID}

By default this only checks account state and simulates initialize_config if
the config account is missing. Add --send to sign and submit the transaction.

Options:
  --cluster <devnet|localnet>   Cluster to use. Defaults to devnet.
  --rpc <url>                   Override RPC URL.
  --wallet <path>               CLI keypair JSON. Defaults to ${DEFAULT_WALLET_PATH}.
  --treasury <address>          Treasury address. Defaults to the wallet address.
  --send                        Send the initialize_config transaction.
  --help                        Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    cluster: "devnet",
    rpcUrl: undefined,
    walletPath: DEFAULT_WALLET_PATH,
    treasury: undefined,
    send: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--cluster":
        options.cluster = argv[++i];
        break;
      case "--rpc":
        options.rpcUrl = argv[++i];
        break;
      case "--wallet":
        options.walletPath = argv[++i];
        break;
      case "--treasury":
        options.treasury = argv[++i];
        break;
      case "--send":
        options.send = true;
        break;
      case "--":
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!CLUSTERS[options.cluster]) {
    throw new Error(`Unsupported cluster: ${options.cluster}`);
  }

  return {
    ...options,
    rpcUrl: options.rpcUrl ?? CLUSTERS[options.cluster].rpcUrl,
  };
}

function expandHome(path) {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return path;
}

async function loadSigner(walletPath) {
  const expandedPath = expandHome(walletPath);
  const secret = JSON.parse(await readFile(expandedPath, "utf8"));
  if (!Array.isArray(secret) || secret.length !== 64) {
    throw new Error(
      `Expected a 64-byte Solana keypair JSON at ${expandedPath}`,
    );
  }
  return createKeyPairSignerFromBytes(new Uint8Array(secret));
}

function encodeInitializeConfigData(treasury) {
  const data = new Uint8Array(40);
  data.set(INITIALIZE_CONFIG_DISCRIMINATOR, 0);
  data.set(getAddressEncoder().encode(treasury), 8);
  return data;
}

function decodeBase64AccountData(account) {
  const data = account?.data;
  if (!data) return null;
  if (Array.isArray(data)) return Buffer.from(data[0], data[1] ?? "base64");
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new Error("Unsupported account data shape from RPC");
}

function decodeProgramConfig(account) {
  const data = decodeBase64AccountData(account);
  if (!data) return null;
  if (data.length < 74) {
    throw new Error(`ProgramConfig account is too small: ${data.length} bytes`);
  }

  const discriminator = data.subarray(0, 8);
  if (!discriminator.equals(Buffer.from(PROGRAM_CONFIG_DISCRIMINATOR))) {
    throw new Error("ProgramConfig PDA exists but has the wrong discriminator");
  }

  const addressDecoder = getAddressDecoder();
  return {
    authority: addressDecoder.decode(data.subarray(8, 40)),
    treasury: addressDecoder.decode(data.subarray(40, 72)),
    roleRegistrationEnabled: data[72] === 1,
    bump: data[73],
  };
}

function formatLamports(lamports) {
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, "0");
  return `${whole}.${fraction} SOL`;
}

function buildInitializeConfigInstruction({ signer, configPda, treasury }) {
  return Object.freeze({
    programAddress: HARVVERSE_PROGRAM_ID,
    accounts: [
      Object.freeze({
        address: signer.address,
        role: AccountRole.WRITABLE_SIGNER,
        signer,
      }),
      Object.freeze({ address: configPda, role: AccountRole.WRITABLE }),
      Object.freeze({ address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY }),
    ],
    data: encodeInitializeConfigData(treasury),
  });
}

async function waitForConfirmation(rpc, signature) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];
    if (status?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return status.confirmationStatus;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 2000));
  }
  return "submitted";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cluster = CLUSTERS[options.cluster];
  const rpc = createSolanaRpc(options.rpcUrl);
  const signer = await loadSigner(options.walletPath);
  const treasury = options.treasury ?? signer.address;

  const [configPda, configBump] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [getBytesEncoder().encode(new TextEncoder().encode("config"))],
  });

  console.log("Cluster:       ", options.cluster);
  console.log("RPC:           ", options.rpcUrl);
  console.log("Program ID:    ", HARVVERSE_PROGRAM_ID);
  console.log("Wallet:        ", signer.address);
  console.log("Treasury:      ", treasury);
  console.log("ProgramConfig: ", configPda);
  console.log("Config bump:   ", configBump);

  const programAccount = await rpc
    .getAccountInfo(HARVVERSE_PROGRAM_ID, { encoding: "base64" })
    .send();
  if (!programAccount.value) {
    throw new Error(
      `Program ${HARVVERSE_PROGRAM_ID} is not deployed on ${options.cluster}`,
    );
  }
  console.log("Program owner: ", programAccount.value.owner);
  console.log("Executable:    ", programAccount.value.executable);

  const configAccount = await rpc
    .getAccountInfo(configPda, { encoding: "base64" })
    .send();
  if (configAccount.value) {
    const config = decodeProgramConfig(configAccount.value);
    console.log("\nProgramConfig already initialized:");
    console.log("  Authority:                 ", config.authority);
    console.log("  Treasury:                  ", config.treasury);
    console.log(
      "  Role registration enabled: ",
      config.roleRegistrationEnabled,
    );
    console.log("  Stored bump:               ", config.bump);
    return;
  }

  const balance = await rpc.getBalance(signer.address).send();
  console.log("\nWallet balance:", formatLamports(balance.value));

  const instruction = buildInitializeConfigInstruction({
    signer,
    configPda,
    treasury,
  });
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (message) => setTransactionMessageFeePayerSigner(signer, message),
    (message) =>
      setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    (message) => appendTransactionMessageInstruction(instruction, message),
  );

  console.log("\nTransaction summary:");
  console.log("  Instruction: initialize_config");
  console.log("  Fee payer:   ", signer.address);
  console.log("  Program:     ", HARVVERSE_PROGRAM_ID);
  console.log("  Config PDA:  ", configPda);
  console.log("  Treasury:    ", treasury);
  console.log("  Cluster:     ", options.cluster);

  const simulationTransaction = getBase64EncodedWireTransaction(
    compileTransaction(transactionMessage),
  );
  const simulation = await rpc
    .simulateTransaction(simulationTransaction, {
      commitment: "processed",
      encoding: "base64",
      replaceRecentBlockhash: false,
      sigVerify: false,
    })
    .send();

  console.log("\nSimulation:");
  console.log("  Error:          ", simulation.value.err ?? "none");
  console.log(
    "  Units consumed: ",
    simulation.value.unitsConsumed?.toString() ?? "n/a",
  );
  if (simulation.value.logs?.length) {
    console.log("  Logs:");
    for (const log of simulation.value.logs) console.log(`    ${log}`);
  }

  if (simulation.value.err) {
    throw new Error("Simulation failed; not sending transaction");
  }

  if (!options.send) {
    console.log(
      "\nDry run complete. Re-run with --send to create ProgramConfig.",
    );
    return;
  }

  const signedTransaction =
    await signTransactionMessageWithSigners(transactionMessage);
  const wireTransaction = getBase64EncodedWireTransaction(signedTransaction);
  const signature = await rpc
    .sendTransaction(wireTransaction, {
      encoding: "base64",
      preflightCommitment: "processed",
    })
    .send();

  console.log("\nTransaction sent:");
  console.log("  Signature:", signature);
  console.log(
    "  Explorer: ",
    `https://explorer.solana.com/tx/${signature}${cluster.explorerSuffix}`,
  );

  const confirmation = await waitForConfirmation(rpc, signature);
  console.log("  Status:   ", confirmation);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

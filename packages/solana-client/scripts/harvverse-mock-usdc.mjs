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
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const RENT_SYSVAR_ID = "SysvarRent111111111111111111111111111111111";
const DEFAULT_WALLET_PATH = "~/.config/solana/id.json";
const MOCK_USDC_DECIMALS = 6;
const DEFAULT_FAUCET_AMOUNT = 5_000_000_000n;
const INITIALIZE_MOCK_USDC_DISCRIMINATOR = new Uint8Array([
  202, 220, 163, 62, 243, 68, 34, 77,
]);
const PAYMENT_CONFIG_DISCRIMINATOR = new Uint8Array([
  252, 166, 185, 239, 186, 79, 212, 152,
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
  pnpm harvverse:mock-usdc --cluster devnet
  pnpm harvverse:mock-usdc --cluster devnet --send
  pnpm harvverse:mock-usdc --cluster localnet --send

Initializes the canonical Harvverse mockUSDC mint and PaymentConfig PDA.
Dry-run is the default. Add --send to sign and submit.

Options:
  --cluster <devnet|localnet>   Cluster to use. Defaults to devnet.
  --rpc <url>                   Override RPC URL.
  --wallet <path>               CLI keypair JSON. Defaults to ${DEFAULT_WALLET_PATH}.
  --faucet-amount <base_units>  Faucet amount. Defaults to ${DEFAULT_FAUCET_AMOUNT}.
  --send                        Send the initialize_mock_usdc transaction.
  --help                        Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    cluster: "devnet",
    rpcUrl: undefined,
    walletPath: DEFAULT_WALLET_PATH,
    faucetAmount: DEFAULT_FAUCET_AMOUNT,
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
      case "--faucet-amount":
        options.faucetAmount = BigInt(argv[++i]);
        break;
      case "--send":
        options.send = true;
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

function encodeU64(value) {
  const data = new Uint8Array(8);
  new DataView(data.buffer).setBigUint64(0, BigInt(value), true);
  return data;
}

function encodeInitializeMockUsdcData({ decimals, faucetAmount }) {
  const data = new Uint8Array(17);
  data.set(INITIALIZE_MOCK_USDC_DISCRIMINATOR, 0);
  data[8] = decimals;
  data.set(encodeU64(faucetAmount), 9);
  return data;
}

function decodeBase64AccountData(account) {
  const data = account?.data;
  if (!data) return null;
  if (Array.isArray(data)) return Buffer.from(data[0], data[1] ?? "base64");
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new Error("Unsupported account data shape from RPC");
}

function decodePaymentConfig(account) {
  const data = decodeBase64AccountData(account);
  if (!data) return null;
  if (data.length < 83) {
    throw new Error(`PaymentConfig account is too small: ${data.length} bytes`);
  }
  const discriminator = data.subarray(0, 8);
  if (!discriminator.equals(Buffer.from(PAYMENT_CONFIG_DISCRIMINATOR))) {
    throw new Error("PaymentConfig PDA exists but has the wrong discriminator");
  }

  const addressDecoder = getAddressDecoder();
  return {
    authority: addressDecoder.decode(data.subarray(8, 40)),
    mockUsdcMint: addressDecoder.decode(data.subarray(40, 72)),
    faucetAmount: new DataView(
      data.buffer,
      data.byteOffset + 72,
      8,
    ).getBigUint64(0, true),
    decimals: data[80],
    bump: data[81],
    mintAuthorityBump: data[82],
  };
}

function formatMockUsdc(baseUnits) {
  const whole = baseUnits / 1_000_000n;
  const fraction = (baseUnits % 1_000_000n).toString().padStart(6, "0");
  return `${whole}.${fraction} mockUSDC`;
}

function buildInitializeMockUsdcInstruction({
  signer,
  programConfig,
  paymentConfig,
  mockUsdcMint,
  mockUsdcMintAuthority,
  faucetAmount,
}) {
  return Object.freeze({
    programAddress: HARVVERSE_PROGRAM_ID,
    accounts: [
      Object.freeze({
        address: signer.address,
        role: AccountRole.WRITABLE_SIGNER,
        signer,
      }),
      Object.freeze({ address: programConfig, role: AccountRole.READONLY }),
      Object.freeze({ address: paymentConfig, role: AccountRole.WRITABLE }),
      Object.freeze({ address: mockUsdcMint, role: AccountRole.WRITABLE }),
      Object.freeze({
        address: mockUsdcMintAuthority,
        role: AccountRole.READONLY,
      }),
      Object.freeze({ address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY }),
      Object.freeze({ address: TOKEN_PROGRAM_ID, role: AccountRole.READONLY }),
      Object.freeze({ address: RENT_SYSVAR_ID, role: AccountRole.READONLY }),
    ],
    data: encodeInitializeMockUsdcData({
      decimals: MOCK_USDC_DECIMALS,
      faucetAmount,
    }),
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
  if (options.cluster === "mainnet") {
    throw new Error("mockUSDC initialization is not allowed on mainnet");
  }

  const cluster = CLUSTERS[options.cluster];
  const rpc = createSolanaRpc(options.rpcUrl);
  const signer = await loadSigner(options.walletPath);

  const [programConfig] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [getBytesEncoder().encode(new TextEncoder().encode("config"))],
  });
  const [paymentConfig] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [
      getBytesEncoder().encode(new TextEncoder().encode("payment_config")),
    ],
  });
  const [mockUsdcMint] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [
      getBytesEncoder().encode(new TextEncoder().encode("mock_usdc_mint")),
    ],
  });
  const [mockUsdcMintAuthority] = await getProgramDerivedAddress({
    programAddress: HARVVERSE_PROGRAM_ID,
    seeds: [
      getBytesEncoder().encode(
        new TextEncoder().encode("mock_usdc_mint_authority"),
      ),
    ],
  });

  console.log("Cluster:                 ", options.cluster);
  console.log("RPC:                     ", options.rpcUrl);
  console.log("Program ID:              ", HARVVERSE_PROGRAM_ID);
  console.log("Wallet:                  ", signer.address);
  console.log("ProgramConfig:           ", programConfig);
  console.log("PaymentConfig:           ", paymentConfig);
  console.log("mockUSDC mint:           ", mockUsdcMint);
  console.log("mockUSDC mint authority: ", mockUsdcMintAuthority);
  console.log(
    "Faucet amount:           ",
    formatMockUsdc(options.faucetAmount),
  );

  const programAccount = await rpc
    .getAccountInfo(HARVVERSE_PROGRAM_ID, { encoding: "base64" })
    .send();
  if (!programAccount.value) {
    throw new Error(
      `Program ${HARVVERSE_PROGRAM_ID} is not deployed on ${options.cluster}`,
    );
  }

  const configAccount = await rpc
    .getAccountInfo(programConfig, { encoding: "base64" })
    .send();
  if (!configAccount.value) {
    throw new Error(
      `ProgramConfig is missing. Run pnpm harvverse:config --cluster ${options.cluster} --send first.`,
    );
  }

  const paymentAccount = await rpc
    .getAccountInfo(paymentConfig, { encoding: "base64" })
    .send();
  if (paymentAccount.value) {
    const config = decodePaymentConfig(paymentAccount.value);
    console.log("\nPaymentConfig already initialized:");
    console.log("  Authority:        ", config.authority);
    console.log("  Mint:             ", config.mockUsdcMint);
    console.log("  Faucet amount:    ", formatMockUsdc(config.faucetAmount));
    console.log("  Decimals:         ", config.decimals);
    console.log("  Stored bump:      ", config.bump);
    console.log("  Mint auth bump:   ", config.mintAuthorityBump);
    return;
  }

  const instruction = buildInitializeMockUsdcInstruction({
    signer,
    programConfig,
    paymentConfig,
    mockUsdcMint,
    mockUsdcMintAuthority,
    faucetAmount: options.faucetAmount,
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
  console.log("  Instruction: initialize_mock_usdc");
  console.log("  Fee payer:   ", signer.address);
  console.log("  Program:     ", HARVVERSE_PROGRAM_ID);
  console.log("  Mint:        ", mockUsdcMint);
  console.log("  Faucet:      ", formatMockUsdc(options.faucetAmount));
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
      "\nDry run complete. Re-run with --send to initialize mockUSDC.",
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

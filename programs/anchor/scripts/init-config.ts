import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import idl from "../target/idl/harvverse.json";
import type { Harvverse } from "../target/types/harvverse";

const PROGRAM_ID = new PublicKey(
  "HD1Bsrbw5tBKpLF3WE2gtnrDDYagNQgwHKAd9E3JZqst",
);
const DEVNET_RPC = "https://api.devnet.solana.com";
const WALLET_PATH = "~/.config/solana/id.json";

function loadKeypair(path: string): Keypair {
  const expanded = path.startsWith("~/")
    ? join(homedir(), path.slice(2))
    : path;
  const secret = JSON.parse(readFileSync(expanded, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function main() {
  const wallet = loadKeypair(WALLET_PATH);
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" },
  );
  anchor.setProvider(provider);

  const idlWithAddress = { ...idl, address: PROGRAM_ID.toBase58() };
  const program = new Program<Harvverse>(idlWithAddress as Harvverse, provider);

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId,
  );

  console.log("Cluster:        ", DEVNET_RPC);
  console.log("Program:        ", program.programId.toBase58());
  console.log("Authority/wallet:", wallet.publicKey.toBase58());
  console.log("Treasury:       ", wallet.publicKey.toBase58());
  console.log("Config PDA:     ", configPda.toBase58());

  const existing = await connection.getAccountInfo(configPda);
  if (existing) {
    console.log("\nConfig already initialized — current state:");
    const config = await program.account.programConfig.fetch(configPda);
    console.log({
      authority: config.authority.toBase58(),
      treasury: config.treasury.toBase58(),
      roleRegistrationEnabled: config.roleRegistrationEnabled,
      bump: config.bump,
    });
    return;
  }

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`\nWallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    throw new Error(
      "Insufficient SOL on devnet. Run: solana airdrop 2 --url devnet",
    );
  }

  console.log("\nSending initialize_config…");
  const tx = await program.methods
    .initializeConfig(wallet.publicKey)
    .accounts({
      config: configPda,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Tx signature:", tx);
  console.log(
    `Explorer:     https://explorer.solana.com/tx/${tx}?cluster=devnet`,
  );

  const config = await program.account.programConfig.fetch(configPda);
  console.log("\nConfig initialized:");
  console.log({
    authority: config.authority.toBase58(),
    treasury: config.treasury.toBase58(),
    roleRegistrationEnabled: config.roleRegistrationEnabled,
    bump: config.bump,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

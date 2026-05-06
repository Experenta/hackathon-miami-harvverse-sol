"use client";

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase58Decoder,
  isTransactionMessageWithSingleSendingSigner,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  signTransactionMessageWithSigners,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { useSolanaClient } from "../solana-client-context";
import { useWallet } from "../wallet/context";

export interface TransactionResult {
  signature: string;
}

type BuildInstructionsWithSigner = (
  signer: TransactionSigner,
) => Instruction[] | Promise<Instruction[]>;

export interface UseTransactionReturn {
  signAndSend: (instructions: Instruction[]) => Promise<TransactionResult>;
  signAndSendWithSigner: (
    buildInstructions: BuildInstructionsWithSigner,
  ) => Promise<TransactionResult>;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
}

const signatureDecoder = getBase58Decoder();

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? item.toString() : item,
    );
  } catch {
    return String(value);
  }
}

function formatSimulationFailure(value: {
  err?: unknown;
  logs?: readonly string[] | null;
  unitsConsumed?: bigint | number | null;
}): string {
  const logs = value.logs ?? [];
  const interestingLog = logs.find(
    (line) =>
      line.includes("AnchorError") ||
      line.includes("Error Code") ||
      line.includes("custom program error") ||
      line.includes("failed:"),
  );
  const logTail = logs.slice(-10).join("\n");

  return [
    "Transaction simulation failed before wallet signing.",
    `RPC error: ${stringifyUnknown(value.err)}`,
    interestingLog ? `Relevant log: ${interestingLog}` : null,
    value.unitsConsumed != null
      ? `Units consumed: ${value.unitsConsumed.toString()}`
      : null,
    logTail ? `Logs:\n${logTail}` : "No simulation logs returned by RPC.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function useTransaction(): UseTransactionReturn {
  const { signer } = useWallet();
  const client = useSolanaClient();
  const { mutate } = useSWRConfig();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsPending(false);
  }, []);

  const signAndSendWithSigner = useCallback(
    async (
      buildInstructions: BuildInstructionsWithSigner,
    ): Promise<TransactionResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (!signer) {
          throw new Error("Wallet not connected");
        }

        const {
          context: { slot: minContextSlot },
          value: latestBlockhash,
        } = await client.rpc.getLatestBlockhash().send();
        const instructions = await buildInstructions(signer);

        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => appendTransactionMessageInstructions(instructions, tx),
          (tx) => setTransactionMessageFeePayerSigner(signer, tx),
          (tx) =>
            setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        );

        const wireTransaction = getBase64EncodedWireTransaction(
          compileTransaction(transactionMessage),
        );
        const simulation = await client.rpc
          .simulateTransaction(wireTransaction, {
            commitment: "processed",
            encoding: "base64",
            minContextSlot,
            replaceRecentBlockhash: false,
            sigVerify: false,
          })
          .send();

        if (simulation.value.err) {
          throw new Error(formatSimulationFailure(simulation.value));
        }

        let signature: string;
        if (isTransactionMessageWithSingleSendingSigner(transactionMessage)) {
          const signatureBytes =
            await signAndSendTransactionMessageWithSigners(transactionMessage);
          signature = signatureDecoder.decode(signatureBytes);
        } else {
          const signedTransaction =
            await signTransactionMessageWithSigners(transactionMessage);
          const encodedTransaction =
            getBase64EncodedWireTransaction(signedTransaction);
          const sentSignature = await client.rpc
            .sendTransaction(encodedTransaction, {
              encoding: "base64",
              preflightCommitment: "processed",
            })
            .send();
          signature = sentSignature.toString();
        }

        mutate((key: unknown) => Array.isArray(key) && key[0] === "balance");
        return { signature };
      } catch (err) {
        const txError =
          err instanceof Error ? err : new Error("Transaction failed");
        setError(txError);
        throw txError;
      } finally {
        setIsPending(false);
      }
    },
    [client.rpc, mutate, signer],
  );

  const signAndSend = useCallback(
    (instructions: Instruction[]) => signAndSendWithSigner(() => instructions),
    [signAndSendWithSigner],
  );

  return { signAndSend, signAndSendWithSigner, isPending, error, reset };
}

export function useSendTransaction() {
  const { signAndSend, isPending } = useTransaction();

  const send = useCallback(
    async ({ instructions }: { instructions: readonly Instruction[] }) => {
      const result = await signAndSend([...instructions]);
      return result.signature;
    },
    [signAndSend],
  );

  return { send, isSending: isPending };
}

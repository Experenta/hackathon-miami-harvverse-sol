"use client";

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import {
  appendTransactionMessageInstructions,
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

        const { value: latestBlockhash } = await client.rpc
          .getLatestBlockhash()
          .send();
        const instructions = await buildInstructions(signer);

        const transactionMessage = pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => appendTransactionMessageInstructions(instructions, tx),
          (tx) => setTransactionMessageFeePayerSigner(signer, tx),
          (tx) =>
            setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        );

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

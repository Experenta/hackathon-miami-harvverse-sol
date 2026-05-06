import { useCallback, useState } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase58Decoder,
  type Instruction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type TransactionSendingSigner,
} from "@solana/kit";

export interface TransactionResult {
  signature: string;
}

type BuildInstructionsWithSigner = (
  signer: TransactionSendingSigner,
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

/**
 * Hook for the MWA sign-and-send flow.
 * Wraps `sendTransactions` from @wallet-ui/react-native-kit with
 * pending/error state management.
 */
export function useTransaction(): UseTransactionReturn {
  const { account, client, getTransactionSigner } = useMobileWallet();
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
        if (!account) {
          throw new Error("No account selected");
        }

        const {
          context: { slot: minContextSlot },
          value: latestBlockhash,
        } = await client.rpc.getLatestBlockhash().send();
        const signer = getTransactionSigner(account.address, minContextSlot);
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
          console.error("Solana transaction simulation failed", {
            err: simulation.value.err,
            logs: simulation.value.logs,
            unitsConsumed: simulation.value.unitsConsumed,
          });
          throw new Error(formatSimulationFailure(simulation.value));
        }

        const signatureBytes =
          await signAndSendTransactionMessageWithSigners(transactionMessage);

        return { signature: signatureDecoder.decode(signatureBytes) };
      } catch (err) {
        const txError =
          err instanceof Error ? err : new Error("Transaction failed");
        setError(txError);
        throw txError;
      } finally {
        setIsPending(false);
      }
    },
    [account, client.rpc, getTransactionSigner],
  );

  const signAndSend = useCallback(
    (instructions: Instruction[]) => signAndSendWithSigner(() => instructions),
    [signAndSendWithSigner],
  );

  return { signAndSend, signAndSendWithSigner, isPending, error, reset };
}

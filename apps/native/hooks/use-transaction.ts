import { useCallback, useState } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
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

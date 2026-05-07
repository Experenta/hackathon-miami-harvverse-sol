import { useCallback, useEffect, useState } from "react";
import type { Address } from "@solana/kit";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import {
  deriveAssociatedTokenAccount,
  fetchMockUsdcTokenAccountBalance,
  fetchPartnershipEscrowByPartnership,
  fetchHarvversePaymentConfig,
  findMockUsdcMintPda,
  type MockUsdcBalance,
} from "@repo/solana-client";
import { useNetwork } from "@/features/network/use-network";

export interface WalletMockUsdcState {
  mint: Address;
  tokenAccount: Address;
  balance: MockUsdcBalance;
  paymentConfigExists: boolean;
}

export function useMockUsdcWalletBalance(wallet?: string) {
  const { client } = useMobileWallet();
  const { selectedNetwork } = useNetwork();
  const [data, setData] = useState<WalletMockUsdcState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet) {
      setData(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const paymentConfig = await fetchHarvversePaymentConfig(client.rpc);
      const mint =
        paymentConfig && paymentConfig.exists
          ? paymentConfig.data.mockUsdcMint
          : (await findMockUsdcMintPda())[0];
      const [tokenAccount] = await deriveAssociatedTokenAccount(
        wallet as Address,
        mint,
      );
      const balance = await fetchMockUsdcTokenAccountBalance(
        client.rpc,
        tokenAccount,
        mint,
      );
      const next = {
        mint,
        tokenAccount,
        balance,
        paymentConfigExists: Boolean(paymentConfig),
      };
      setData(next);
      return next;
    } catch (err) {
      const nextError =
        err instanceof Error
          ? err
          : new Error("Unable to fetch mockUSDC balance.");
      setError(nextError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client.rpc, wallet]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 7000);
    return () => clearInterval(timer);
  }, [refresh, selectedNetwork.id]);

  return { data, isLoading, error, refresh };
}

export interface EscrowMockUsdcState {
  mint: Address;
  escrowPda: Address;
  vaultTokenAccount: Address;
  partnerTokenAccount: Address;
  farmerTokenAccount: Address;
  vaultBalance: MockUsdcBalance;
  partnerBalance: MockUsdcBalance;
  farmerBalance: MockUsdcBalance;
  depositedAmountBaseUnits: bigint;
  releasedAmountBaseUnits: bigint;
  reserveAmountBaseUnits: bigint;
  releaseAmounts: bigint[];
  releasedBitmap: number;
}

export function usePartnershipEscrowBalances(input?: {
  partnershipPda?: string | null;
  partnerWallet?: string | null;
  farmerWallet?: string | null;
}) {
  const { client } = useMobileWallet();
  const { selectedNetwork } = useNetwork();
  const [data, setData] = useState<EscrowMockUsdcState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!input?.partnershipPda || !input.partnerWallet || !input.farmerWallet) {
      setData(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const escrow = await fetchPartnershipEscrowByPartnership(
        client.rpc,
        input.partnershipPda as Address,
      );
      if (!escrow || !escrow.exists) {
        setData(null);
        return null;
      }

      const mint = escrow.data.mint;
      const [partnerTokenAccount] = await deriveAssociatedTokenAccount(
        input.partnerWallet as Address,
        mint,
      );
      const [farmerTokenAccount] = await deriveAssociatedTokenAccount(
        input.farmerWallet as Address,
        mint,
      );
      const [vaultBalance, partnerBalance, farmerBalance] = await Promise.all([
        fetchMockUsdcTokenAccountBalance(
          client.rpc,
          escrow.data.vaultTokenAccount,
          mint,
        ),
        fetchMockUsdcTokenAccountBalance(client.rpc, partnerTokenAccount, mint),
        fetchMockUsdcTokenAccountBalance(client.rpc, farmerTokenAccount, mint),
      ]);

      const next = {
        mint,
        escrowPda: escrow.address,
        vaultTokenAccount: escrow.data.vaultTokenAccount,
        partnerTokenAccount,
        farmerTokenAccount,
        vaultBalance,
        partnerBalance,
        farmerBalance,
        depositedAmountBaseUnits: escrow.data.depositedAmount,
        releasedAmountBaseUnits: escrow.data.releasedAmount,
        reserveAmountBaseUnits: escrow.data.reserveAmount,
        releaseAmounts: escrow.data.releaseAmounts,
        releasedBitmap: escrow.data.releasedBitmap,
      };
      setData(next);
      return next;
    } catch (err) {
      const nextError =
        err instanceof Error
          ? err
          : new Error("Unable to fetch escrow balances.");
      setError(nextError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    client.rpc,
    input?.farmerWallet,
    input?.partnerWallet,
    input?.partnershipPda,
  ]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 7000);
    return () => clearInterval(timer);
  }, [refresh, selectedNetwork.id]);

  return { data, isLoading, error, refresh };
}

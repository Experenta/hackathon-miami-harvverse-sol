"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { fetchUserRoleByWallet, RoleKind } from "@repo/solana-client";
import { useSolanaClient } from "./solana-client-context";
import { useWallet } from "./wallet/context";

export type RoleKindValue = "farmer" | "partner" | null;

export interface RoleContextValue {
  role: RoleKindValue;
  rolePda: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: PropsWithChildren) {
  const { wallet } = useWallet();
  const client = useSolanaClient();
  const [role, setRole] = useState<RoleKindValue>(null);
  const [rolePda, setRolePda] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const address = wallet?.account.address;

  const fetchRole = useCallback(async () => {
    if (!address) {
      setRole(null);
      setRolePda(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const maybeAccount = await fetchUserRoleByWallet(client.rpc, address);

      if (maybeAccount?.exists) {
        const roleKind = maybeAccount.data.role;
        setRole(roleKind === RoleKind.Farmer ? "farmer" : "partner");
        setRolePda(maybeAccount.address.toString());
      } else {
        setRole(null);
        setRolePda(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch role PDA"),
      );
      setRole(null);
      setRolePda(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, client.rpc]);

  useEffect(() => {
    void fetchRole();
  }, [fetchRole]);

  const value = useMemo<RoleContextValue>(
    () => ({ role, rolePda, isLoading, error, refetch: fetchRole }),
    [role, rolePda, isLoading, error, fetchRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRoleContext() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRoleContext must be used within RoleProvider");
  }
  return context;
}

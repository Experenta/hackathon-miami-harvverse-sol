import { useQuery } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { useMobileWallet } from "@wallet-ui/react-native-kit";

/**
 * Hook that queries the partner's partnerships from Convex.
 * Returns the partnership list and loading state.
 */
export function usePartnerships() {
  const { account } = useMobileWallet();
  const wallet = account?.address?.toString() ?? "";

  const partnerships = useQuery(
    api.partnerships.listByPartner,
    wallet ? { wallet } : "skip",
  );

  return {
    partnerships: partnerships ?? [],
    isLoading: partnerships === undefined,
  };
}

/**
 * Hook that queries partnerships for the connected farmer wallet.
 */
export function useFarmerPartnerships() {
  const { account } = useMobileWallet();
  const wallet = account?.address?.toString() ?? "";

  const partnerships = useQuery(
    api.partnerships.listByFarmer,
    wallet ? { wallet } : "skip",
  );

  return {
    partnerships: partnerships ?? [],
    isLoading: partnerships === undefined,
  };
}
